import { supabase } from './supabaseClient'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export const notificationsChangedEvent = 'thekedar:notifications-changed'

function notifyChanged() {
  window.dispatchEvent(new Event(notificationsChangedEvent))
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Please log in to view notifications.')
  return data.user
}

export async function getMyNotifications() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, type, related_booking_id, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Unable to load notifications.')
  return data || []
}

export async function getUnreadNotificationCount() {
  const user = await requireUser()
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  if (error) throw new Error('Unable to load notification count.')
  return count || 0
}

export async function markNotificationRead(notificationId) {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .select('id, is_read')
    .single()
  if (error) throw new Error('Unable to update this notification.')
  notifyChanged()
  return data
}

export async function markAllNotificationsRead() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
    .select('id')
  if (error) throw new Error('Unable to update notifications.')
  notifyChanged()
  return data || []
}

export async function requestBookingNotification(bookingId) {
  return requestServerNotification('booking-event', bookingId)
}

export async function requestReviewNotification(bookingId) {
  return requestServerNotification('review-event', bookingId)
}

async function requestServerNotification(event, bookingId) {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return false
    const response = await fetch(`${apiBaseUrl}/api/notifications/${event}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    })
    if (!response.ok) return false
    const result = await response.json()
    if (result.created) notifyChanged()
    return Boolean(result.created)
  } catch {
    return false
  }
}