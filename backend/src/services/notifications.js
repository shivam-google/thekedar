import { getSupabaseAdminClient } from '../config/supabase.js'

const bookingMessages = {
	REQUESTED: {
		actor: 'customer',
		recipient: 'provider_id',
		type: 'booking_requested',
		title: 'New booking request',
		message: (itemType) => `A new ${itemType.toLowerCase()} booking request is waiting for you.`,
	},
	ACCEPTED: {
		actor: 'provider',
		recipient: 'customer_id',
		type: 'booking_accepted',
		title: 'Booking accepted',
		message: (itemType) => `Your ${itemType.toLowerCase()} booking was accepted.`,
	},
	REJECTED: {
		actor: 'provider',
		recipient: 'customer_id',
		type: 'booking_rejected',
		title: 'Booking declined',
		message: (itemType) => `Your ${itemType.toLowerCase()} booking was declined.`,
	},
	COMPLETED: {
		actor: 'provider',
		recipient: 'customer_id',
		type: 'booking_completed',
		title: 'Booking completed',
		message: (itemType) => `Your ${itemType.toLowerCase()} booking was marked complete.`,
	},
}

async function createOnce({ userId, bookingId, type, title, message }) {
	const supabase = getSupabaseAdminClient()
	const { data: existing, error: existingError } = await supabase
		.from('notifications')
		.select('id')
		.eq('user_id', userId)
		.eq('related_booking_id', bookingId)
		.eq('type', type)
		.limit(1)
		.maybeSingle()

	if (existingError) throw existingError
	if (existing) return false

	const { error } = await supabase.from('notifications').insert({
		user_id: userId,
		title,
		message,
		type,
		related_booking_id: bookingId,
	})
	if (error) throw error
	return true
}

export async function createBookingNotification(bookingId, actorId) {
	const supabase = getSupabaseAdminClient()
	const { data: booking, error } = await supabase
		.from('bookings')
		.select('id, customer_id, provider_id, item_type, status')
		.eq('id', bookingId)
		.maybeSingle()

	if (error) throw error
	if (!booking) return false

	let event = bookingMessages[booking.status]
	let recipientId
	if (booking.status === 'CANCELLED') {
		if (![booking.customer_id, booking.provider_id].includes(actorId)) return false
		event = {
			type: 'booking_cancelled',
			title: 'Booking cancelled',
			message: (itemType) => `Your ${itemType.toLowerCase()} booking was cancelled.`,
		}
		recipientId = actorId === booking.customer_id ? booking.provider_id : booking.customer_id
	} else if (event && actorId === booking[event.actor === 'customer' ? 'customer_id' : 'provider_id']) {
		recipientId = booking[event.recipient]
	} else {
		return false
	}

	return createOnce({
		userId: recipientId,
		bookingId,
		type: event.type,
		title: event.title,
		message: event.message(booking.item_type),
	})
}

export async function createReviewNotification(bookingId, reviewerId) {
	const supabase = getSupabaseAdminClient()
	const { data: review, error: reviewError } = await supabase
		.from('reviews')
		.select('id, reviewer_id, reviewee_id')
		.eq('booking_id', bookingId)
		.eq('reviewer_id', reviewerId)
		.maybeSingle()

	if (reviewError) throw reviewError
	if (!review) return false

	const { data: booking, error: bookingError } = await supabase
		.from('bookings')
		.select('id, customer_id, provider_id, item_type, status')
		.eq('id', bookingId)
		.maybeSingle()

	if (bookingError) throw bookingError
	if (!booking || booking.status !== 'COMPLETED' || booking.customer_id !== reviewerId || booking.provider_id !== review.reviewee_id) return false

	return createOnce({
		userId: review.reviewee_id,
		bookingId,
		type: 'review_received',
		title: 'New review received',
		message: `A customer left a review for your ${booking.item_type.toLowerCase()} booking.`,
	})
}