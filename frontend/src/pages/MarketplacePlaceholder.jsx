import { Link, useLocation } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'

const pageCopy = {
  '/machines': ['Find Machines', 'The right equipment for the work ahead.', 'Machine listings will appear here as providers publish their availability.'],
  '/workers': ['Workers', 'Skilled people for every stage of the build.', 'Worker profiles will appear here as professionals join the marketplace.'],
  '/tankers': ['Tankers', 'Reliable water service for active sites.', 'Tanker availability will appear here as operators list their services.'],
  '/materials': ['Materials', 'Site essentials, sourced with clarity.', 'Material listings will appear here as suppliers publish their stock.'],
  '/projects': ['My Projects', 'Keep your active work in view.', 'Project requests and bookings will appear here when you start coordinating work.'],
  '/favorites': ['Favorites', 'Keep the providers worth coming back to close.', 'Your saved providers and listings will appear here.'],
  '/notifications': ['Notifications', 'Important updates, in one place.', 'Booking and account updates will appear here.'],
  '/profile': ['Profile', 'Your work identity, all in one place.', 'Profile editing will be available here soon.'],
  '/about': ['About Thekedar', 'A clearer way to get construction work moving.', 'More about the marketplace is coming soon.'],
  '/contact': ['Contact', 'Let’s keep the work moving.', 'Contact options are coming soon.'],
  '/help': ['Help center', 'Answers for the work ahead.', 'Help resources are coming soon.'],
  '/terms': ['Terms', 'Clear expectations for every participant.', 'Terms are coming soon.'],
  '/privacy': ['Privacy', 'Your information handled with care.', 'Privacy details are coming soon.'],
}

export default function MarketplacePlaceholder() {
  const { pathname } = useLocation()
  const [title, headline, copy] = pageCopy[pathname] || ['Coming soon', 'This workspace is taking shape.', 'This area will be available soon.']
  return <div className="site-page"><Navbar /><main className="placeholder-page"><div className="placeholder-panel"><span className="placeholder-icon"><Icon name="crane" size={28} /></span><p className="eyebrow eyebrow-orange">Thekedar workspace</p><h1>{title}</h1><h2>{headline}</h2><p>{copy}</p><Link to="/" className="button">Back to home <Icon name="arrow" size={17} /></Link></div></main><Footer /></div>
}
