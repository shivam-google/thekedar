import { getSupabaseClient } from '../config/supabase.js'

const table = () => getSupabaseClient().from('profiles')

export const getMyProfile = (userId) => table().select('*').eq('id', userId).single()
export const updateMyProfile = (userId, updates) => table().update(updates).eq('id', userId).select().single()