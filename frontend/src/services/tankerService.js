import { queryAll } from './queryAll'
import { coordinatePayload } from '../utils/location'
import { supabase } from './supabaseClient'

const tankerFields = 'id, owner_id, title, capacity, price, price_unit, description, city, state, latitude, longitude, location, contact_phone, availability_status, status, created_at, updated_at'
const publicTankerFields = 'id, title, capacity, price, price_unit, description, city, state, latitude, longitude, availability_status, status, created_at, updated_at'

function friendlyError(error, action = 'load') {
  if (error?.code === '42501') return new Error('You do not have permission to manage this tanker.')
  if (error?.code === '23514') return new Error('One of the tanker details does not meet the database requirements.')
  return new Error(action === 'save' ? 'Unable to save your tanker. Please try again.' : 'Unable to load tankers. Please try again.')
}

export async function listTankers() {
  return queryAll(() => supabase.from('tankers').select(publicTankerFields).eq('status', 'ACTIVE').neq('availability_status', 'UNAVAILABLE').order('created_at', { ascending: false }).order('id'))
}

export async function getTanker(tankerId) {
  const { data, error } = await supabase.from('tankers').select(publicTankerFields).eq('id', tankerId).maybeSingle()
  if (error) throw friendlyError(error)
  return data
}

export async function getCurrentTankerProfile(tankerId) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('Authentication required')
  const searchParams = new URLSearchParams(window.location.search)
  if (searchParams.get('new') === '1') return null
  const listingId = tankerId || searchParams.get('id')
  let query = supabase.from('tankers').select(tankerFields).eq('owner_id', userData.user.id)
  if (listingId) query = query.eq('id', listingId)
  else query = query.order('created_at', { ascending: false }).limit(1)
  const { data, error } = await query.maybeSingle()
  if (error) throw friendlyError(error)
  if (listingId && !data) throw new Error('Listing not found or you do not own it.')
  return data
}

export async function saveTanker(tanker) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('Authentication required')
  const payload = { ...tanker, ...coordinatePayload(tanker), owner_id: userData.user.id, title: tanker.title.trim(), capacity: Number(tanker.capacity), price: Number(tanker.price), price_unit: tanker.price_unit.trim(), description: (tanker.description || '').trim() || null, city: tanker.city.trim(), state: tanker.state.trim(), location: (tanker.location || '').trim() || null, contact_phone: (tanker.contact_phone || '').trim() || null }
  const query = tanker.id
    ? supabase.from('tankers').update(payload).eq('id', tanker.id).eq('owner_id', userData.user.id).select(tankerFields).single()
    : supabase.from('tankers').insert(payload).select(tankerFields).single()
  const { data, error } = await query
  if (error) throw friendlyError(error, 'save')
  return data
}
