import { Router } from 'express'
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js'
import { getOwnProfileImageSignedUrl } from '../services/profileImages.js'

const router = Router()

router.get('/profiles/me/image-url', requireSupabaseUser, async (request, response) => {
  try {
    const signedUrl = await getOwnProfileImageSignedUrl(request.supabaseUser.id)
    return response.json({ success: true, signedUrl })
  } catch {
    return response.status(502).json({ success: false, message: 'Unable to load profile image' })
  }
})

export default router