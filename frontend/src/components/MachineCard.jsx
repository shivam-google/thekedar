import { Link } from 'react-router-dom'
import { Icon } from './Icons'
import FavoriteButton from './FavoriteButton'
import MarketplaceImage from './MarketplaceImage'

const statusLabels = { AVAILABLE: 'Available', BOOKED: 'Booked', UNAVAILABLE: 'Unavailable' }

export default function MachineCard({ machine, onAddToProject }) {
  const image = machine.machine_images?.[0]?.image_url
  const location = [machine.city, machine.state].filter(Boolean).join(', ')
  const status = statusLabels[machine.availability_status] || machine.availability_status

  return <article className="machine-card">
    <div className="machine-card-media"><MarketplaceImage src={image} alt={machine.title} fallbackClassName="machine-card-placeholder" fallback={<><Icon name="truck" size={42} /><span>{machine.machine_type}</span></>} /><span className={`availability-badge ${machine.availability_status === 'AVAILABLE' ? 'is-available' : ''}`}>{status}</span><FavoriteButton itemType="MACHINE" itemId={machine.id} /></div>
    <div className="machine-card-body"><div className="machine-card-heading"><div><p className="eyebrow">{machine.machine_type}</p><h3>{machine.title}</h3></div><span className="machine-price"><strong>{machine.price != null ? `₹${Number(machine.price).toLocaleString('en-IN')}` : 'Price on request'}</strong>{machine.price != null && <small>{machine.price_unit}</small>}</span></div><div className="machine-meta"><span><Icon name="compass" size={14} />{location || 'Location on request'}</span>{machine.brand && <span><Icon name="briefcase" size={14} />{[machine.brand, machine.model].filter(Boolean).join(' ')}</span>}</div><div className="machine-card-actions"><Link to={`/machines/${machine.id}`} className="text-link text-link-dark">View details <Icon name="arrow" size={16} /></Link><button type="button" className="add-project-button" onClick={() => onAddToProject(machine)}>Add to project <Icon name="briefcase" size={15} /></button></div></div>
  </article>
}
