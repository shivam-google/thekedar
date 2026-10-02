import cors from 'cors'
import express from 'express'
import { getSupabaseClient } from './config/supabase.js'
import machineImagesRouter from './routes/machineImages.js'
import notificationsRouter from './routes/notifications.js'
import profileImagesRouter from './routes/profileImages.js'
import reviewsRouter from './routes/reviews.js'
import workersRouter from './routes/workers.js'

const app = express()

app.disable('x-powered-by')
const allowedOrigins = new Set((process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean))
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)), credentials: false }))
app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Cache-Control', 'no-store')
  next()
})
app.use(express.json({ limit: '100kb' }))
app.use('/api', machineImagesRouter)
app.use('/api', notificationsRouter)
app.use('/api', profileImagesRouter)
app.use('/api', reviewsRouter)
app.use('/api', workersRouter)

app.get('/api/health', (_request, response) => {
  response.json({
    success: true,
    message: 'Thekedar API is running',
  })
})

app.get('/api/health/db', async (_request, response) => {
  try {
    const { error } = await getSupabaseClient()
      .from('profiles')
      .select('id', { head: true, count: 'exact' })

    if (error) {
      throw error
    }

    response.json({
      success: true,
      message: 'Database connection successful',
    })
  } catch (error) {
    const isConfigurationError = error instanceof Error && error.message.startsWith('Missing required environment variable:')

    response.status(isConfigurationError ? 500 : 503).json({
      success: false,
      message: isConfigurationError ? error.message : 'Database connection failed',
    })
  }
})

app.use('/api', (_request, response) => response.status(404).json({ success: false, message: 'API route not found' }))

export default app
