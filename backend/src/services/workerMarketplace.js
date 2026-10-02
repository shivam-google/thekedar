import { getSupabaseAdminClient } from '../config/supabase.js'

// Both worker ownership columns reference profiles; name the self-profile FK.
const fields = 'id, display_name, skill, experience_years, description, availability_status, city, state, latitude, longitude, created_at, profiles!worker_profiles_user_id_fkey(full_name)'
const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()

export function normalizeWorker(worker) {
  const profile = Array.isArray(worker.profiles) ? worker.profiles[0] : worker.profiles
  return {
    id: worker.id, display_name: worker.display_name || profile?.full_name || 'Thekedar Worker',
    skill: worker.skill, experience_years: worker.experience_years, description: worker.description,
    availability_status: worker.availability_status, city: worker.city, state: worker.state,
    latitude: worker.latitude, longitude: worker.longitude, created_at: worker.created_at,
  }
}

export async function listPublicWorkers({ search = '', skill = '', city = '', state = '', availability = '', sort = 'newest' } = {}) {
  const admin = getSupabaseAdminClient()
  const workers = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from('worker_profiles').select(fields).order('created_at', { ascending: false }).order('id').range(offset, offset + 999)
    if (error) throw error
    workers.push(...(data || []).map(normalizeWorker))
    if (!data || data.length < 1000) break
  }
  return workers.filter((worker) => (!skill || normalize(worker.skill) === normalize(skill)) && (!city || normalize(worker.city) === normalize(city)) && (!state || normalize(worker.state) === normalize(state)) && (!availability || worker.availability_status === availability) && (!search || normalize([worker.display_name, worker.skill, worker.city, worker.state, worker.description].join(' ')).includes(normalize(search)))).sort((a, b) => sort === 'experience' ? Number(b.experience_years) - Number(a.experience_years) : new Date(b.created_at) - new Date(a.created_at))
}

export async function getPublicWorker(workerId) {
  const { data, error } = await getSupabaseAdminClient().from('worker_profiles').select(fields).eq('id', workerId).maybeSingle()
  if (error) throw error
  return data ? normalizeWorker(data) : null
}
