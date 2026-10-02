import { supabase } from './supabaseClient'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export async function getMachineImageUrl(machineId, imageId) {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) return null

  try {
    const response = await fetch(`${apiBaseUrl}/api/machines/${machineId}/images/${imageId}/signed-url`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) return null
    const result = await response.json()
    return result.image?.signedUrl || null
  } catch {
    return null
  }
}

export async function resolveMachineImages(machine) {
  const images = machine?.machine_images || []
  const resolvedImages = await Promise.all(images.map(async (image) => ({
    ...image,
    image_url: await getMachineImageUrl(machine.id, image.id),
  })))
  return { ...machine, machine_images: resolvedImages.filter((image) => image.image_url) }
}
