import express, { type ErrorRequestHandler } from 'express'
import aiCoachRouter from './aiCoachRoute.ts'

const app = express()
app.use(express.json({ limit: '256kb' }))
app.get('/', (_request, response) => {
  response.status(200).json({
    service: 'Productivity Log API',
    status: 'running',
    health: '/health',
    version: '1.0.0',
  })
})
app.get('/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'productivity-log-api',
  })
})
app.use('/api/ai-coach', aiCoachRouter)

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const errorType =
    typeof error === 'object' && error !== null && 'type' in error
      ? error.type
      : undefined
  if (errorType === 'entity.parse.failed')
    return response.status(400).json({ error: 'Request body must be valid JSON.' })
  if (errorType === 'entity.too.large')
    return response.status(413).json({ error: 'Request body is too large.' })
  return response.status(500).json({ error: 'Internal server error.' })
}

app.use(errorHandler)

const port = Number(process.env.PORT ?? 3000)
app.listen(port, '127.0.0.1', () => {
  console.info(`Productivity Log API listening on http://127.0.0.1:${port}`)
})