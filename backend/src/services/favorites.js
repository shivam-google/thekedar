import { getSupabaseClient } from '../config/supabase.js'

const table = () => getSupabaseClient().from('favorites')

export const getMyFavorites = (userId) => table().select('*').eq('user_id', userId).order('created_at', { ascending: false })
export const addFavorite = (favorite) => table().insert(favorite).select().single()
export const removeFavorite = (userId, itemType, itemId) => table().delete().eq('user_id', userId).eq('item_type', itemType).eq('item_id', itemId)