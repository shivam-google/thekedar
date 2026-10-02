import { coordinatePayload } from '../utils/location'
import { supabase } from './supabaseClient'

import { apiBaseUrl } from './apiConfig'

async function request(path, options = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
  if (!response.ok) throw new Error(response.status === 404 ? 'Worker not found' : 'Unable to load workers')
  return response.json()
}

export async function listWorkers(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value))
  const result = await request(`/api/workers${params.toString() ? `?${params}` : ''}`)
  return result.workers || []
}

export async function getWorker(workerId) {
  const result = await request(`/api/workers/${workerId}`)
  return result.worker || null
}

export async function getWorkerBookingMeta(workerId) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('Please log in to request a worker.')
  let { data, error } = await supabase.from('worker_profiles').select('id, user_id, provider_id, display_name, skill, daily_wage, availability_status').eq('id', workerId).maybeSingle()
  if (error?.code === '42703' || error?.code === 'PGRST204') {
    ({ data, error } = await supabase.from('worker_profiles').select('id, user_id, skill, daily_wage, availability_status').eq('id', workerId).maybeSingle())
  }
  if (error || !data) throw new Error('Worker not found.')
  return data
}

export async function getCurrentWorkerProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('Authentication required')
  const { data, error } = await supabase.from('worker_profiles').select('*').eq('user_id', userData.user.id).maybeSingle()
  if (error) throw new Error('Unable to load your worker profile.')
  return data
}

export async function saveWorkerProfile({ userId, skill, experience_years, daily_wage, description, availability_status, city, state, latitude, longitude }) {
  const payload = { ...coordinatePayload({ latitude, longitude }), user_id: userId, skill: skill.trim(), experience_years: Number(experience_years), daily_wage: Number(daily_wage), description: description.trim() || null, availability_status, city: city.trim(), state: state.trim() }
  const { data, error } = await supabase.from('worker_profiles').upsert(payload, { onConflict: 'user_id' }).select().single()
  if (error) {
    if (error.code === '42501') throw new Error('You do not have permission to edit this worker profile.')
    if (error.code === '23514') throw new Error('One of the profile values does not meet the database requirements.')
    throw new Error('Unable to save your worker profile.')
  }
  return data
}
