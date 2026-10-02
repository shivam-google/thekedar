import { getSupabaseAdminClient } from '../config/supabase.js'

export async function getPublicReviews(itemType, itemId) {
	const supabase = getSupabaseAdminClient()
	const { data: bookings, error: bookingError } = await supabase
		.from('bookings')
		.select('id')
		.eq('item_type', itemType)
		.eq('item_id', itemId)
		.eq('status', 'COMPLETED')

	if (bookingError) throw bookingError
	if (!bookings?.length) return []

	const { data, error } = await supabase
		.from('reviews')
		.select('rating, comment, created_at')
		.in('booking_id', bookings.map((booking) => booking.id))
		.order('created_at', { ascending: false })

	if (error) throw error
	return data || []
}