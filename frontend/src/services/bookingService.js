import { inclusiveDays, estimateRental } from '../utils/booking'
import { supabase } from './supabaseClient'
import { getWorker, getWorkerBookingMeta } from './workerService'
import { requestBookingNotification } from './notificationService'

const bookingSelect = `
  id,
  customer_id,
  provider_id,
  item_type,
  item_id,
  start_date,
  end_date,
  quantity,
  total_price,
  customer_note,
  provider_note,
  status,
  created_at,
  updated_at
`

const statusTransitions = {
  REQUESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
}
const serviceRequesterRoles = ['customer', 'contractor', 'worker', 'machine_owner', 'tanker_owner', 'material_supplier']

function friendlyError(error, action = 'load') {
  if (error?.code === '42501') return new Error('You do not have permission to manage this booking.')
  if (error?.code === '23514') return new Error('The booking dates or quantity are not valid.')
  if (error?.code === '23503') return new Error('The selected machine is no longer available.')
  return new Error(action === 'write' ? 'Unable to complete this action. Please try again.' : 'Unable to load bookings. Please try again.')
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Please log in to manage bookings.')
  return data.user
}

export async function createProjectBookingRequests({ cart, startDate, endDate, note = '' }) {
  const user = await requireUser()
  if (!cart?.items?.length) throw new Error('Add equipment to your project before requesting a booking.')
  if (!startDate || !endDate || endDate < startDate) throw new Error('Choose valid start and end dates.')
  if (cart.items.some((item) => item.machine?.owner_id === user.id)) throw new Error('You cannot book your own listing.')
  const invalidItem = cart.items.find((item) => item.machine?.status !== 'ACTIVE' || item.machine?.availability_status !== 'AVAILABLE' || !item.machine?.owner_id)
  if (invalidItem) throw new Error('One or more machines are no longer available.')

  const rows = cart.items.map((item) => ({
    customer_id: user.id,
    provider_id: item.machine.owner_id,
    item_type: 'MACHINE',
    item_id: item.machine.id,
    start_date: startDate,
    end_date: endDate,
    quantity: Number(item.quantity || 1),
    total_price: estimateRental(item.machine.price, item.quantity || 1, item.machine.price_unit, startDate, endDate),
    customer_note: [cart.project_name, cart.project_location, note.trim()].filter(Boolean).join(' - ') || null,
    status: 'REQUESTED',
  }))
  const { data, error } = await supabase.from('bookings').insert(rows).select(bookingSelect)
  if (error) throw friendlyError(error, 'write')
  await Promise.all((data || []).map((booking) => requestBookingNotification(booking.id)))
  return data || []
}

