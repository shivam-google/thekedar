import cors from 'cors'
import express from 'express'
import { getSupabaseClient } from './config/supabase.js'
import machineImagesRouter from './routes/machineImages.js'
import notificationsRouter from './routes/notifications.js'
import profileImagesRouter from './routes/profileImages.js'
import reviewsRouter from './routes/reviews.js'
import workersRouter from './routes/workers.js'

const app = express()

app.use(cors())
app.use(express.json())
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

export default app
