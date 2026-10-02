import { getSupabaseClient } from '../config/supabase.js'

const table = () => getSupabaseClient().from('tankers')

export const getTankers = () => table().select('*').order('created_at', { ascending: false })
export const getTanker = (tankerId) => table().select('*').eq('id', tankerId).single()
export const createTanker = (tanker) => table().insert(tanker).select().single()
export const updateTanker = (tankerId, ownerId, updates) => table().update(updates).eq('id', tankerId).eq('owner_id', ownerId).select().single()
export const deleteTanker = (tankerId, ownerId) => table().delete().eq('id', tankerId).eq('owner_id', ownerId)