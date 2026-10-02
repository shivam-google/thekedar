import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import { fetchMachineById } from '../services/machineService'
import { useAuth } from '../context/AuthContext'
import { useProjectCart } from '../context/ProjectCartContext'
import ProviderRatings from '../components/ProviderRatings'
import FavoriteButton from '../components/FavoriteButton'
import { ErrorState, LoadingState } from '../components/PageStates'
import MarketplaceImage from '../components/MarketplaceImage'

const statusLabels = { AVAILABLE: 'Available', BOOKED: 'Booked', UNAVAILABLE: 'Unavailable' }

export default function MachineDetails() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, profile } = useAuth()
  const { addMachine } = useProjectCart()
  const [machine, setMachine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { let active = true; fetchMachineById(id).then((data) => active && setMachine(data)).catch(() => active && setError('Unable to load this machine. Please try again.')).finally(() => active && setLoading(false)); return () => { active = false } }, [id])
  const handleAdd = async () => { if (!isAuthenticated) { navigate('/login', { state: { from: location.pathname } }); return } try { await addMachine(machine); setNotice(`${machine.title} added to your project.`) } catch (addError) { setNotice(addError.message) } }
  if (loading) return <PageShell><LoadingState message="Loading equipment..." /></PageShell>
  if (error) return <PageShell><ErrorState onRetry={() => window.location.reload()} /></PageShell>
  if (!machine) return <PageShell><NotFound /></PageShell>
  const images = machine.machine_images?.map((machineImage) => machineImage.image_url).filter(Boolean) || []
  const machineLocation = [machine.city, machine.state].filter(Boolean).join(', ')
  return <PageShell><div className="details-back"><Link to="/machines" className="text-link text-link-dark"><Icon name="arrow" size={16} className="back-arrow" /> Back to equipment</Link></div><section className="machine-details"><div className="details-gallery">{images.length > 0 ? <div className="details-image-grid">{images.map((image, index) => <MarketplaceImage key={image} src={image} alt={`${machine.title} view ${index + 1}`} fallbackClassName="details-placeholder" fallback={<><Icon name="truck" size={72} /><span>{machine.machine_type}</span></>} />)}</div> : <div className="details-placeholder"><Icon name="truck" size={72} /><span>{machine.machine_type}</span></div>}</div><div className="details-copy"><p className="eyebrow eyebrow-orange">{machine.machine_type}</p><h1>{machine.title}</h1>{machine.brand || machine.model ? <p className="details-model">{[machine.brand, machine.model].filter(Boolean).join(' ')}</p> : null}<div className="details-price"><strong>₹{Number(machine.price).toLocaleString('en-IN')}</strong><span>{machine.price_unit}</span></div><div className="details-facts"><span><Icon name="compass" size={17} />{machineLocation || 'Location on request'}</span><span><Icon name={machine.availability_status === 'AVAILABLE' ? 'check' : 'briefcase'} size={17} />{statusLabels[machine.availability_status] || machine.availability_status}</span>{machine.operator_available && <span><Icon name="users" size={17} />Operator available</span>}{machine.delivery_available && <span><Icon name="truck" size={17} />Delivery available</span>}</div><div className="details-actions"><button type="button" className="button" onClick={handleAdd}>Add to project <Icon name="briefcase" size={17} /></button><Link to="/projects" className="button button-ghost">Request booking <Icon name="arrow" size={17} /></Link></div>{notice && <p className="machine-notice" role="status">{notice}</p>}
<FavoriteButton itemType="MACHINE" itemId={machine.id} className="favorite-detail-button" /><ProviderRatings itemType="MACHINE" itemId={machine.id} />
<Link to="/workers" className="button button-ghost machine-worker-link">Find Driver / Worker <Icon name="users" size={16} /></Link>
<div className="details-description"><h2>About this machine</h2><p>{machine.description || 'The provider has not added a description yet.'}</p></div></div></section></PageShell>
}

function PageShell({ children }) { return <div className="site-page"><Navbar /><main className="details-page">{children}</main><Footer /></div> }
function NotFound({ copy = 'This machine could not be found or is no longer available.' }) { return <div className="marketplace-state empty-state"><span className="empty-illustration"><Icon name="search" size={38} /></span><h2>Machine not found</h2><p>{copy}</p><Link to="/machines" className="button">Browse equipment <Icon name="arrow" size={17} /></Link></div> }
