import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import { cancelBooking, getBooking } from '../services/bookingService'
import { useAuth } from '../context/AuthContext'
import BookingReview from '../components/BookingReview'

const labels = { REQUESTED: 'Requested', ACCEPTED: 'Accepted', REJECTED: 'Rejected', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled' }

export default function BookingDetails() {
  const { id } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user, profile } = useAuth()
  useEffect(() => { let active = true; getBooking(id).then((data) => active && setBooking(data)).catch(() => active && setError('Unable to load bookings. Please try again.')).finally(() => active && setLoading(false)); return () => { active = false } }, [id])
  const handleCancel = async () => { if (!window.confirm('Cancel this booking request?')) return; try { const next = await cancelBooking(booking); setBooking((current) => ({ ...current, ...next })) } catch { setError('Unable to complete this action. Please try again.') } }
  const canReview = booking?.status === 'COMPLETED' && user?.id === booking.customer_id && (profile?.role === 'customer' || profile?.role === 'contractor')
  return <PageShell>{loading ? <State text="Loading bookings..." /> : error ? <State text={error} error /> : !booking ? <State text="Booking not found." error /> : <><Link to="/bookings" className="text-link text-link-dark booking-back"><Icon name="arrow" size={15} className="back-arrow" /> Back to bookings</Link><section className="booking-detail"><div className="booking-detail-top"><div><p className="eyebrow eyebrow-orange">Booking request</p><h1>{booking.machine?.title || 'Machine booking'}</h1><p>{booking.machine?.machine_type || 'Machine'} · {[booking.machine?.city, booking.machine?.state].filter(Boolean).join(', ')}</p></div><span className={`status-badge status-${booking.status.toLowerCase()}`}>{labels[booking.status] || booking.status}</span></div><div className="booking-facts"><Fact label="Requested dates" value={`${booking.start_date} to ${booking.end_date}`} /><Fact label="Quantity" value={booking.quantity} /><Fact label="Total price" value={`₹${Number(booking.total_price).toLocaleString('en-IN')}`} /><Fact label="Created" value={new Date(booking.created_at).toLocaleDateString('en-IN')} /></div><div className="booking-notes"><h2>Project note</h2><p>{booking.customer_note || 'No project note was added.'}</p>{booking.provider_note && <><h2>Provider note</h2><p>{booking.provider_note}</p></>}</div>{canReview && <BookingReview booking={booking} />}{['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'].includes(booking.status) && <button type="button" className="button button-ghost" onClick={handleCancel}>Cancel booking <Icon name="close" size={16} /></button>}</section></>}</PageShell>
}

function Fact({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div> }
function PageShell({ children }) { return <div className="site-page"><Navbar /><main className="bookings-page">{children}</main><Footer /></div> }
function State({ text, error = false }) { return <div className={`marketplace-state booking-state ${error ? 'error-state' : ''}`}><Icon name={error ? 'shield' : 'loader'} size={25} /><p>{text}</p><Link to="/bookings" className="text-link text-link-dark">Back to bookings <Icon name="arrow" size={15} /></Link></div> }
