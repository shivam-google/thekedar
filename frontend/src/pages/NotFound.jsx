import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import '../styles/page-states.css'

const destinations = [
  ['Machines', '/machines', 'truck'],
  ['Workers', '/workers', 'users'],
  ['Tankers', '/tankers', 'water'],
  ['Materials', '/materials', 'box'],
]

export default function NotFound() {
  return <div className="site-page"><Navbar /><main className="not-found-page">
    <div className="not-found-content"><p className="eyebrow eyebrow-orange">Thekedar / 404</p><p className="not-found-code">404</p><h1>Page Not Found</h1><p className="not-found-copy">The page you're looking for doesn't exist or may have been moved.</p>
      <div className="not-found-actions"><Link to="/" className="button">Go Home <Icon name="arrow" size={16} /></Link></div>
      <nav className="not-found-marketplaces" aria-label="Browse marketplaces">{destinations.map(([label, path, icon]) => <Link key={path} to={path}><Icon name={icon} size={18} /><span>Browse {label}</span><Icon name="arrow" size={15} /></Link>)}</nav>
    </div>
  </main><Footer /></div>
}