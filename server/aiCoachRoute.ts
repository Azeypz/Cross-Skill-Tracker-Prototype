import { Router } from 'express'
import { MockAiCoachService } from '../src/features/ai-coach/services/mockAiCoachService.ts'
import {
  agentResponseSchema,
  aiCoachRequestSchema,
} from '../src/features/ai-coach/types/apiContract.ts'
import { advanceAgentWorkflow, workflowResponseType } from '../src/features/ai-coach/services/agentWorkflow.ts'
import { validateActivityDraft } from '../src/features/ai-coach/services/draftValidation.ts'

const router = Router()
const mockAiCoachService = new MockAiCoachService()
const idempotencyCache = new Map<
  string,
  { expiresAt: number; response: Record<string, unknown> }
>()
const cacheDurationMs = 10 * 60 * 1000
const maximumCachedResponses = 256

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

  const cacheKey = `${parsedRequest.data.conversationId}:${parsedRequest.data.idempotencyKey}`
  const cached = idempotencyCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now())
    return response.status(200).json(cached.response)
  if (cached) idempotencyCache.delete(cacheKey)

  try {
    const result = await mockAiCoachService.sendMessage(
      parsedRequest.data.message,
      parsedRequest.data.context,
      parsedRequest.data.draft,
    )
    const validatedResult = result.draft
      ? {
          ...result,
          validationErrors: validateActivityDraft(
            result.draft,
            parsedRequest.data.context,
          ).map((issue) => issue.message),
        }
      : result
    const workflowState = advanceAgentWorkflow(
      parsedRequest.data.message,
      validatedResult,
      parsedRequest.data.workflowState,
    )
    const responseBody = {
      ...validatedResult,
      message: validatedResult.text,
      intent: workflowState.intent,
      responseType: workflowResponseType(validatedResult),
      workflowState,
      pendingAction: workflowState.pendingAction,
    }
    const parsedResponse = agentResponseSchema.safeParse(responseBody)
    if (!parsedResponse.success)
      return response.status(500).json({ error: 'Invalid AI Coach response.' })
    const serializedResponse = parsedResponse.data as unknown as Record<string, unknown>
    idempotencyCache.set(cacheKey, {
      expiresAt: Date.now() + cacheDurationMs,
      response: serializedResponse,
    })
    if (idempotencyCache.size > maximumCachedResponses) {
      const oldestKey = idempotencyCache.keys().next().value
      if (oldestKey) idempotencyCache.delete(oldestKey)
    }
    return response.status(200).json(serializedResponse)
  } catch {
    return response.status(500).json({ error: 'AI Coach service failed.' })
  }
})

export default router