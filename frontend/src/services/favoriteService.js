import { supabase } from './supabaseClient'
import { getWorker } from './workerService'

async function requireUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Please log in to manage favorites.')
  return data.user
}

export async function getFavorite(itemType, itemId) {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .maybeSingle()
  if (error) throw new Error('Unable to check this favorite.')
  return Boolean(data)
}

export async function addFavorite(itemType, itemId) {
  const user = await requireUser()
  const { error } = await supabase.from('favorites').upsert({
    user_id: user.id,
    item_type: itemType,
    item_id: itemId,
  }, { onConflict: 'user_id,item_type,item_id', ignoreDuplicates: true })
  if (error) throw new Error('Unable to save this favorite.')
}

export async function removeFavorite(itemType, itemId) {
  const user = await requireUser()
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('item_type', itemType)
    .eq('item_id', itemId)
  if (error) throw new Error('Unable to remove this favorite.')
}

async function resolveFavorite(favorite) {
  try {
    let item
    let href
    switch (favorite.item_type) {
      case 'MACHINE': {
        const { data: machine, error } = await supabase.from('machines')
          .select('id, title, machine_type, city, state, price, price_unit')
          .eq('id', favorite.item_id)
          .maybeSingle()
        if (error) throw error
        item = machine && {
          title: machine.title,
          subtitle: machine.machine_type,
          location: [machine.city, machine.state].filter(Boolean).join(', '),
          price: machine.price,
          unit: machine.price_unit,
        }
        href = `/machines/${favorite.item_id}`
        break
      }
      case 'WORKER': {
        const worker = await getWorker(favorite.item_id)
        item = worker && {
          title: worker.display_name,
          subtitle: worker.skill,
          location: [worker.city, worker.state].filter(Boolean).join(', '),
        }
        href = `/workers/${favorite.item_id}`
        break
      }
      case 'TANKER': {
        const { data: tanker, error } = await supabase.from('tankers')
          .select('id, title, capacity, price, price_unit, city, state')
          .eq('id', favorite.item_id)
          .maybeSingle()
        if (error) throw error
        item = tanker && {
          title: tanker.title,
          subtitle: `${Number(tanker.capacity).toLocaleString('en-IN')} capacity`,
          location: [tanker.city, tanker.state].filter(Boolean).join(', '),
          price: tanker.price,
          unit: tanker.price_unit,
        }
        href = `/tankers/${favorite.item_id}`
        break
      }
      case 'MATERIAL': {
        const { data: material, error } = await supabase.from('materials')
          .select('id, name, category, city, state, price, unit')
          .eq('id', favorite.item_id)
          .maybeSingle()
        if (error) throw error
        item = material && {
          title: material.name,
          subtitle: material.category,
          location: [material.city, material.state].filter(Boolean).join(', '),
          price: material.price,
          unit: material.unit,
        }
        href = `/materials/${favorite.item_id}`
        break
      }
      default:
        return { ...favorite, item: null, href: '/' }
    }
    return { ...favorite, item: item || null, href }
  } catch {
    const paths = { MACHINE: 'machines', WORKER: 'workers', TANKER: 'tankers', MATERIAL: 'materials' }
    return { ...favorite, item: null, href: `/${paths[favorite.item_type] || ''}/${favorite.item_id}` }
  }
}

export async function getMyFavoriteItems() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('favorites')
    .select('id, item_type, item_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Unable to load your favorites.')
  return Promise.all((data || []).map(resolveFavorite))
}