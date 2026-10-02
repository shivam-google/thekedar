import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import UnifiedMarketplace from '../components/UnifiedMarketplace'
import ProviderAssets from '../components/ProviderAssets'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  return <div className="site-page"><Navbar /><main className="dashboard-page"><section className="dashboard-hero"><div><p className="eyebrow eyebrow-orange">Your workspace</p><h1>Good to see you, <em>{firstName}.</em></h1><p>Pick up where your project left off, or find the next resource to keep things moving.</p></div><Link to="/services" className="button">My services &amp; assets <Icon name="arrow" size={17} /></Link></section><section className="dashboard-grid"><div className="workspace-card workspace-card-main"><div className="card-kicker"><span className="card-icon"><Icon name="compass" size={20} /></span><span>Marketplace</span></div><h2>Ready for the next move?</h2><p>Browse local machines, workers, tankers, and materials for your active work.</p><div className="quick-links"><Link to="/machines">Find machines <Icon name="arrow" size={16} /></Link><Link to="/workers">Find workers <Icon name="arrow" size={16} /></Link></div></div><div className="workspace-card profile-summary"><div className="card-kicker"><span className="card-icon"><Icon name="user" size={20} /></span><span>Your profile</span></div><div className="summary-avatar">{(profile?.full_name || user?.email || 'T').slice(0, 1).toUpperCase()}</div><h3>{profile?.full_name || 'Profile pending'}</h3><p>{profile?.role?.replace('_', ' ') || 'Complete your profile'}</p><Link to="/profile" className="text-link text-link-dark">View profile <Icon name="arrow" size={16} /></Link></div></section>{['customer', 'contractor'].includes(profile?.role) && <UnifiedMarketplace />}<ProviderAssets /></main><Footer /></div>
}
