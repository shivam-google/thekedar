import { Link } from 'react-router-dom'
import { Icon } from './Icons'
import FavoriteButton from './FavoriteButton'

const availabilityLabels = { available: 'Available', unavailable: 'Unavailable', working: 'Working' }

export default function WorkerCard({ worker }) {
  return <article className="worker-card"><div className="worker-avatar"><Icon name="user" size={31} /></div><div className="worker-card-body"><div className="worker-card-heading"><div><p className="eyebrow">{worker.skill}</p><h2>{worker.display_name}</h2></div><div className="worker-card-status"><span className={`status-badge worker-status-${worker.availability_status}`}>{availabilityLabels[worker.availability_status] || worker.availability_status}</span><FavoriteButton itemType="WORKER" itemId={worker.id} /></div></div><div className="worker-meta"><span><Icon name="compass" size={14} />{[worker.city, worker.state].filter(Boolean).join(', ')}</span><span><Icon name="briefcase" size={14} />{Number(worker.experience_years).toLocaleString('en-IN')} years experience</span></div><p className="worker-description">{worker.description || 'This worker has not added a description yet.'}</p><div className="worker-card-actions"><Link to={`/workers/${worker.id}`} className="text-link text-link-dark">View profile <Icon name="arrow" size={16} /></Link><Link to={`/workers/${worker.id}#request`} className="worker-request-link">Request worker <Icon name="arrow" size={15} /></Link></div></div></article>
}
