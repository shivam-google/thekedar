import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProjectCart } from '../context/ProjectCartContext'
import { Icon } from './Icons'
import { getUnreadNotificationCount, notificationsChangedEvent } from '../services/notificationService'

const links = [
  ['Home', '/'],
  ['Find Machines', '/machines'],
  ['Workers', '/workers'],
  ['Tankers', '/tankers'],
  ['Materials', '/materials'],
  ['My Projects', '/projects'],
]

function initials(profile, user) {
  const source = profile?.full_name || user?.email || 'T'
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export default function Navbar() {
  const { user, profile, isAuthenticated, logout } = useAuth()
  const { itemCount } = useProjectCart()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const close = () => setOpen(false)

  useEffect(() => {
    let active = true
    const refreshCount = () => {
      if (!user) return setUnreadCount(0)
      getUnreadNotificationCount().then((count) => active && setUnreadCount(count)).catch(() => active && setUnreadCount(0))
    }
    refreshCount()
    const interval = window.setInterval(refreshCount, 30000)
    window.addEventListener(notificationsChangedEvent, refreshCount)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener(notificationsChangedEvent, refreshCount)
    }
  }, [user?.id])

  return <header className="site-header">
    <div className="nav-wrap">
      <Link to="/" className="brand" onClick={close} aria-label="Thekedar home"><span className="brand-mark"><Icon name="crane" size={22} /></span><span>Thekedar<span className="brand-dot">.</span></span></Link>
      <button type="button" className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation"><Icon name={open ? 'chevron' : 'menu'} size={22} /></button>
      <nav className={`main-nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">
        <div className="nav-links">{links.map(([label, path]) => <NavLink key={path} to={path} end={path === '/'} onClick={close} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}{profile?.role === 'admin' && <NavLink to="/admin" onClick={close} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Admin</NavLink>}</div>
        <div className="nav-actions">
          {isAuthenticated ? <>
            <NavLink to="/favorites" onClick={close} className="icon-link" aria-label="Favorites" title="Favorites"><Icon name="heart" size={19} /></NavLink>
            <NavLink to="/notifications" onClick={close} className="icon-link cart-nav-link" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} title="Notifications"><Icon name="bell" size={19} />{unreadCount > 0 && <span className="cart-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}</NavLink>
            <NavLink to="/projects" onClick={close} className="icon-link cart-nav-link" aria-label="My project cart" title="My project cart"><Icon name="briefcase" size={19} />{itemCount > 0 && <span className="cart-count">{itemCount}</span>}</NavLink>
            <NavLink to="/services" onClick={close} className="icon-link" aria-label="My services and assets" title="My services and assets"><Icon name="truck" size={19} /></NavLink>
            <NavLink to="/profile" onClick={close} className="profile-chip" title="Profile"><span className="avatar">{initials(profile, user)}</span><span className="profile-copy"><strong>{profile?.full_name || user?.email || 'Your profile'}</strong><small>{profile?.role?.replace('_', ' ') || 'Profile pending'}</small></span></NavLink>
            <button type="button" className="logout-link" onClick={async () => { close(); await logout() }}>Log out</button>
          </> : <><Link to="/login" onClick={close} className="nav-login">Log in</Link><Link to="/signup" onClick={close} className="button button-small">Sign up <Icon name="arrow" size={16} /></Link></>}
        </div>
      </nav>
    </div>
  </header>
}
