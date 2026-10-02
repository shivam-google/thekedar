import { Router } from 'express'
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js'
import { createBookingNotification, createReviewNotification } from '../services/notifications.js'

const router = Router()
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

router.post('/notifications/booking-event', requireSupabaseUser, async (request, response) => {
  const { bookingId } = request.body || {}
  if (!uuidPattern.test(bookingId || '')) return response.status(400).json({ success: false, message: 'Invalid booking' })
  try {
    const created = await createBookingNotification(bookingId, request.supabaseUser.id)
    return response.json({ success: true, created })
  } catch {
    return response.status(500).json({ success: false, message: 'Unable to create booking notification' })
  }
})

router.post('/notifications/review-event', requireSupabaseUser, async (request, response) => {
  const { bookingId } = request.body || {}
  if (!uuidPattern.test(bookingId || '')) return response.status(400).json({ success: false, message: 'Invalid booking' })
  try {
    const created = await createReviewNotification(bookingId, request.supabaseUser.id)
    return response.json({ success: true, created })
  } catch {
    return response.status(500).json({ success: false, message: 'Unable to create review notification' })
  }
})

export default router