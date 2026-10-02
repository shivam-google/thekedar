import NearbyLocation, { useNearbyLocation } from '../components/NearbyLocation'
import { filterMarketplace, locationOptions } from '../utils/location'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import WorkerCard from '../components/WorkerCard'
import { Icon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { getCurrentWorkerProfile, listWorkers } from '../services/workerService'
import MarketplaceProfileAction from '../components/MarketplaceProfileAction'
import { ErrorState, LoadingState } from '../components/PageStates'

const initialFilters = { search: '', skill: '', city: '', state: '', availability: '', sort: 'newest' }

export default function Workers() {
  const [workers, setWorkers] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { isAuthenticated, profile: accountProfile } = useAuth()
  const [profile, setProfile] = useState(null)
  useEffect(() => { let active = true; listWorkers().then((data) => active && setWorkers(data)).catch(() => active && setError('Unable to load workers. Please try again.')).finally(() => active && setLoading(false)); return () => { active = false } }, [])
  useEffect(() => {
    let active = true
    if (!isAuthenticated || accountProfile?.role !== 'worker') {
      setProfile(null)
      return () => { active = false }
    }
    getCurrentWorkerProfile().then((workerProfile) => active && setProfile(workerProfile)).catch(() => active && setProfile(null))
    return () => { active = false }
  }, [isAuthenticated, accountProfile?.role])
  const skills = useMemo(() => [...new Set(workers.map((worker) => worker.skill).filter(Boolean))].sort(), [workers])
  const cities = useMemo(() => locationOptions(workers, 'city', filters.state), [workers])
  const states = useMemo(() => locationOptions(workers, 'state'), [workers])
  const nearby = useNearbyLocation()
  const visibleWorkers = useMemo(() => filterMarketplace(workers, filters, nearby.origin), [workers, filters, nearby.origin])
  const update = (name, value) => setFilters((current) => ({ ...current, [name]: value, ...(name === 'state' ? { city: '' } : {}) }))
  return <div className="site-page"><Navbar /><main className="workers-page"><section className="worker-heading"><div><p className="eyebrow eyebrow-orange">The people behind the build</p><h1>Skilled <em>Workers.</em></h1><p>Find experienced construction professionals for your next project.</p></div><MarketplaceProfileAction role="worker" target="/workers/profile" label={profile ? 'Edit your profile' : 'Create your profile' } /></section><section className="worker-toolbar"><div className="worker-search"><Icon name="search" size={19} /><input value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Search skills, locations, experience..." aria-label="Search workers" /></div><div className="worker-filter-row"><select value={filters.skill} onChange={(event) => update('skill', event.target.value)} aria-label="Skill"><option value="">All skills</option>{skills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select><select value={filters.city} onChange={(event) => update('city', event.target.value)} aria-label="City"><option value="">All cities</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select><select value={filters.state} onChange={(event) => update('state', event.target.value)} aria-label="State"><option value="">All states</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}</select><select value={filters.availability} onChange={(event) => update('availability', event.target.value)} aria-label="Availability"><option value="">Any availability</option><option value="available">Available</option><option value="working">Working</option><option value="unavailable">Unavailable</option></select><select value={filters.sort} onChange={(event) => update('sort', event.target.value)} aria-label="Sort workers"><option value="newest">Newest</option><option value="experience">Most experience</option><option value="nearby">Nearby</option></select></div></section>{filters.sort === 'nearby' && <NearbyLocation location={nearby} />}{loading ? <WorkerState text="Loading workers..." /> : error ? <WorkerState text={error} error /> : visibleWorkers.length === 0 ? <WorkerState text="No workers match these filters." empty /> : <div className="worker-grid">{visibleWorkers.map((worker) => <WorkerCard key={worker.id} worker={worker} />)}</div>}</main><Footer /></div>
}

function WorkerState({ text, error = false, empty = false }) { if (error) return <ErrorState onRetry={() => window.location.reload()} className="worker-state" />; if (!empty) return <LoadingState message={text} className="worker-state" />; return <div className="marketplace-state worker-state"><Icon name="users" size={28} /><p>{text}</p><p>Skilled workers will appear here when they create their profiles.</p></div> }
