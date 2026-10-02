import { getSupabaseAdminClient } from '../config/supabase.js'

const signedUrlLifetime = 300

export async function createMachineImageSignedUrl({ machineId, imageId, userId, client }) {
  const admin = client || getSupabaseAdminClient()
  const { data: machine, error: machineError } = await admin
    .from('machines')
    .select('id, owner_id, status, availability_status')
    .eq('id', machineId)
    .maybeSingle()

  if (machineError) throw new Error('Unable to verify machine access')
  if (!machine) return { kind: 'not_found' }

  const isOwner = machine.owner_id === userId
  const publiclyVisible = machine.status === 'ACTIVE' && machine.availability_status !== 'UNAVAILABLE'
  if (!isOwner && !publiclyVisible) {
    if (!userId) return { kind: 'forbidden' }
    const { data: profile, error } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
    if (error) throw new Error('Unable to verify image access')
    if (profile?.role !== 'admin') return { kind: 'forbidden' }
  }

  const { data: image, error: imageError } = await admin
    .from('machine_images')
    .select('id, machine_id, storage_path')
    .eq('id', imageId)
    .eq('machine_id', machineId)
    .maybeSingle()

  if (imageError) throw new Error('Unable to verify image access')
  if (!image) return { kind: 'not_found' }
  if (!image.storage_path?.startsWith(`${machineId}/`)) return { kind: 'forbidden' }

  const { data: signedImage, error: signedUrlError } = await admin
    .storage
    .from('machine-images')
    .createSignedUrl(image.storage_path, signedUrlLifetime)

  if (signedUrlError || !signedImage?.signedUrl) throw new Error('Unable to generate image URL')

  return {
    kind: 'success',
    signedUrl: signedImage.signedUrl,
    machineId,
    imageId,
    expiresIn: signedUrlLifetime,
  }
}
