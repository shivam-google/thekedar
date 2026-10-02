import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import { cancelBooking, getMyBookings } from '../services/bookingService'
import { ErrorState, LoadingState } from '../components/PageStates'

const labels = { REQUESTED: 'Requested', ACCEPTED: 'Accepted', REJECTED: 'Rejected', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled' }

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; getMyBookings().then((data) => active && setBookings(data)).catch(() => active && setError('Unable to load bookings. Please try again.')).finally(() => active && setLoading(false)); return () => { active = false } }, [])
  const handleCancel = async (booking) => { if (!window.confirm('Cancel this booking request?')) return; try { await cancelBooking(booking); setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, status: 'CANCELLED' } : item)) } catch { setError('Unable to complete this action. Please try again.') } }
  return <PageShell><section className="booking-heading"><div><p className="eyebrow eyebrow-orange">Your requests</p><h1>Project <em>Bookings.</em></h1><p>Keep every equipment request and its next step in view.</p></div><Link to="/machines" className="button">Find equipment <Icon name="arrow" size={17} /></Link></section>{loading ? <State text="Loading bookings..." /> : error ? <State text={error} error /> : bookings.length === 0 ? <State text="No booking requests yet." empty /> : <div className="booking-list">{bookings.map((booking) => <BookingRow key={booking.id} booking={booking} onCancel={handleCancel} />)}</div>}</PageShell>
}

export function BookingRow({ booking, onCancel }) {
  const item = booking.worker || booking.machine || booking.tanker || booking.material
  const isWorker = booking.item_type === 'WORKER'
  const isTanker = booking.item_type === 'TANKER'
  const isMaterial = booking.item_type === 'MATERIAL'
  const canCancel = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'].includes(booking.status)
  return <article className="booking-row"><div className="booking-row-icon"><Icon name={isWorker ? 'users' : isTanker ? 'water' : isMaterial ? 'box' : 'truck'} size={25} /></div><div className="booking-row-copy"><p className="eyebrow">{isWorker ? item?.skill || 'Worker request' : isTanker ? 'Water tanker' : isMaterial ? item?.category || 'Material request' : item?.machine_type || 'Machine request'}</p><h2>{isWorker ? item?.display_name || 'Worker unavailable' : item?.title || item?.name || (isTanker ? 'Tanker unavailable' : isMaterial ? 'Material unavailable' : 'Machine unavailable')}</h2><p><Icon name="compass" size={13} /> {[item?.city, item?.state].filter(Boolean).join(', ') || 'Location unavailable'}</p></div><div className={`status-badge status-${booking.status.toLowerCase()}`}>{labels[booking.status] || booking.status}</div><div className="booking-row-meta"><span>{booking.start_date} to {booking.end_date}</span><strong>₹{Number(booking.total_price).toLocaleString('en-IN')}</strong><Link to={`/bookings/${booking.id}`} className="text-link text-link-dark">View details <Icon name="arrow" size={15} /></Link>{canCancel && <button type="button" className="remove-button" onClick={() => onCancel(booking)}>Cancel request</button>}</div></article>
}

function PageShell({ children }) { return <div className="site-page"><Navbar /><main className="bookings-page">{children}</main><Footer /></div> }
function State({ text, error = false, empty = false }) { if (error) return <ErrorState onRetry={() => window.location.reload()} className="booking-state" />; if (!empty) return <LoadingState message={text} className="booking-state" />; return <div className="marketplace-state booking-state"><Icon name="briefcase" size={25} /><p>{text}</p><Link to="/machines" className="button">Find machines <Icon name="arrow" size={17} /></Link></div> }
