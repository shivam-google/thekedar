import { Link } from 'react-router-dom'
import { Icon } from './Icons'
import '../styles/page-states.css'

export function LoadingState({ message = 'Loading...', className = '' }) {
  return <div className={`marketplace-state page-loading-state ${className}`} role="status" aria-live="polite"><Icon name="loader" size={24} /><p>{message}</p></div>
}

export function ErrorState({ onRetry, className = '' }) {
  return <section className={`marketplace-state page-error-state ${className}`} role="alert">
    <Icon name="shield" size={27} />
    <h2>Something went wrong</h2>
    <p>A problem occurred while loading this page.</p>
    <div className="page-state-actions"><button type="button" className="button" onClick={onRetry}>Try Again <Icon name="arrow" size={15} /></button><Link to="/" className="button button-ghost">Go Home</Link></div>
  </section>
}