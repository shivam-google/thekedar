import { supabase } from './supabaseClient'
import { resolveMachineImages } from './machineImageService'

const cartSelect = `
  id,
  user_id,
  project_name,
  project_description,
  project_location,
  city,
  state,
  status,
  created_at,
  updated_at,
  project_cart_items (
    id,
    cart_id,
    item_type,
    item_id,
    quantity,
    start_date,
    end_date,
    price,
    created_at,
    machines (
      id,
      owner_id,
      title,
      machine_type,
      brand,
      model,
      price,
      price_unit,
      location,
      city,
      state,
      availability_status,
      status,
      machine_images (id, image_url, storage_path, created_at)
    )
  )
`

function friendlyError(error, action = 'load') {
  if (error?.code === '42501') return new Error('You do not have permission to access this project.')
  if (error?.code === '23503') return new Error('This machine is no longer available to add.')
  return new Error(action === 'write' ? 'Unable to update your project. Please try again.' : 'Unable to load your project. Please try again.')
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Please log in to manage your project.')
  return data.user
}

async function hydrateCart(cart) {
  if (!cart) return null
  const items = await Promise.all((cart.project_cart_items || []).map(async (item) => ({ ...item, machine: item.machines ? await resolveMachineImages(item.machines) : null })))
  return { ...cart, items }
}

export async function getActiveProjectCart() {
  const user = await requireUser()
  const { data, error } = await supabase.from('project_carts').select(cartSelect).eq('user_id', user.id).eq('status', 'ACTIVE').order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (error) throw friendlyError(error)
  return hydrateCart(data)
}

async function ensureActiveProjectCart(user) {
  const existing = await getActiveProjectCart()
  if (existing) return existing
  const { data, error } = await supabase.from('project_carts').insert({ user_id: user.id, project_name: 'My Project', status: 'ACTIVE' }).select(cartSelect).single()
  if (error) throw friendlyError(error, 'write')
  return hydrateCart(data)
}

export async function addMachineToCart(machine) {
  if (!machine?.id) throw new Error('A machine is required.')
  const user = await requireUser()
  if (machine.status !== 'ACTIVE' || machine.availability_status === 'UNAVAILABLE') throw new Error('This machine is not currently available.')
  const cart = await ensureActiveProjectCart(user)
  const existing = cart.items.find((item) => item.item_type === 'MACHINE' && item.item_id === machine.id)
  if (existing) {
    const { error } = await supabase.from('project_cart_items').update({ quantity: Number(existing.quantity || 1) + 1, price: Number(machine.price) }).eq('id', existing.id).eq('cart_id', cart.id)
    if (error) throw friendlyError(error, 'write')
  } else {
    const { error } = await supabase.from('project_cart_items').insert({ cart_id: cart.id, item_type: 'MACHINE', item_id: machine.id, quantity: 1, price: Number(machine.price) })
    if (error) throw friendlyError(error, 'write')
  }
  return getActiveProjectCart()
}

export async function removeCartItem(itemId) {
  const cart = await getActiveProjectCart()
  if (!cart || !cart.items.some((item) => item.id === itemId)) throw new Error('Project item not found.')
  const { error } = await supabase.from('project_cart_items').delete().eq('id', itemId).eq('cart_id', cart.id)
  if (error) throw friendlyError(error, 'write')
  return getActiveProjectCart()
}

export async function clearProjectCart() {
  const cart = await getActiveProjectCart()
  if (!cart) return null
  const { error } = await supabase.from('project_cart_items').delete().eq('cart_id', cart.id)
  if (error) throw friendlyError(error, 'write')
  return getActiveProjectCart()
}
