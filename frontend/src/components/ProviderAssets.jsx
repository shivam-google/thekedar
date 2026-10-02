import LocationFields from './LocationFields'
import { coordinatePayload } from '../utils/location'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Icon } from './Icons'
import '../styles/provider-dashboard.css'

const tables = {
  machines: { table: 'machines', owner: 'owner_id', fields: 'id, title, machine_type, availability_status, status, city, state', path: '/machines/new', label: 'Add machine', display: (item) => item.title, location: true },
  workers: { table: 'worker_profiles', owner: 'provider_id', fields: 'id, display_name, skill, experience_years, description, daily_wage, availability_status, city, state, latitude, longitude', path: '', label: 'Add worker', display: (item) => item.display_name, location: true },
  tankers: { table: 'tankers', owner: 'owner_id', fields: 'id, title, availability_status, status, city, state', path: '/tankers/profile?new=1', label: 'Add tanker', display: (item) => item.title, location: true },
  materials: { table: 'materials', owner: 'supplier_id', fields: 'id, name, category, availability_status, city, state', path: '/materials/profile?new=1', label: 'Add material', display: (item) => item.name, location: true },
}

export default function ProviderAssets() {
  const { user } = useAuth()
  const [assets, setAssets] = useState({ machines: [], workers: [], tankers: [], materials: [] })
  const [workerProfile, setWorkerProfile] = useState(null)
  const [workerSchemaReady, setWorkerSchemaReady] = useState(true)
  const emptyWorkerForm = { display_name: '', skill: '', experience_years: 0, daily_wage: '', description: '', availability_status: 'available', city: '', state: '', latitude: '', longitude: '' }
    const [workerForm, setWorkerForm] = useState(emptyWorkerForm)
    const [editingWorker, setEditingWorker] = useState(null)
    const [workerFormOpen, setWorkerFormOpen] = useState(false)
    const [workerBusy, setWorkerBusy] = useState(false)
  const [busyAsset, setBusyAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const entries = Object.entries(tables)
      const results = await Promise.all(entries.map(async ([key, config]) => {
        if (key === 'workers') {
          const [managed, own] = await Promise.all([
            supabase.from(config.table).select(config.fields).eq(config.owner, user.id).order('created_at', { ascending: false }),
            supabase.from(config.table).select('id, skill, daily_wage, availability_status, city, state').eq('user_id', user.id).maybeSingle(),
          ])
          if (managed.error) {
            if (['42703', 'PGRST204'].includes(managed.error.code)) setWorkerSchemaReady(false)
            else throw managed.error
          } else setWorkerSchemaReady(true)
          if (own.error) throw own.error
          setWorkerProfile(own.data || null)
          return [key, managed.data || []]
        }
        const { data, error: queryError } = await supabase.from(config.table).select(config.fields).eq(config.owner, user.id).order('created_at', { ascending: false })
        if (queryError) throw queryError
        return [key, data || []]
      }))
      setAssets(Object.fromEntries(results))
    } catch {
      setError('Unable to load your services and assets.')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => { refresh() }, [refresh])

  const changeAvailability = async (key, item) => {
    setError('')
    setBusyAsset(item.id)
    const config = tables[key]
    const nextAvailability = ['UNAVAILABLE', 'unavailable'].includes(item.availability_status) ? (key === 'workers' ? 'available' : 'AVAILABLE') : (key === 'workers' ? 'unavailable' : 'UNAVAILABLE')
    try {
      const { error: updateError } = await supabase.from(config.table).update({ availability_status: nextAvailability }).eq('id', item.id).eq(config.owner, user.id).select('id').single()
      if (updateError) throw updateError
      setAssets((current) => ({ ...current, [key]: current[key].map((row) => row.id === item.id ? { ...row, availability_status: nextAvailability } : row) }))
    } catch { setError('Unable to update this listing. Refresh and try again.') }
    finally { setBusyAsset(null) }
  }

  const removeListing = async (key, item) => {
    if (!window.confirm(`Delete ${tables[key].display(item)}? This cannot be undone.`)) return
    setError('')
    setBusyAsset(item.id)
    const config = tables[key]
    try {
      const { error: deleteError } = await supabase.from(config.table).delete().eq('id', item.id).eq(config.owner, user.id).select('id').single()
      if (deleteError) throw deleteError
      setAssets((current) => ({ ...current, [key]: current[key].filter((row) => row.id !== item.id) }))
    } catch (error) { setError(error.message?.includes('booking history') ? 'This listing has booking history. Pause it instead of deleting it.' : 'Unable to delete this listing. Refresh and try again.') }
    finally { setBusyAsset(null) }
  }

  const editWorker = (worker) => {
    setEditingWorker(worker)
    setWorkerForm({ display_name: worker.display_name || '', skill: worker.skill || '', experience_years: worker.experience_years || 0, daily_wage: worker.daily_wage ?? '', description: worker.description || '', availability_status: worker.availability_status || 'available', city: worker.city || '', state: worker.state || '', latitude: worker.latitude ?? '', longitude: worker.longitude ?? '' })
    setWorkerFormOpen(true)
  }

  const saveManagedWorker = async (event) => {
    event.preventDefault()
    setWorkerBusy(true)
    setError('')
    try {
      const wage = Number(workerForm.daily_wage), experience = Number(workerForm.experience_years)
      if (!Number.isFinite(wage) || wage < 0 || !Number.isFinite(experience) || experience < 0 || experience > 999.99) throw new Error('Enter valid wage and experience values.')
      const payload = { user_id: null, provider_id: user.id, ...workerForm, ...coordinatePayload(workerForm), display_name: workerForm.display_name.trim(), skill: workerForm.skill.trim(), city: workerForm.city.trim(), state: workerForm.state.trim(), experience_years: experience, daily_wage: wage, description: workerForm.description.trim() || null }
      if (payload.display_name.length < 2 || payload.display_name.length > 120 || payload.skill.length < 2 || payload.skill.length > 120 || !payload.city || !payload.state) throw new Error('Enter a name and skill between 2 and 120 characters, a city, and a state.')
      const query = editingWorker ? supabase.from('worker_profiles').update(payload).eq('id', editingWorker.id).eq('provider_id', user.id) : supabase.from('worker_profiles').insert(payload)
      const { error: saveError } = await query.select('id').single()
      if (saveError) throw new Error('Unable to save this worker. Check the details and try again.')
      setWorkerFormOpen(false)
      setEditingWorker(null)
      await refresh()
    } catch (error) { setError(error.message) }
    finally { setWorkerBusy(false) }
  }

  return <section className="provider-assets" aria-labelledby="provider-assets-title">
    <header className="provider-assets-heading"><div><p className="eyebrow eyebrow-orange">Provider workspace</p><h2 id="provider-assets-title">My Services &amp; Assets</h2><p>Manage listings owned by this account.</p></div><details className="provider-add-menu"><summary className="button"><Icon name="arrow" size={16} /> Add Service / Asset</summary><nav aria-label="Add service or asset"><button type="button" disabled={!workerSchemaReady} onClick={() => { setEditingWorker(null); setWorkerForm(emptyWorkerForm); setWorkerFormOpen(true) }}>Add worker</button>{Object.entries(tables).map(([key, config]) => key !== 'workers' && <Link key={key} to={config.path}>{config.label}</Link>)}</nav></details></header>
    {error && <p className="provider-assets-error" role="alert">{error}</p>}
    {loading ? <div className="provider-assets-empty"><Icon name="loader" size={22} /><p>Loading your assets...</p></div> : <div className="provider-assets-grid">
      {Object.entries(tables).map(([key, config]) => <section className="provider-asset-group" key={key}>
          <header><div><h3>{key === 'workers' ? 'My Workers' : `My ${key[0].toUpperCase()}${key.slice(1)}`}</h3><span>{assets[key].length + (key === 'workers' && workerProfile ? 1 : 0)} listed</span></div>{key === 'workers' ? <button type="button" disabled={!workerSchemaReady} onClick={() => { setEditingWorker(null); setWorkerForm(emptyWorkerForm); setWorkerFormOpen((current) => !current) }}>Add worker</button> : <Link to={config.path}>{config.label} <Icon name="arrow" size={14} /></Link>}</header>
          {key === 'workers' && workerFormOpen && <form className="managed-worker-form" onSubmit={saveManagedWorker}><h4>{editingWorker ? 'Edit managed worker' : 'Add managed worker'}</h4><div className="managed-worker-fields">{[['display_name', 'Worker name'], ['skill', 'Skill or trade'], ['daily_wage', 'Daily wage'], ['city', 'City'], ['state', 'State']].map(([field, label]) => <label key={field}>{label}<input required type={field === 'daily_wage' ? 'number' : 'text'} min={field === 'daily_wage' ? '0' : undefined} step={field === 'daily_wage' ? '0.01' : undefined} value={workerForm[field]} onChange={(event) => setWorkerForm((current) => ({ ...current, [field]: event.target.value }))} /></label>)}<label>Experience years<input type="number" min="0" step="0.01" value={workerForm.experience_years} onChange={(event) => setWorkerForm((current) => ({ ...current, experience_years: event.target.value }))} /></label><label>Availability<select value={workerForm.availability_status} onChange={(event) => setWorkerForm((current) => ({ ...current, availability_status: event.target.value }))}><option value="available">Available</option><option value="working">Working</option><option value="unavailable">Unavailable</option></select></label></div><label className="managed-worker-description">Description<textarea rows="3" value={workerForm.description} onChange={(event) => setWorkerForm((current) => ({ ...current, description: event.target.value }))} /></label><LocationFields value={workerForm} onChange={(values) => setWorkerForm((current) => ({ ...current, ...values }))} /><div className="managed-worker-actions"><button type="button" className="button button-ghost" onClick={() => setWorkerFormOpen(false)}>Cancel</button><button type="submit" className="button" disabled={workerBusy}>{workerBusy ? 'Saving...' : 'Save worker'}</button></div></form>}
        {key === 'workers' && workerProfile && <article className="provider-asset-row"><div><strong>My worker profile</strong><span>{workerProfile.skill} · {[workerProfile.city, workerProfile.state].filter(Boolean).join(', ')}</span></div><Link to="/workers/profile">Manage <Icon name="arrow" size={14} /></Link></article>}
        {assets[key].length === 0 && !(key === 'workers' && workerProfile) ? <p className="provider-assets-empty">No {key} listed yet.</p> : assets[key].map((item) => <article className="provider-asset-row" key={item.id}><div><strong>{config.display(item)}</strong><span>{key === 'workers' ? item.skill : locationText(item)} · {item.availability_status}</span></div><div className="provider-asset-actions">{key === 'workers' ? <button type="button" onClick={() => editWorker(item)}>Edit</button> : <Link to={key === 'machines' ? `/machines/${item.id}/edit` : key === 'tankers' ? `/tankers/profile?id=${item.id}` : `/materials/profile?id=${item.id}`} aria-label={`Edit ${config.display(item)}`} title="Edit listing"><Icon name="arrow" size={15} /></Link>}<button type="button" disabled={busyAsset === item.id} onClick={() => changeAvailability(key, item)} aria-label="Change availability">{item.availability_status === 'UNAVAILABLE' || item.availability_status === 'unavailable' ? 'Activate' : 'Pause'}</button><button type="button" disabled={busyAsset === item.id} onClick={() => removeListing(key, item)} aria-label={`Delete ${config.display(item)}`}><Icon name="close" size={15} /></button></div></article>)}
      </section>)}
    </div>}
    {!workerSchemaReady && <p className="provider-worker-limitation" role="note">Managed worker listings are temporarily unavailable. Please contact support.</p>}
    <Link to="/workers" className="provider-requests-link">Find a worker or driver <Icon name="arrow" size={15} /></Link>
    <Link to="/bookings/requests" className="provider-requests-link">Incoming booking requests <Icon name="arrow" size={15} /></Link>
  </section>
}

function locationText(item) {
  return [item.city, item.state].filter(Boolean).join(', ') || 'Location unavailable'
}