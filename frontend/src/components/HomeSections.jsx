import { Link } from 'react-router-dom'
import CategoryCard from './CategoryCard'
import { Icon } from './Icons'
import { useAuth } from '../context/AuthContext'

export function HeroSection() {
  const { profile } = useAuth()
  const listingPath = profile?.role === 'machine_owner' ? '/machines/new' : '/signup'
  return <section className="hero-section"><div className="hero-grid">
    <div className="hero-copy"><p className="eyebrow eyebrow-orange">Construction, connected</p><h1>Everything You Need to <em>Build.</em></h1><p className="hero-lede">Thekedar brings customers, contractors, skilled workers, equipment owners, tanker operators, and material suppliers into one trusted marketplace.</p><div className="hero-actions"><Link to="/machines" className="button">Find equipment <Icon name="arrow" size={18} /></Link><Link to={listingPath} className="button button-ghost">List your equipment <Icon name="arrow" size={18} /></Link></div><div className="hero-note"><span className="avatar-stack"><span>AK</span><span>RM</span><span>+ </span></span><span>Built around the people doing the work.</span></div></div>
    <div className="hero-visual" aria-label="Construction marketplace overview"><div className="sun-disc" /><div className="visual-label label-top"><span className="label-line" />Equipment on demand</div><div className="crane-scene"><div className="scene-skyline skyline-back" /><div className="scene-skyline skyline-front" /><div className="crane-tower" /><div className="crane-arm" /><div className="crane-hook" /><div className="scene-ground" /></div><div className="visual-card"><span className="visual-card-icon"><Icon name="check" size={17} /></span><span><strong>Ready when you are</strong><small>Find local providers</small></span></div><div className="visual-coordinate">19° 04' N <span>/</span> 72° 52' E</div></div>
  </div><div className="hero-search"><div className="search-icon"><Icon name="search" size={21} /></div><div><label htmlFor="market-search">What are you looking for?</label><input id="market-search" placeholder="Search machines, workers, tankers, or materials" /></div><button type="button" className="search-button" aria-label="Search"><Icon name="arrow" size={20} /></button></div></section>
}

export function CategorySection() {
  const categories = [
    { icon: 'truck', eyebrow: 'Heavy duty', title: 'Construction Machines', description: 'Excavators, loaders, cranes, and more from equipment owners near you.', path: '/machines', tone: 'tone-orange' },
    { icon: 'users', eyebrow: 'Skilled hands', title: 'Skilled Workers', description: 'Find dependable tradespeople and crews with the skills your site needs.', path: '/workers', tone: 'tone-navy' },
    { icon: 'water', eyebrow: 'Keep moving', title: 'Water Tankers', description: 'Source reliable tanker services for dust control, curing, and site supply.', path: '/tankers', tone: 'tone-sage' },
    { icon: 'box', eyebrow: 'Site essentials', title: 'Construction Materials', description: 'Connect with suppliers for the materials that turn plans into progress.', path: '/materials', tone: 'tone-sand' },
  ]
  return <section className="content-section categories-section"><div className="section-heading"><div><p className="eyebrow eyebrow-orange">The marketplace</p><h2>Start with what<br /><em>your site needs.</em></h2></div><p>One clear place to source services and supplies, without the noise.</p></div><div className="category-grid">{categories.map((category) => <CategoryCard key={category.path} {...category} />)}</div></section>
}

export function HowItWorks() {
  const steps = [{ number: '01', icon: 'search', title: 'Search', copy: 'Find the equipment, worker, tanker, or material your project needs.' }, { number: '02', icon: 'briefcase', title: 'Book', copy: 'Send a booking request and coordinate directly with the provider.' }, { number: '03', icon: 'crane', title: 'Build', copy: 'Complete your project with trusted local providers at your side.' }]
  return <section className="how-section"><div className="content-section"><div className="section-heading light-heading"><div><p className="eyebrow eyebrow-orange">A clearer way forward</p><h2>From first search<br /><em>to final build.</em></h2></div><p>Less chasing. More doing. Thekedar keeps every step close to the work.</p></div><div className="steps-grid">{steps.map((step) => <div className="step-item" key={step.number}><div className="step-number">{step.number}</div><span className="step-icon"><Icon name={step.icon} size={25} /></span><h3>{step.title}</h3><p>{step.copy}</p></div>)}</div></div></section>
}

export function ProviderCTA() {
  const providers = [{ icon: 'truck', title: 'Machine Owner', copy: 'Keep your equipment earning between projects.', path: '/signup' }, { icon: 'users', title: 'Worker', copy: 'Put your craft in front of teams that need it.', path: '/signup' }, { icon: 'water', title: 'Tanker Owner', copy: 'Turn dependable service into your next booking.', path: '/signup' }, { icon: 'box', title: 'Material Supplier', copy: 'Reach active projects looking for your stock.', path: '/signup' }]
  return <section className="content-section provider-section"><div className="provider-intro"><p className="eyebrow eyebrow-orange">For the people who make it happen</p><h2>Your work has a place<br /><em>here.</em></h2><p>Bring your availability, skills, or inventory to a marketplace built around real construction work.</p><Link to="/signup" className="text-link text-link-dark">Start listing <Icon name="arrow" size={17} /></Link></div><div className="provider-grid">{providers.map((provider) => <Link to={provider.path} className="provider-card" key={provider.title}><span className="provider-icon"><Icon name={provider.icon} size={23} /></span><span><h3>{provider.title}</h3><p>{provider.copy}</p><strong>Start listing <Icon name="arrow" size={15} /></strong></span></Link>)}</div></section>
}

export function TrustSection() {
  const trust = [{ icon: 'shield', title: 'Verified providers', copy: 'Profiles that keep identity and experience close to the decision.' }, { icon: 'briefcase', title: 'Transparent booking', copy: 'Clear requests and direct coordination from start to finish.' }, { icon: 'compass', title: 'Local availability', copy: 'Find the right resource closer to where your work is happening.' }, { icon: 'star', title: 'Ratings & reviews', copy: 'Make informed choices with feedback from the community.' }]
  return <section className="trust-section"><div className="content-section"><div className="trust-heading"><p className="eyebrow eyebrow-orange">Built on confidence</p><h2>Good work starts<br />with <em>trust.</em></h2></div><div className="trust-grid">{trust.map((item) => <div className="trust-item" key={item.title}><span className="trust-icon"><Icon name={item.icon} size={21} /></span><h3>{item.title}</h3><p>{item.copy}</p></div>)}</div></div></section>
}
