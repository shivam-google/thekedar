import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import MarketplaceImage from '../components/MarketplaceImage'
import { useProjectCart } from '../context/ProjectCartContext'
import { createProjectBookingRequests } from '../services/bookingService'

const statusLabels = { AVAILABLE: 'Available', BOOKED: 'Booked', UNAVAILABLE: 'Unavailable' }

export default function ProjectCart() {
  const { cart, loading, refreshCart, removeItem, clearCart } = useProjectCart()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyItem, setBusyItem] = useState('')
  const [showRequest, setShowRequest] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { refreshCart().catch(() => setError('Unable to load your project. Please try again.')) }, [])

  const handleRemove = async (itemId) => {
    setError('')
    setBusyItem(itemId)
    try { await removeItem(itemId) } catch { setError('Unable to remove this item. Please try again.') } finally { setBusyItem('') }
  }

  const handleClear = async () => {
    if (!cart?.items?.length || !window.confirm('Clear all equipment from this project?')) return
    setError('')
    try { await clearCart(); setNotice('Project cleared.') } catch { setError('Unable to clear your project. Please try again.') }
  }

  const total = cart?.items?.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0) || 0
  const requestBookings = async ({ startDate, endDate, note }) => { setError(''); try { await createProjectBookingRequests({ cart, startDate, endDate, note }); navigate('/bookings', { replace: true, state: { message: 'Booking request sent.' } }) } catch (requestError) { setError(requestError.message) } }
  return <div className="site-page"><Navbar /><main className="cart-page"><section className="cart-heading"><div><p className="eyebrow eyebrow-orange">Your project</p><h1>My Project <em>Cart.</em></h1><p>Collect the equipment you need before you start coordinating bookings.</p></div>{cart?.items?.length > 0 && <button type="button" className="text-link text-link-dark" onClick={handleClear}><Icon name="close" size={16} /> Clear project</button>}</section>{notice && <p className="machine-notice" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}{loading ? <div className="marketplace-state"><Icon name="loader" size={22} /><p>Loading your project...</p></div> : !cart?.items?.length ? <EmptyCart /> : <section className="cart-layout"><div className="cart-items"><div className="cart-items-heading"><span>{cart.project_name}</span><small>{cart.items.length} {cart.items.length === 1 ? 'machine' : 'machines'}</small></div>{cart.items.map((item) => <CartItem key={item.id} item={item} busy={busyItem === item.id} onRemove={handleRemove} />)}</div><aside className="cart-summary"><p className="eyebrow eyebrow-orange">Project estimate</p><h2>{cart.project_name}</h2><div className="summary-line"><span>Equipment</span><strong>{cart.items.length}</strong></div><div className="summary-line"><span>Estimated rental</span><strong>₹{total.toLocaleString('en-IN')}</strong></div><p>Based on listed prices and selected quantities. Final terms are agreed during booking.</p><button type="button" className="button" onClick={() => setShowRequest(true)}>Request bookings <Icon name="arrow" size={17} /></button></aside></section>}{showRequest && <BookingRequestForm onCancel={() => setShowRequest(false)} onSubmit={requestBookings} />}</main><Footer /></div>
}

function CartItem({ item, busy, onRemove }) {
  const machine = item.machine
  const image = machine?.machine_images?.[0]?.image_url
  const location = [machine?.city, machine?.state].filter(Boolean).join(', ')
  return <article className="cart-item"><div className="cart-item-image"><MarketplaceImage src={image} alt={machine?.title || 'Machine'} fallback={<><Icon name="truck" size={30} /><span>{machine?.machine_type || 'Machine'}</span></>} /></div><div className="cart-item-copy"><p className="eyebrow">{machine?.machine_type || 'Machine'}</p><h3>{machine?.title || 'Machine unavailable'}</h3><p className="cart-item-meta"><span><Icon name="compass" size={13} />{location || 'Location on request'}</span><span className={`cart-status ${machine?.availability_status === 'AVAILABLE' ? 'available' : ''}`}>{statusLabels[machine?.availability_status] || 'Unavailable'}</span></p></div><div className="cart-item-price"><strong>₹{Number(item.price || 0).toLocaleString('en-IN')}</strong><small>{machine?.price_unit || 'listed price'} · Qty {item.quantity}</small><button type="button" className="remove-button" onClick={() => onRemove(item.id)} disabled={busy}>{busy ? 'Removing...' : 'Remove'}</button></div></article>
}

function EmptyCart() { return <div className="marketplace-state empty-state"><span className="empty-illustration"><Icon name="briefcase" size={38} /></span><p className="eyebrow eyebrow-orange">A project takes shape</p><h2>No equipment added yet.</h2><p>Browse machines and add equipment for your project.</p><Link to="/machines" className="button">Find machines <Icon name="arrow" size={17} /></Link></div> }

function BookingRequestForm({ onCancel, onSubmit }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ startDate: today, endDate: today, note: '' })
  const submit = (event) => { event.preventDefault(); if (form.endDate < form.startDate) return; onSubmit(form) }
  return <section className="booking-request-form"><div><p className="eyebrow eyebrow-orange">Final review</p><h2>Request these bookings</h2><p>Each machine will receive its own booking request. Your project stays in the cart until you decide what happens next.</p></div><form onSubmit={submit}><div className="booking-date-fields"><label className="form-label">Start date<input required type="date" min={today} value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label className="form-label">End date<input required type="date" min={form.startDate || today} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label></div><label className="form-label">Project note<textarea rows="3" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Add site context or coordination notes" /></label><div className="form-actions"><button type="button" className="button button-ghost" onClick={onCancel}>Keep reviewing</button><button type="submit" className="button">Send request <Icon name="arrow" size={17} /></button></div></form></section>
}
