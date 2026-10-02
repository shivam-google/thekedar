import { getSupabaseAdminClient } from '../config/supabase.js'

const publicWorkerFields = 'id, user_id, provider_id, display_name, skill, experience_years, description, availability_status, city, state, created_at, profiles(full_name)'
const legacyPublicWorkerFields = 'id, user_id, skill, experience_years, description, availability_status, city, state, created_at, profiles(full_name)'

function isMissingManagedWorkerFields(error) {
  return error?.code === '42703' || error?.code === 'PGRST204'
}

function normalizeWorker(worker) {
  const profile = Array.isArray(worker.profiles) ? worker.profiles[0] : worker.profiles
  return {
    id: worker.id,
    display_name: worker.display_name || profile?.full_name || 'Thekedar Worker',
    skill: worker.skill,
    experience_years: worker.experience_years,
    description: worker.description,
    availability_status: worker.availability_status,
    city: worker.city,
    state: worker.state,
    created_at: worker.created_at,
  }
}

function applyFilters(query, { search, skill, city, state, availability }, includeManagedName = true) {
  const safeSearch = search.replace(/[(),*%_]/g, ' ').replace(/\s+/g, ' ').trim()
  let filtered = query
  if (skill) filtered = filtered.ilike('skill', skill)
  if (city) filtered = filtered.ilike('city', city)
  if (state) filtered = filtered.ilike('state', state)
  if (availability) filtered.eq('availability_status', availability)
  if (safeSearch) {
    const nameFilter = includeManagedName ? `display_name.ilike.%${safeSearch}%,` : ''
    filtered = filtered.or(`${nameFilter}skill.ilike.%${safeSearch}%,city.ilike.%${safeSearch}%,state.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`)
  }
  return filtered
}

export async function listPublicWorkers({ search = '', skill = '', city = '', state = '', availability = '', sort = 'newest' }) {
  const admin = getSupabaseAdminClient()
  const filters = { search: search.trim().slice(0, 80), skill: skill.trim().slice(0, 120), city: city.trim().slice(0, 120), state: state.trim().slice(0, 120), availability: availability.trim() }
  const buildQuery = (fields, includeManagedName) => {
    let query = admin.from('worker_profiles').select(fields)
    query = applyFilters(query, filters, includeManagedName)
    query = sort === 'experience' ? query.order('experience_years', { ascending: false }) : query.order('created_at', { ascending: false })
    return query.limit(100)
  }
  let { data, error } = await buildQuery(publicWorkerFields, true)
  let usingManagedFields = true
  if (isMissingManagedWorkerFields(error)) {
    usingManagedFields = false
    ;({ data, error } = await buildQuery(legacyPublicWorkerFields, false))
  }
  if (error) throw error

  const searchTerm = filters.search.replace(/[(),*%_]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!searchTerm) return (data || []).map(normalizeWorker)

  const { data: matchingProfiles, error: profileError } = await admin.from('profiles')
    .select('id')
    .ilike('full_name', `%${searchTerm}%`)
    .limit(100)
  if (profileError) throw profileError
  const userIds = (matchingProfiles || []).map((profile) => profile.id)
  if (!userIds.length) return (data || []).map(normalizeWorker)

  const queryForNames = (fields) => {
    let query = admin.from('worker_profiles').select(fields)
    query = applyFilters(query, { ...filters, search: '' }, false).in('user_id', userIds)
    return sort === 'experience' ? query.order('experience_years', { ascending: false }).limit(100) : query.order('created_at', { ascending: false }).limit(100)
  }
  let named = await queryForNames(usingManagedFields ? publicWorkerFields : legacyPublicWorkerFields)
  if (usingManagedFields && isMissingManagedWorkerFields(named.error)) named = await queryForNames(legacyPublicWorkerFields)
  if (named.error) throw named.error

  const combined = new Map([...(data || []), ...(named.data || [])].map((worker) => [worker.id, worker]))
  return [...combined.values()].map(normalizeWorker)
}

export async function getPublicWorker(workerId) {
  const admin = getSupabaseAdminClient()
  let { data, error } = await admin.from('worker_profiles').select(publicWorkerFields).eq('id', workerId).maybeSingle()
  if (isMissingManagedWorkerFields(error)) ({ data, error } = await admin.from('worker_profiles').select(legacyPublicWorkerFields).eq('id', workerId).maybeSingle())
  if (error) throw error
  return data ? normalizeWorker(data) : null
}
