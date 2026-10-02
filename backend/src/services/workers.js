import { getSupabaseClient } from '../config/supabase.js'

const table = () => getSupabaseClient().from('worker_profiles')

export const getWorkers = () => table().select('*').order('created_at', { ascending: false })
export const getWorker = (workerId) => table().select('*').eq('id', workerId).single()
export const createWorkerProfile = (workerProfile) => table().insert(workerProfile).select().single()
export const updateWorkerProfile = (userId, updates) => table().update(updates).eq('user_id', userId).select().single()
export const deleteWorkerProfile = (userId) => table().delete().eq('user_id', userId)