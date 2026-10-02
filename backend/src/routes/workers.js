import { Router } from 'express'
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js'
import { getPublicWorker, listPublicWorkers } from '../services/workerMarketplace.js'

const router = Router()
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const allowedAvailability = new Set(['available', 'unavailable', 'working'])

router.get('/workers', requireSupabaseUser, async (request, response) => {
  const { search = '', skill = '', city = '', state = '', availability = '', sort = 'newest' } = request.query
  if (availability && !allowedAvailability.has(availability)) return response.status(400).json({ success: false, message: 'Invalid availability filter' })
  if (sort !== 'newest' && sort !== 'experience') return response.status(400).json({ success: false, message: 'Invalid sort option' })

  try {
    const workers = await listPublicWorkers({ search, skill, city, state, availability, sort })
    return response.json({ success: true, workers })
  } catch {
    return response.status(500).json({ success: false, message: 'Unable to load workers' })
  }
})

router.get('/workers/:id', requireSupabaseUser, async (request, response) => {
  if (!uuidPattern.test(request.params.id)) return response.status(404).json({ success: false, message: 'Worker not found' })
  try {
    const worker = await getPublicWorker(request.params.id)
    if (!worker) return response.status(404).json({ success: false, message: 'Worker not found' })
    return response.json({ success: true, worker })
  } catch {
    return response.status(500).json({ success: false, message: 'Unable to load worker' })
  }
})

export default router
