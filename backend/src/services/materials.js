import { getSupabaseClient } from '../config/supabase.js'

const table = () => getSupabaseClient().from('materials')

export const getMaterials = () => table().select('*').order('created_at', { ascending: false })
export const getMaterial = (materialId) => table().select('*').eq('id', materialId).single()
export const createMaterial = (material) => table().insert(material).select().single()
export const updateMaterial = (materialId, supplierId, updates) => table().update(updates).eq('id', materialId).eq('supplier_id', supplierId).select().single()
export const deleteMaterial = (materialId, supplierId) => table().delete().eq('id', materialId).eq('supplier_id', supplierId)