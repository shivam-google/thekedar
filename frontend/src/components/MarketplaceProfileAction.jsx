import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Icon } from './Icons'

const roleLabels = {
  machine_owner: 'Machine Owner',
  worker: 'Worker',
  tanker_owner: 'Tanker Owner',
  material_supplier: 'Material Supplier',
}

export default function MarketplaceProfileAction({ role, target, label, className = 'button button-ghost' }) {
  const { profile, isAuthenticated } = useAuth()
  const ownsRole = isAuthenticated && profile?.role === role
  const to = ownsRole ? target : isAuthenticated ? target : `/signup?role=${role}`
  const text = isAuthenticated ? label : `Create a ${roleLabels[role]} account`

  return <Link to={to} className={className}>{text} <Icon name="arrow" size={17} /></Link>
}
