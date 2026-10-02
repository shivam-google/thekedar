import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMachines } from '../services/machineService'
import { listWorkers } from '../services/workerService'
import { listTankers } from '../services/tankerService'
import { listMaterials } from '../services/materialService'
import { useProjectCart } from '../context/ProjectCartContext'
import { Icon } from './Icons'
import MachineCard from './MachineCard'
import WorkerCard from './WorkerCard'
import TankerCard from './TankerCard'
import MaterialCard from './MaterialCard'
import { ErrorState, LoadingState } from './PageStates'
import '../styles/provider-dashboard.css'

const services = [
  ['MACHINE', 'Machines', 'truck'],
  ['WORKER', 'Workers / Drivers', 'users'],
  ['TANKER', 'Tankers', 'water'],
  ['MATERIAL', 'Materials', 'box'],
]

const emptyFilters = { search: '', category: '', city: '', state: '', availability: '' }

function searchableValues(type, item) {
  if (type === 'MACHINE') return [item.title, item.machine_type, item.city, item.state, item.brand, item.model]
  if (type === 'WORKER') return [item.display_name, item.skill, item.city, item.state, item.description]
  if (type === 'TANKER') return [item.title, item.description, item.city, item.state]
  return [item.name, item.category, item.city, item.state, item.description]
}

function locationMatches(item, filters) {
  return (!filters.city || item.city === filters.city) && (!filters.state || item.state === filters.state)
}

export default function UnifiedMarketplace() {
  const [type, setType] = useState('MACHINE')
  const [filters, setFilters] = useState(emptyFilters)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const { addMachine } = useProjectCart()
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    const loader = type === 'MACHINE' ? fetchMachines : type === 'WORKER' ? listWorkers : type === 'TANKER' ? listTankers : listMaterials
    loader().then((result) => active && setItems(result)).catch(() => active && setError(true)).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [type, reload])

  const cities = useMemo(() => [...new Set(items.map((item) => item.city).filter(Boolean))].sort(), [items])
  const states = useMemo(() => [...new Set(items.map((item) => item.state).filter(Boolean))].sort(), [items])
  const categories = useMemo(() => {
    const values = items.map((item) => type === 'MACHINE' ? item.machine_type : type === 'WORKER' ? item.skill : type === 'MATERIAL' ? item.category : null).filter(Boolean)
    return [...new Set(values)].sort()
  }, [items, type])
  const filteredItems = useMemo(() => items.filter((item) => {
    const search = filters.search.trim().toLowerCase()
    const searchable = searchableValues(type, item).filter(Boolean).join(' ').toLowerCase()
    const category = type === 'MACHINE' ? item.machine_type : type === 'WORKER' ? item.skill : item.category
    return (!search || searchable.includes(search)) && locationMatches(item, filters) && (!filters.category || category === filters.category) && (!filters.availability || item.availability_status === filters.availability)
  }), [items, filters, type])

  const update = (name, value) => setFilters((current) => ({ ...current, [name]: value }))
  const addToProject = async (machine) => {
    setNotice('')
    try {
      await addMachine(machine)
      setNotice(`${machine.title} added to your project.`)
    } catch (addError) {
      setNotice(addError.message || 'Unable to add this machine to your project.')
    }
  }

  return <section className="unified-marketplace" aria-labelledby="unified-marketplace-title">
    <header className="unified-marketplace-heading"><div><p className="eyebrow eyebrow-orange">Find construction services</p><h2 id="unified-marketplace-title">One place to source your next project.</h2></div><Link to="/services" className="text-link text-link-dark">My services &amp; assets <Icon name="arrow" size={15} /></Link></header>
    <div className="unified-marketplace-tabs" role="tablist" aria-label="Marketplace type">{services.map(([value, label, icon]) => <button key={value} type="button" role="tab" aria-selected={type === value} className={type === value ? 'is-active' : ''} onClick={() => { setType(value); setFilters(emptyFilters) }}><Icon name={icon} size={16} />{label}</button>)}</div>
    <div className="unified-marketplace-filters"><label className="unified-search"><Icon name="search" size={17} /><input value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder={`Search ${services.find(([value]) => value === type)?.[1].toLowerCase()}...`} aria-label="Search marketplace" /></label>
      {categories.length > 0 && <label className="sr-only">Category<select value={filters.category} onChange={(event) => update('category', event.target.value)} aria-label="Category"><option value="">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>}
      <select value={filters.city} onChange={(event) => update('city', event.target.value)} aria-label="City"><option value="">All cities</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select>
      <select value={filters.state} onChange={(event) => update('state', event.target.value)} aria-label="State"><option value="">All states</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}</select>
      <select value={filters.availability} onChange={(event) => update('availability', event.target.value)} aria-label="Availability"><option value="">Any availability</option><option value="AVAILABLE">Available</option><option value="available">Available</option><option value="BOOKED">Booked</option><option value="working">Working</option><option value="UNAVAILABLE">Unavailable</option><option value="unavailable">Unavailable</option></select>
    </div>
    {notice && <p className="machine-notice" role="status">{notice}</p>}
    {loading ? <LoadingState message="Loading marketplace listings..." /> : error ? <ErrorState onRetry={() => setReload((current) => current + 1)} /> : filteredItems.length === 0 ? <div className="marketplace-state"><Icon name="search" size={24} /><p>No listings match these filters.</p><button type="button" className="text-link text-link-dark" onClick={() => setFilters(emptyFilters)}>Clear filters <Icon name="arrow" size={16} /></button></div> : <div className={`unified-marketplace-results results-${type.toLowerCase()}`}>
      {type === 'MACHINE' && filteredItems.map((machine) => <MachineCard key={machine.id} machine={machine} onAddToProject={addToProject} />)}
      {type === 'WORKER' && filteredItems.map((worker) => <WorkerCard key={worker.id} worker={worker} />)}
      {type === 'TANKER' && filteredItems.map((tanker) => <TankerCard key={tanker.id} tanker={tanker} />)}
      {type === 'MATERIAL' && filteredItems.map((material) => <MaterialCard key={material.id} material={material} />)}
    </div>}
  </section>
}