export async function requestWorkerBooking({ workerProfileId, startDate, endDate, quantity = 1, note = '' }) {
  const user = await requireUser()
  const { data: requester, error: requesterError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (requesterError || !serviceRequesterRoles.includes(requester?.role)) throw new Error('Your account cannot request this worker.')
  if (!startDate || !endDate || endDate < startDate) throw new Error('Choose valid start and end dates.')
  const numericQuantity = Number(quantity)
  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) throw new Error('Enter a valid quantity.')

  const worker = await getWorkerBookingMeta(workerProfileId)
  if (worker.availability_status !== 'available') throw new Error('This worker is not currently available.')
  const { data: duplicates, error: duplicateError } = await supabase.from('bookings').select('id').eq('customer_id', user.id).eq('provider_id', worker.provider_id || worker.user_id).eq('item_type', 'WORKER').eq('item_id', worker.id).in('status', ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']).limit(1)
  if (duplicateError) throw friendlyError(duplicateError)
  if (duplicates?.length) throw new Error('You already have an active request for this worker.')

  const days = inclusiveDays(startDate, endDate)
  const totalPrice = Number(worker.daily_wage) * numericQuantity * days
  const providerId = worker.provider_id || worker.user_id
  if (providerId === user.id) throw new Error('You cannot book your own listing.')
  if (!providerId) throw new Error('This worker is not currently requestable.')
  const { data, error } = await supabase.from('bookings').insert({ customer_id: user.id, provider_id: providerId, item_type: 'WORKER', item_id: worker.id, start_date: startDate, end_date: endDate, quantity: numericQuantity, total_price: totalPrice, customer_note: note.trim() || null, status: 'REQUESTED' }).select(bookingSelect).single()
  if (error) throw friendlyError(error, 'write')
  await requestBookingNotification(data.id)
  return data
}

export async function requestTankerBooking({ tankerId, startDate, endDate, quantity = 1, note = '' }) {
  const user = await requireUser()
  const { data: requester, error: requesterError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (requesterError || !serviceRequesterRoles.includes(requester?.role)) throw new Error('Your account cannot request this tanker.')
  if (!startDate || !endDate || endDate < startDate) throw new Error('Choose valid start and end dates.')
  const numericQuantity = Number(quantity)
  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) throw new Error('Enter a valid quantity.')
  const { data: tanker, error: tankerError } = await supabase.from('tankers').select('id, owner_id, price, price_unit, availability_status, status').eq('id', tankerId).maybeSingle()
  if (tankerError || !tanker) throw new Error('Tanker not found.')
  if (tanker.owner_id === user.id) throw new Error('You cannot book your own listing.')
  if (tanker.availability_status !== 'AVAILABLE' || tanker.status !== 'ACTIVE') throw new Error('This tanker is not currently available.')
  const { data: duplicates, error: duplicateError } = await supabase.from('bookings').select('id').eq('customer_id', user.id).eq('provider_id', tanker.owner_id).eq('item_type', 'TANKER').eq('item_id', tanker.id).in('status', ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']).limit(1)
  if (duplicateError) throw friendlyError(duplicateError)
  if (duplicates?.length) throw new Error('You already have an active request for this tanker.')
  const { data, error } = await supabase.from('bookings').insert({ customer_id: user.id, provider_id: tanker.owner_id, item_type: 'TANKER', item_id: tanker.id, start_date: startDate, end_date: endDate, quantity: numericQuantity, total_price: estimateRental(tanker.price, numericQuantity, tanker.price_unit, startDate, endDate), customer_note: note.trim() || null, status: 'REQUESTED' }).select(bookingSelect).single()
  if (error) throw friendlyError(error, 'write')
  await requestBookingNotification(data.id)
  return data
}

export async function requestMaterialBooking({ materialId, startDate, endDate, quantity = 1, note = '' }) {
  const user = await requireUser()
  const { data: requester } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!serviceRequesterRoles.includes(requester?.role)) throw new Error('Your account cannot request materials.')
  if (!startDate || !endDate || endDate < startDate) throw new Error('Choose valid start and end dates.')
  const numericQuantity = Number(quantity)
  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) throw new Error('Enter a valid quantity.')
  const { data: material, error: materialError } = await supabase.from('materials').select('id, supplier_id, price, quantity_available, availability_status').eq('id', materialId).maybeSingle()
  if (materialError || !material) throw new Error('Material not found.')
  if (material.supplier_id === user.id) throw new Error('You cannot book your own listing.')
  if (material.availability_status !== 'AVAILABLE' || Number(material.quantity_available) < numericQuantity) throw new Error('This material is not currently available in that quantity.')
  const { data: duplicates, error: duplicateError } = await supabase.from('bookings').select('id').eq('customer_id', user.id).eq('provider_id', material.supplier_id).eq('item_type', 'MATERIAL').eq('item_id', material.id).in('status', ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']).limit(1)
  if (duplicateError) throw friendlyError(duplicateError)
  if (duplicates?.length) throw new Error('You already have an active request for this material.')
  const { data, error } = await supabase.from('bookings').insert({ customer_id: user.id, provider_id: material.supplier_id, item_type: 'MATERIAL', item_id: material.id, start_date: startDate, end_date: endDate, quantity: numericQuantity, total_price: Number(material.price) * numericQuantity, customer_note: note.trim() || null, status: 'REQUESTED' }).select(bookingSelect).single()
  if (error) throw friendlyError(error, 'write')
  await requestBookingNotification(data.id)
  return data
}

async function getBookings(filters) {
  await requireUser()
  const query = supabase.from('bookings').select(bookingSelect).order('created_at', { ascending: false })
  const { data, error } = await filters(query)
  if (error) throw friendlyError(error)
  return data || []
}

async function attachRelatedItems(bookings) {
  const machineIds = [...new Set(bookings.filter((booking) => booking.item_type === 'MACHINE').map((booking) => booking.item_id))]
  const workerIds = [...new Set(bookings.filter((booking) => booking.item_type === 'WORKER').map((booking) => booking.item_id))]
  const tankerIds = [...new Set(bookings.filter((booking) => booking.item_type === 'TANKER').map((booking) => booking.item_id))]
  const materialIds = [...new Set(bookings.filter((booking) => booking.item_type === 'MATERIAL').map((booking) => booking.item_id))]
  const related = await Promise.all([
    machineIds.length ? supabase.from('machines').select('id, owner_id, title, machine_type, city, state, price, price_unit, availability_status, status').in('id', machineIds) : Promise.resolve({ data: [], error: null }),
    Promise.all(workerIds.map((workerId) => getWorker(workerId).catch(() => null))),
    tankerIds.length ? supabase.from('tankers').select('id, title, capacity, city, state, price, price_unit, availability_status, status').in('id', tankerIds) : Promise.resolve({ data: [], error: null }),
    materialIds.length ? supabase.from('materials').select('id, name, category, city, state, price, unit, quantity_available, availability_status').in('id', materialIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (related[0].error) throw friendlyError(related[0].error)
  const machinesById = new Map((related[0].data || []).map((machine) => [machine.id, machine]))
  const workersById = new Map(related[1].filter(Boolean).map((worker) => [worker.id, worker]))
  if (related[2].error) throw friendlyError(related[2].error)
  const tankersById = new Map((related[2].data || []).map((tanker) => [tanker.id, tanker]))
  if (related[3].error) throw friendlyError(related[3].error)
  const materialsById = new Map((related[3].data || []).map((material) => [material.id, material]))
  return bookings.map((booking) => ({ ...booking, machine: machinesById.get(booking.item_id) || null, worker: workersById.get(booking.item_id) || null, tanker: tankersById.get(booking.item_id) || null, material: materialsById.get(booking.item_id) || null }))
}

export async function getMyBookings() {
  const user = await requireUser()
  return attachRelatedItems(await getBookings((query) => query.eq('customer_id', user.id)))
}

export async function getIncomingBookings() {
  const user = await requireUser()
  return attachRelatedItems(await getBookings((query) => query.eq('provider_id', user.id)))
}

export async function getBooking(bookingId) {
  await requireUser()
  const { data, error } = await supabase.from('bookings').select(bookingSelect).eq('id', bookingId).maybeSingle()
  if (error) throw friendlyError(error)
  if (!data) return null
  return (await attachRelatedItems([data]))[0]
}

async function updateBookingStatus(booking, nextStatus, providerNote) {
  if (!booking || !statusTransitions[booking.status]?.includes(nextStatus)) throw new Error('This booking cannot move to that status.')
  const updates = { status: nextStatus }
  if (providerNote !== undefined) updates.provider_note = providerNote || null
  const { data, error } = await supabase.from('bookings').update(updates).eq('id', booking.id).select(bookingSelect).single()
  if (error) throw friendlyError(error, 'write')
  await requestBookingNotification(data.id)
  return data
}

export const acceptBooking = (booking, note) => updateBookingStatus(booking, 'ACCEPTED', note)
export const rejectBooking = (booking, note) => updateBookingStatus(booking, 'REJECTED', note)
export const startBooking = (booking) => updateBookingStatus(booking, 'IN_PROGRESS')
export const completeBooking = (booking) => updateBookingStatus(booking, 'COMPLETED')
export const cancelBooking = (booking) => updateBookingStatus(booking, 'CANCELLED')
