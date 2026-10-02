import { supabase } from './supabaseClient'
import { requestReviewNotification } from './notificationService'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const reviewFields = 'id, rating, comment, created_at'

async function requireUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Please log in to review a completed booking.')
  return data.user
}

function reviewError(error) {
  if (error?.code === '23505') return new Error('You have already reviewed this booking.')
  if (error?.code === '42501') return new Error('You do not have permission to review this booking.')
  return new Error('Unable to load or save this review. Please try again.')
}

export async function getMyBookingReview(bookingId) {
  const user = await requireUser()
  const { data, error } = await supabase.from('reviews').select(reviewFields).eq('booking_id', bookingId).eq('reviewer_id', user.id).maybeSingle()
  if (error) throw reviewError(error)
  return data
}

export async function submitBookingReview({ bookingId, rating, comment = '' }) {
  const user = await requireUser()
  const numericRating = Number(rating)
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) throw new Error('Choose a rating from 1 to 5.')

  const [{ data: profile, error: profileError }, { data: booking, error: bookingError }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('bookings').select('id, customer_id, provider_id, status').eq('id', bookingId).maybeSingle(),
  ])
  if (profileError || bookingError || !booking) throw new Error('Unable to verify this completed booking.')
  if (!['customer', 'contractor'].includes(profile?.role) || booking.customer_id !== user.id) throw new Error('Only the customer or contractor who made this booking can review it.')
  if (booking.status !== 'COMPLETED') throw new Error('Reviews are available only after a booking is completed.')
  if (booking.provider_id === user.id) throw new Error('You cannot review your own listing.')

  const existingReview = await getMyBookingReview(bookingId)
  if (existingReview) throw new Error('You have already reviewed this booking.')

  const { data, error } = await supabase.from('reviews').insert({
    booking_id: booking.id,
    reviewer_id: user.id,
    reviewee_id: booking.provider_id,
    rating: numericRating,
    comment: comment.trim() || null,
  }).select(reviewFields).single()
  if (error) throw reviewError(error)
  await requestReviewNotification(booking.id)
  return data
}

export async function getReviewsForItem(itemType, itemId) {
  const response = await fetch(`${apiBaseUrl}/api/ratings/${encodeURIComponent(itemType)}/${encodeURIComponent(itemId)}`)
  if (!response.ok) throw new Error('Unable to load ratings.')
  const result = await response.json()
  return result.reviews || []
}
