import { Link } from 'react-router-dom'
import { Icon } from './Icons'

export default function Footer() {
  return <footer className="site-footer">
    <div className="footer-grid">
      <div className="footer-brand"><Link to="/" className="brand brand-light"><span className="brand-mark"><Icon name="crane" size={22} /></span><span>Thekedar<span className="brand-dot">.</span></span></Link><p>Construction, connected. Find the people, equipment, and materials that keep your project moving.</p></div>
      <div><h3>Explore</h3><Link to="/machines">Machines</Link><Link to="/workers">Workers</Link><Link to="/tankers">Tankers</Link><Link to="/materials">Materials</Link></div>
      <div><h3>Company</h3><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/help">Help center</Link></div>
      <div><h3>Join Thekedar</h3><Link to="/signup">Customer registration</Link><Link to="/signup">Provider registration</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Thekedar. Built for the work ahead.</span><span className="footer-status"><span className="status-dot" /> Local providers, real work</span></div>
  </footer>
}
