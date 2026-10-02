import { useCallback, useEffect, useState } from 'react'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import { getAdminDashboardData } from '../services/adminService'
import '../styles/admin.css'

const sections = [
  ['users', 'Users', 'user'],
  ['workers', 'Workers', 'users'],
  ['machines', 'Machines', 'truck'],
  ['tankers', 'Tankers', 'water'],
  ['materials', 'Materials', 'box'],
  ['bookings', 'Bookings', 'briefcase'],
  ['reviews', 'Reviews', 'star'],
]

const summaries = [
  ['users', 'Total users', 'user'], ['workers', 'Total workers', 'users'], ['machines', 'Total machines', 'truck'],
  ['tankers', 'Total tankers', 'water'], ['materials', 'Total materials', 'box'], ['bookings', 'Total bookings', 'briefcase'],
  ['completedBookings', 'Completed bookings', 'check'], ['requestedBookings', 'Requested bookings', 'loader'], ['reviews', 'Total reviews', 'star'],
]

const columns = {
  users: [
    ['Name', (row) => row.full_name], ['Email', (row) => row.email], ['Role', (row) => row.role.replaceAll('_', ' ')],
    ['Verified', (row) => row.is_verified ? 'Verified' : 'Not verified'], ['Joined', (row) => date(row.created_at)],
  ],
  workers: [
    ['Trade', (row) => row.skill], ['Location', (row) => location(row)], ['Experience', (row) => `${Number(row.experience_years).toLocaleString('en-IN')} years`],
    ['Daily wage', (row) => money(row.daily_wage)], ['Availability', (row) => row.availability_status],
  ],
  machines: [
    ['Listing', (row) => row.title], ['Type', (row) => row.machine_type], ['Location', (row) => location(row)],
    ['Price', (row) => `${money(row.price)} / ${row.price_unit}`], ['Status', (row) => `${row.availability_status} · ${row.status}`],
  ],
  tankers: [
    ['Listing', (row) => row.title], ['Capacity', (row) => Number(row.capacity).toLocaleString('en-IN')], ['Location', (row) => location(row)],
    ['Price', (row) => `${money(row.price)} / ${row.price_unit}`], ['Status', (row) => `${row.availability_status} · ${row.status}`],
  ],
  materials: [
    ['Material', (row) => row.name], ['Category', (row) => row.category], ['Location', (row) => location(row)],
    ['Price', (row) => `${money(row.price)} / ${row.unit}`], ['Stock', (row) => Number(row.quantity_available).toLocaleString('en-IN')],
    ['Availability', (row) => row.availability_status],
  ],
  bookings: [
    ['Item type', (row) => row.item_type], ['Status', (row) => row.status], ['Dates', (row) => `${date(row.start_date)} – ${date(row.end_date)}`],
    ['Total', (row) => money(row.total_price)], ['Created', (row) => date(row.created_at)],
  ],
  reviews: [
    ['Rating', (row) => <span className="admin-review-rating">{'★'.repeat(row.rating)}{'☆'.repeat(5 - row.rating)} <b>{row.rating}/5</b></span>],
    ['Comment', (row) => row.comment || 'Rating only'], ['Submitted', (row) => date(row.created_at)],
  ],
}

const sectionTitles = Object.fromEntries(sections.map(([key, label]) => [key, label]))
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const date = (value) => new Date(value).toLocaleDateString('en-IN')
const location = (row) => [row.city, row.state].filter(Boolean).join(', ') || 'Not provided'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [activeSection, setActiveSection] = useState('users')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getAdminDashboardData())
    } catch (loadError) {
      setError(loadError.message || 'Unable to load admin data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const rows = data?.[activeSection] || []
  return <div className="site-page"><Navbar /><main className="admin-page">
    <header className="admin-heading"><div><p className="eyebrow eyebrow-orange">Thekedar administration</p><h1>Marketplace overview</h1><p>Read-only operations data across users, listings, bookings, and reviews.</p></div><button type="button" className="button button-ghost admin-refresh" onClick={refresh} disabled={loading}><Icon name="loader" size={16} />{loading ? 'Refreshing...' : 'Refresh data'}</button></header>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading && !data ? <div className="admin-state"><Icon name="loader" size={25} /><p>Loading administrator data...</p></div> : data && <>
      <section className="admin-summary-grid" aria-label="Marketplace summary">
        {summaries.map(([key, label, icon]) => <article className="admin-summary" key={key}><span className="admin-summary-icon"><Icon name={icon} size={18} /></span><span>{label}</span><strong>{Number(data.counts[key]).toLocaleString('en-IN')}</strong></article>)}
      </section>
      <div className="admin-workspace">
        <nav className="admin-section-nav" aria-label="Admin management sections">{sections.map(([key, label, icon]) => <button type="button" key={key} className={activeSection === key ? 'is-active' : ''} onClick={() => setActiveSection(key)}><Icon name={icon} size={17} /><span>{label}</span><small>{Number(data.counts[key] || 0).toLocaleString('en-IN')}</small></button>)}</nav>
        <section className="admin-table-panel" aria-labelledby="admin-table-title">
          <header className="admin-table-heading"><div><p className="eyebrow eyebrow-orange">Management</p><h2 id="admin-table-title">{sectionTitles[activeSection]}</h2></div><span>Latest {rows.length} records</span></header>
          {rows.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr>{columns[activeSection].map(([label]) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns[activeSection].map(([label, render]) => <td key={label}>{render(row)}</td>)}</tr>)}</tbody></table></div> : <div className="admin-empty"><p>No {activeSection} records found.</p></div>}
        </section>
      </div>
    </>}
    {error && !data && <button type="button" className="button" onClick={refresh} disabled={loading}>Try again</button>}
  </main><Footer /></div>
}