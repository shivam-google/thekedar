import { getSupabaseAdminClient } from '../config/supabase.js'

const signedUrlLifetime = 300

export async function getOwnProfileImageSignedUrl(userId) {
  const admin = getSupabaseAdminClient()
  const { data: profile, error } = await admin.from('profiles')
    .select('profile_image')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  if (!profile?.profile_image) return null

  const path = profile.profile_image
  const segments = path.split('/')
  if (segments.length !== 2 || segments[0] !== userId || !segments[1] || segments[1] === '.' || segments[1] === '..') {
    throw new Error('Invalid profile image path')
  }

  const { data, error: signedUrlError } = await admin.storage
    .from('profile-images')
    .createSignedUrl(path, signedUrlLifetime)
  if (signedUrlError || !data?.signedUrl) throw new Error('Unable to sign profile image')
  return data.signedUrl
}