import NearbyLocation, { useNearbyLocation } from '../components/NearbyLocation'
import { filterMarketplace, locationOptions } from '../utils/location'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import MachineCard from '../components/MachineCard'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { useProjectCart } from '../context/ProjectCartContext'
import { fetchMachines } from '../services/machineService'
import MarketplaceProfileAction from '../components/MarketplaceProfileAction'
import { ErrorState, LoadingState } from '../components/PageStates'

const initialFilters = { search: '', type: 'all', location: 'all', state: 'all', availability: 'all', minPrice: '', maxPrice: '', sort: 'newest' }

export default function Machines() {
  const { profile, isAuthenticated } = useAuth()
  const { addMachine } = useProjectCart()
  const navigate = useNavigate()
  const [machines, setMachines] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    fetchMachines().then((data) => active && setMachines(data)).catch(() => active && setError('Unable to load equipment. Please try again.')).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const nearby = useNearbyLocation()
  const filteredMachines = useMemo(() => filterMarketplace(machines, filters, nearby.origin), [machines, filters, nearby.origin])
  const types = [...new Set(machines.map((machine) => machine.machine_type).filter(Boolean))].sort()
  const locations = locationOptions(machines, 'city', filters.state)
  const states = locationOptions(machines, 'state')
  const isOwner = profile?.role === 'machine_owner'
  const updateFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value, ...(name === 'state' ? { location: 'all' } : {}) }))
  const handleAdd = async (machine) => {
    setNotice('')
    if (!isAuthenticated) { navigate('/login', { state: { from: '/machines' } }); return }
    try { await addMachine(machine); setNotice(`${machine.title} added to your project.`) } catch (addError) { setNotice(addError.message) }
  }

  return <div className="site-page"><Navbar /><main className="machines-page"><section className="marketplace-heading"><div><p className="eyebrow eyebrow-orange">The equipment exchange</p><h1>Construction <em>Equipment</em></h1><p>Find the right machinery for your next project, from providers who know the work.</p></div><div className="marketplace-heading-actions"><MarketplaceProfileAction role="machine_owner" target="/machines/new" label="List your machine" className="button" /></div></section>
    <section className="machine-toolbar"><div className="machine-search"><Icon name="search" size={19} /><input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search excavators, JCBs, cranes, mixers..." aria-label="Search equipment" /></div><div className="filter-row"><select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)} aria-label="Machine type"><option value="all">All machine types</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select><select value={filters.location} onChange={(event) => updateFilter('location', event.target.value)} aria-label="City"><option value="all">All cities</option>{locations.map((location) => <option key={location} value={location}>{location}</option>)}</select><select value={filters.state} onChange={(event) => updateFilter('state', event.target.value)} aria-label="State"><option value="all">All states</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}</select><select value={filters.availability} onChange={(event) => updateFilter('availability', event.target.value)} aria-label="Availability"><option value="all">Any availability</option><option value="AVAILABLE">Available</option><option value="BOOKED">Booked</option><option value="UNAVAILABLE">Unavailable</option></select><div className="price-filter"><input type="number" min="0" value={filters.minPrice} onChange={(event) => updateFilter('minPrice', event.target.value)} placeholder="Min price" aria-label="Minimum price" /><span>-</span><input type="number" min="0" value={filters.maxPrice} onChange={(event) => updateFilter('maxPrice', event.target.value)} placeholder="Max price" aria-label="Maximum price" /></div><select className="sort-select" value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)} aria-label="Sort machines"><option value="newest">Newest</option><option value="nearby">Nearby</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></div></section>
    {filters.sort === 'nearby' && <NearbyLocation location={nearby} />}{notice && <p className="machine-notice" role="status">{notice}</p>}
    {loading ? <LoadingState message="Loading equipment..." /> : error ? <ErrorState onRetry={() => window.location.reload()} /> : machines.length === 0 ? <EmptyMachines /> : filteredMachines.length === 0 ? <div className="marketplace-state"><Icon name="search" size={24} /><p>No equipment matches those filters.</p><button type="button" className="text-link text-link-dark" onClick={() => setFilters(initialFilters)}>Clear filters <Icon name="arrow" size={16} /></button></div> : <div className="machine-grid">{filteredMachines.map((machine) => <MachineCard key={machine.id} machine={machine} onAddToProject={handleAdd} />)}</div>}
  </main><Footer /></div>
}

function EmptyMachines() {
  return <div className="marketplace-state empty-state"><span className="empty-illustration"><Icon name="truck" size={42} /></span><p className="eyebrow eyebrow-orange">A clear site starts here</p><h2>No equipment listed yet</h2><p>Be the first machine owner to list your equipment.</p><MarketplaceProfileAction role="machine_owner" target="/machines/new" label="List your machine" className="button" /></div>
}
