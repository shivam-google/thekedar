import { getSupabaseClient } from '../config/supabase.js'

const carts = () => getSupabaseClient().from('project_carts')
const items = () => getSupabaseClient().from('project_cart_items')

export const getMyProjectCarts = (userId) => carts().select('*, project_cart_items(*)').eq('user_id', userId).order('created_at', { ascending: false })
export const createProjectCart = (cart) => carts().insert(cart).select().single()
export const updateProjectCart = (cartId, userId, updates) => carts().update(updates).eq('id', cartId).eq('user_id', userId).select().single()
export const deleteProjectCart = (cartId, userId) => carts().delete().eq('id', cartId).eq('user_id', userId)
export const addProjectCartItem = (item) => items().insert(item).select().single()
export const updateProjectCartItem = (itemId, cartId, updates) => items().update(updates).eq('id', itemId).eq('cart_id', cartId).select().single()
export const removeProjectCartItem = (itemId, cartId) => items().delete().eq('id', itemId).eq('cart_id', cartId)