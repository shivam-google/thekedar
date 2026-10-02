import { getSupabaseClient } from '../config/supabase.js'

export async function requireSupabaseUser(request, response, next) {
  const authorization = request.headers.authorization || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''

  if (!token) {
    return response.status(401).json({ success: false, message: 'Unauthorized' })
  }

  try {
    const { data, error } = await getSupabaseClient().auth.getUser(token)
    if (error || !data.user) return response.status(401).json({ success: false, message: 'Unauthorized' })
    request.supabaseUser = data.user
    return next()
  } catch {
    return response.status(401).json({ success: false, message: 'Unauthorized' })
  }
}
