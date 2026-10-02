import { queryAll } from './queryAll'
import { coordinatePayload } from '../utils/location'
import { supabase } from './supabaseClient'
import { resolveMachineImages } from './machineImageService'

const machineSelect = `
  id,
  owner_id,
  title,
  machine_type,
  brand,
  model,
  description,
  price,
  price_unit,
  location,
  city,
  latitude,
  longitude,
  state,
  operator_available,
  delivery_available,
  contact_phone,
  availability_status,
  status,
  created_at,
  updated_at,
  machine_images (id, image_url, storage_path, created_at)
`

const machineMarketplaceSelect = `
  id,
  title,
  machine_type,
  brand,
  model,
  description,
  price,
  price_unit,
  city,
  latitude,
  longitude,
  state,
  operator_available,
  delivery_available,
  availability_status,
  status,
  created_at,
  updated_at,
  machine_images (id)
`

const serviceError = (error, action = 'load') => {
  if (error?.code === '42501') return new Error('You do not have permission to manage this machine.')
  if (error?.code === '23505') return new Error('This machine listing already exists.')
  if (error?.code === '23514') return new Error('One of the machine details does not meet the database requirements.')
  if (error?.code === '23503') return new Error('Your owner profile is not ready for machine listings.')
  return new Error(action === 'create' ? 'Unable to save this machine. Please try again.' : 'Unable to load equipment. Please try again.')
}

export async function fetchMachines() {
  const data = await queryAll(() => supabase.from('machines').select(machineMarketplaceSelect).eq('status', 'ACTIVE').neq('availability_status', 'UNAVAILABLE').order('created_at', { ascending: false }).order('id'))
  return Promise.all((data || []).map(resolveMachineImages))
}

export async function fetchMachineById(machineId) {
  const { data, error } = await supabase.from('machines').select(machineMarketplaceSelect).eq('id', machineId).maybeSingle()
  if (error) throw serviceError(error)
  return data ? resolveMachineImages(data) : null
}

export async function createMachine(machine) {
  const { data, error } = await supabase.from('machines').insert({ ...machine, ...coordinatePayload(machine) }).select(machineSelect).single()
  if (error) throw serviceError(error, 'create')
  return data
}

export async function createMachineListing(machine, files = []) {
  validateImages(files)
  const createdMachine = await createMachine(machine)
  return attachMachineImages(createdMachine, files)
}

function validateImages(files, existingCount = 0) {
  if (existingCount + files.length > 5) throw new Error('A machine can have up to five images.')
  if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) throw new Error('Choose JPG, PNG, or WebP images up to 5 MB each.')
}

export async function getOwnedMachine(id) {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Please log in to edit this machine.')
  const { data, error } = await supabase.from('machines').select(machineSelect).eq('id', id).eq('owner_id', auth.user.id).single()
  if (error) throw new Error('Machine not found or you do not own it.')
  return data
}

export async function updateMachineListing(id, machine, files = []) {
  const existing = await getOwnedMachine(id)
  validateImages(files, existing.machine_images?.length || 0)
  const { owner_id: _owner, status: _status, ...details } = machine
  const { data, error } = await supabase.from('machines').update({ ...details, ...coordinatePayload(machine) }).eq('id', id).eq('owner_id', existing.owner_id).select(machineSelect).single()
  if (error) throw serviceError(error, 'create')
  return attachMachineImages(data, files)
}

async function attachMachineImages(createdMachine, files) {
  if (!files.length) return createdMachine

  const bucket = supabase.storage.from('machine-images')
  const uploadedPaths = []
  const imageRows = []

  try {
    for (const file of files) {
      const storagePath = `${createdMachine.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
      const { error: uploadError } = await bucket.upload(storagePath, file, { contentType: file.type, upsert: false })
      if (uploadError) throw new Error('Image upload failed. The machine was saved; please retry the images from its details page.')
      uploadedPaths.push(storagePath)

      const { data: signedImage, error: signedUrlError } = await bucket.createSignedUrl(storagePath, 3600)
      if (signedUrlError || !signedImage?.signedUrl) throw new Error('The image uploaded, but its preview URL could not be created. The machine was saved; please retry the images from its details page.')
      imageRows.push({ machine_id: createdMachine.id, image_url: signedImage.signedUrl, storage_path: storagePath })
    }

    const { error: imageRowError } = await supabase.from('machine_images').insert(imageRows)
    if (imageRowError) throw new Error('The machine was saved, but its images could not be attached. Please retry the images from its details page.')
    return fetchMachineById(createdMachine.id)
  } catch (error) {
    if (uploadedPaths.length) await bucket.remove(uploadedPaths)
    error.machineId = createdMachine.id
    throw error
  }
}
