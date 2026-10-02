import { Router } from 'express'
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js'
import { createMachineImageSignedUrl } from '../services/machineImages.js'

const router = Router()
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

router.get('/machines/:machineId/images/:imageId/signed-url', requireSupabaseUser, async (request, response) => {
  const { machineId, imageId } = request.params
  if (!uuidPattern.test(machineId) || !uuidPattern.test(imageId)) {
    return response.status(400).json({ success: false, message: 'Invalid machine or image identifier' })
  }

  try {
    const result = await createMachineImageSignedUrl({ machineId, imageId, userId: request.supabaseUser.id })
    if (result.kind === 'not_found') return response.status(404).json({ success: false, message: 'Machine image not found' })
    if (result.kind === 'forbidden') return response.status(403).json({ success: false, message: 'Image access denied' })
    return response.json({ success: true, image: { signedUrl: result.signedUrl, machineId: result.machineId, imageId: result.imageId, expiresIn: result.expiresIn } })
  } catch {
    return response.status(502).json({ success: false, message: 'Unable to generate image URL' })
  }
})

export default router
