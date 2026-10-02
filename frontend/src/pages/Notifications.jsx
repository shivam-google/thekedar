import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import { getMyNotifications, markAllNotificationsRead, markNotificationRead, notificationsChangedEvent } from '../services/notificationService'
import '../styles/notifications.css'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const unreadCount = notifications.filter((notification) => !notification.is_read).length

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getMyNotifications()
      setNotifications(data)
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
    window.addEventListener(notificationsChangedEvent, loadNotifications)
    return () => window.removeEventListener(notificationsChangedEvent, loadNotifications)
  }, [loadNotifications])

  const markRead = async (notificationId) => {
    setBusy(true)
    setError('')
    try {
      await markNotificationRead(notificationId)
      setNotifications((current) => current.map((notification) => notification.id === notificationId ? { ...notification, is_read: true } : notification))
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setBusy(false)
    }
  }

  const markAllRead = async () => {
    setBusy(true)
    setError('')
    try {
      await markAllNotificationsRead()
      setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })))
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setBusy(false)
    }
  }

  return <div className="site-page"><Navbar /><main className="notifications-page">
    <header className="notifications-heading">
      <div><p className="eyebrow eyebrow-orange">Your activity</p><h1>Notifications</h1><p>Booking and review updates for your account.</p></div>
      {unreadCount > 0 && <button type="button" className="button button-ghost" onClick={markAllRead} disabled={busy}>Mark all as read</button>}
    </header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <div className="notifications-state"><Icon name="loader" size={24} /><p>Loading notifications...</p></div> : notifications.length === 0 ? <div className="notifications-state"><Icon name="bell" size={25} /><h2>You’re all caught up</h2><p>New booking and review updates will appear here.</p></div> : <section className="notification-list" aria-label="Your notifications">
      {notifications.map((notification) => <article className={`notification-item ${notification.is_read ? 'is-read' : 'is-unread'}`} key={notification.id}>
        <span className="notification-state-mark" aria-label={notification.is_read ? 'Read' : 'Unread'} />
        <div className="notification-content">
          <div className="notification-title-row"><h2>{notification.title}</h2><span className="notification-type">{notification.type.replaceAll('_', ' ')}</span></div>
          <p>{notification.message}</p>
          <time dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</time>
          {notification.related_booking_id && <Link className="notification-booking-link" to={`/bookings/${notification.related_booking_id}`}>View booking <Icon name="arrow" size={14} /></Link>}
        </div>
        {!notification.is_read && <button type="button" className="notification-read-button" onClick={() => markRead(notification.id)} disabled={busy}>Mark as read</button>}
      </article>)}
    </section>}
  </main><Footer /></div>
}