import { getSupabaseClient } from '../config/supabase.js'

const table = () => getSupabaseClient().from('machines')

export const getMachines = () => table().select('*, machine_images(*)').order('created_at', { ascending: false })
export const getMachine = (machineId) => table().select('*, machine_images(*)').eq('id', machineId).single()
export const createMachine = (machine) => table().insert(machine).select().single()
export const updateMachine = (machineId, ownerId, updates) => table().update(updates).eq('id', machineId).eq('owner_id', ownerId).select().single()
export const deleteMachine = (machineId, ownerId) => table().delete().eq('id', machineId).eq('owner_id', ownerId)