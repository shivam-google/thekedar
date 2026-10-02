import { Router } from 'express'
import { getPublicReviews } from '../services/reviews.js'

const router = Router()
const itemTypes = new Set(['WORKER', 'MACHINE', 'TANKER', 'MATERIAL'])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

router.get('/ratings/:itemType/:itemId', async (request, response) => {
  const { itemType, itemId } = request.params
  if (!itemTypes.has(itemType) || !uuidPattern.test(itemId)) {
    return response.status(400).json({ success: false, message: 'Invalid marketplace item' })
  }

  try {
    const reviews = await getPublicReviews(itemType, itemId)
    return response.json({ success: true, reviews })
  } catch {
    return response.status(500).json({ success: false, message: 'Unable to load ratings' })
  }
})

export default router