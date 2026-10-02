import { localToday, inclusiveDays, estimateRental } from '../utils/booking'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { requestWorkerBooking } from '../services/bookingService'
import { getWorker, getWorkerBookingMeta } from '../services/workerService'
import ProviderRatings from '../components/ProviderRatings'
import FavoriteButton from '../components/FavoriteButton'
import { ErrorState, LoadingState } from '../components/PageStates'

const availabilityLabels = { available: 'Available', unavailable: 'Unavailable', working: 'Working' }

export default function WorkerDetails() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, profile } = useAuth()
  const [worker, setWorker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => { let active = true; getWorker(id).then((data) => active && setWorker(data)).catch(() => active && setError('Unable to load worker. Please try again.')).finally(() => active && setLoading(false)); return () => { active = false } }, [id])
  const beginRequest = () => { if (!isAuthenticated) return navigate('/login', { state: { from: location.pathname } }); if (!profile || profile.role === 'admin') return setNotice('This account cannot request a worker.'); if (worker?.availability_status !== 'available') return setNotice('This worker is not currently available.'); setNotice(''); setRequestOpen(true) }
  if (loading) return <PageShell><State text="Loading workers..." /></PageShell>
  if (error || !worker) return <PageShell><State text={error || 'Worker not found.'} error /></PageShell>
  return <PageShell><Link to="/workers" className="text-link text-link-dark worker-back"><Icon name="arrow" size={15} className="back-arrow" /> Back to workers</Link><section className="worker-detail"><div className="worker-detail-profile"><div className="worker-detail-avatar"><Icon name="user" size={55} /></div><p className="eyebrow eyebrow-orange">Worker profile</p><h1>{worker.display_name}</h1><FavoriteButton itemType="WORKER" itemId={worker.id} className="favorite-detail-button" /><p className="worker-detail-skill">{worker.skill}</p><span className={`status-badge worker-status-${worker.availability_status}`}>{availabilityLabels[worker.availability_status] || worker.availability_status}</span></div><div className="worker-detail-info"><div className="worker-facts"><Fact icon="briefcase" label="Experience" value={`${Number(worker.experience_years).toLocaleString('en-IN')} years`} /><Fact icon="compass" label="Location" value={[worker.city, worker.state].filter(Boolean).join(', ')} /><Fact icon="check" label="Availability" value={availabilityLabels[worker.availability_status] || worker.availability_status} /></div><ProviderRatings itemType="WORKER" itemId={worker.id} /><div className="worker-about"><h2>About this worker</h2><p>{worker.description || 'This worker has not added a description yet.'}</p></div><div id="request" className="worker-request-panel"><div><p className="eyebrow eyebrow-orange">Project fit</p><h2>Need this skill on site?</h2><p>Send a request with your project dates and requirements.</p></div><button type="button" className="button" onClick={beginRequest}>Request worker <Icon name="arrow" size={17} /></button></div>{notice && <p className="machine-notice" role="status">{notice}</p>}{requestOpen && <WorkerRequestForm workerId={worker.id} onCancel={() => setRequestOpen(false)} onSuccess={() => { setRequestOpen(false); setNotice('Worker request sent successfully.') }} />}</div></section></PageShell>
}

function WorkerRequestForm({ workerId, onCancel, onSuccess }) {
  const today = localToday()
  const [meta, setMeta] = useState(null)
  const [form, setForm] = useState({ startDate: today, endDate: today, quantity: 1, note: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; getWorkerBookingMeta(workerId).then((data) => active && setMeta(data)).catch((loadError) => active && setError(loadError.message)).finally(() => active && setLoading(false)); return () => { active = false } }, [workerId])
  const days = meta && form.endDate >= form.startDate ? inclusiveDays(form.startDate, form.endDate) : 0
  const estimate = meta ? Number(meta.daily_wage) * Number(form.quantity || 0) * days : 0
  const submit = async (event) => { event.preventDefault(); setError(''); if (form.endDate < form.startDate || Number(form.quantity) <= 0) return setError('Choose valid dates and quantity.'); setBusy(true); try { await requestWorkerBooking({ workerProfileId: workerId, ...form }); onSuccess() } catch (submitError) { setError(submitError.message || 'Unable to send worker request. Please try again.') } finally { setBusy(false) } }
  return <div className="worker-request-form"><div className="request-form-heading"><p className="eyebrow eyebrow-orange">Request details</p><h3>Send worker request</h3><p>{loading ? 'Loading current rate...' : meta ? `Daily wage: ₹${Number(meta.daily_wage).toLocaleString('en-IN')}` : ''}</p></div>{error && <p className="form-error" role="alert">{error}</p>}{loading ? <p className="worker-form-loading">Loading worker rate...</p> : <form onSubmit={submit}><div className="booking-date-fields"><label className="form-label">Start date<input required type="date" min={today} value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label className="form-label">End date<input required type="date" min={form.startDate} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label></div><label className="form-label">Quantity<input required type="number" min="1" step="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label><label className="form-label">Project note<textarea rows="3" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Add site context or requirements" /></label><div className="worker-estimate"><span>Estimated request total</span><strong>₹{estimate.toLocaleString('en-IN')}</strong></div><div className="form-actions"><button type="button" className="button button-ghost" onClick={onCancel}>Cancel</button><button type="submit" className="button" disabled={busy}>{busy ? 'Sending worker request...' : 'Send request'} <Icon name="arrow" size={17} /></button></div></form>}</div>
}

function Fact({ icon, label, value }) { return <div><span className="worker-fact-icon"><Icon name={icon} size={17} /></span><span><small>{label}</small><strong>{value || 'Not provided'}</strong></span></div> }
function PageShell({ children }) { return <div className="site-page"><Navbar /><main className="workers-page">{children}</main><Footer /></div> }
function State({ text, error = false }) { if (error) return <ErrorState onRetry={() => window.location.reload()} className="worker-state" />; return <LoadingState message={text} className="worker-state" /> }
