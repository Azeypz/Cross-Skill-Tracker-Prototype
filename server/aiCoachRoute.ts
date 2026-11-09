import { Router } from 'express'
import { MockAiCoachService } from '../src/features/ai-coach/services/mockAiCoachService.ts'
import {
  agentResponseSchema,
  aiCoachRequestSchema,
} from '../src/features/ai-coach/types/apiContract.ts'

const router = Router()
const mockAiCoachService = new MockAiCoachService()

router.post('/message', async (request, response) => {
  const parsedRequest = aiCoachRequestSchema.safeParse(request.body)
  if (!parsedRequest.success) {
    return response.status(400).json({
      error: 'Invalid AI Coach request.',
      issues: parsedRequest.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }

  try {
    const result = await mockAiCoachService.sendMessage(
      parsedRequest.data.message,
      parsedRequest.data.context,
      parsedRequest.data.draft,
    )
    const parsedResponse = agentResponseSchema.safeParse(result)
    if (!parsedResponse.success)
      return response.status(500).json({ error: 'Invalid AI Coach response.' })
    return response.status(200).json(parsedResponse.data)
  } catch {
    return response.status(500).json({ error: 'AI Coach service failed.' })
  }
})

export default router