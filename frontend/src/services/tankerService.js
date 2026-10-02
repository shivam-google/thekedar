import { supabase } from './supabaseClient'

const tankerFields = 'id, owner_id, title, capacity, price, price_unit, description, city, state, location, contact_phone, availability_status, status, created_at, updated_at'
const publicTankerFields = 'id, title, capacity, price, price_unit, description, city, state, availability_status, status, created_at, updated_at'

function friendlyError(error, action = 'load') {
  if (error?.code === '42501') return new Error('You do not have permission to manage this tanker.')
  if (error?.code === '23514') return new Error('One of the tanker details does not meet the database requirements.')
  return new Error(action === 'save' ? 'Unable to save your tanker. Please try again.' : 'Unable to load tankers. Please try again.')
}

export async function listTankers(filters = {}) {
  const search = (filters.search || '').replace(/[(),*]/g, ' ').replace(/\s+/g, ' ').trim()
  let query = supabase.from('tankers').select(publicTankerFields).order(filters.sort === 'price' ? 'price' : 'created_at', { ascending: filters.sort === 'price' })
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`)
  if (filters.city) query = query.eq('city', filters.city)
  if (filters.state) query = query.eq('state', filters.state)
  if (filters.availability) query = query.eq('availability_status', filters.availability)
  if (filters.minPrice) query = query.gte('price', Number(filters.minPrice))
  if (filters.maxPrice) query = query.lte('price', Number(filters.maxPrice))
  const { data, error } = await query
  if (error) throw friendlyError(error)
  return data || []
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
  return data
}

export async function saveTanker(tanker) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('Authentication required')
  const payload = { ...tanker, owner_id: userData.user.id, title: tanker.title.trim(), capacity: Number(tanker.capacity), price: Number(tanker.price), price_unit: tanker.price_unit.trim(), description: tanker.description.trim() || null, city: tanker.city.trim(), state: tanker.state.trim(), location: tanker.location.trim() || null, contact_phone: tanker.contact_phone.trim() || null }
  const query = tanker.id
    ? supabase.from('tankers').update(payload).eq('id', tanker.id).eq('owner_id', userData.user.id).select(tankerFields).single()
    : supabase.from('tankers').insert(payload).select(tankerFields).single()
  const { data, error } = await query
  if (error) throw friendlyError(error, 'save')
  return data
}
