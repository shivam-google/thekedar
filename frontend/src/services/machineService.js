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
  const { data, error } = await supabase.from('machines').select(machineMarketplaceSelect).order('created_at', { ascending: false })
  if (error) throw serviceError(error)
  return Promise.all((data || []).map(resolveMachineImages))
}

export async function fetchMachineById(machineId) {
  const { data, error } = await supabase.from('machines').select(machineMarketplaceSelect).eq('id', machineId).maybeSingle()
  if (error) throw serviceError(error)
  return data ? resolveMachineImages(data) : null
}

export async function createMachine(machine) {
  const { data, error } = await supabase.from('machines').insert(machine).select(machineSelect).single()
  if (error) throw serviceError(error, 'create')
  return data
}

export async function createMachineListing(machine, files = []) {
  const createdMachine = await createMachine(machine)
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
