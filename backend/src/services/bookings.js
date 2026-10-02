import { getSupabaseClient } from '../config/supabase.js'

const table = () => getSupabaseClient().from('bookings')

export const getMyBookings = (userId) => table().select('*').or(`customer_id.eq.${userId},provider_id.eq.${userId}`).order('created_at', { ascending: false })
export const createBooking = (booking) => table().insert(booking).select().single()
export const updateBookingStatus = (bookingId, status) => table().update({ status }).eq('id', bookingId).select().single()