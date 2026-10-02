import { supabase } from './supabaseClient'

import { apiBaseUrl } from './apiConfig'

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

  if (error) throw error
  return data
}

export async function updateProfile(updates) {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) throw new Error('Please log in to update your profile.')

  const payload = {}
  if (Object.hasOwn(updates, 'full_name')) {
    const fullName = updates.full_name.trim()
    if (fullName.length < 2 || fullName.length > 120) throw new Error('Name must be between 2 and 120 characters.')
    payload.full_name = fullName
  }
  for (const field of ['phone', 'city', 'state', 'address', 'bio', 'profile_image']) {
    if (Object.hasOwn(updates, field)) payload[field] = updates[field]?.trim() || null
  }
  if (!Object.keys(payload).length) throw new Error('There are no profile changes to save.')

  const { data, error } = await supabase.from('profiles')
    .update(payload)
    .eq('id', authData.user.id)
    .select('id, full_name, email, phone, role, profile_image, city, state, address, bio, is_verified, created_at, updated_at')
    .single()
  if (error?.code === '42501') throw new Error('You do not have permission to update this profile.')
  if (error) throw new Error('Unable to save your profile. Please try again.')
  return data
}

export async function uploadProfileImage(file) {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) throw new Error('Please log in to update your profile image.')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file?.type)) throw new Error('Choose a JPG, PNG, or WebP image.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile images must be 5 MB or smaller.')

  const userId = authData.user.id
  const { data: current, error: currentError } = await supabase.from('profiles').select('profile_image').eq('id', userId).maybeSingle()
  if (currentError || !current) throw new Error('Unable to load your profile image.')

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabase.storage.from('profile-images').upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw new Error('Unable to upload your profile image.')

  try {
    const profile = await updateProfile({ profile_image: path })
    const oldPath = current.profile_image
    if (oldPath?.startsWith(`${userId}/`) && oldPath !== path) {
      await supabase.storage.from('profile-images').remove([oldPath])
    }
    return profile
  } catch (error) {
    await supabase.storage.from('profile-images').remove([path])
    throw error
  }
}

export async function getProfileImageUrl() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Authentication required.')
  const response = await fetch(`${apiBaseUrl}/api/profiles/me/image-url`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error('Unable to load your profile image.')
  const result = await response.json()
  return result.signedUrl || null
}

export async function createProfile({ id, fullName, email, phone, role }) {
  const { data, error } = await supabase.from('profiles').upsert({
    id,
    full_name: fullName,
    email,
    phone,
    role,
  }).select().single()

  if (error) throw error
  return data
}