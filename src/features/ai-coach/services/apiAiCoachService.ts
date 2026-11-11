import type { AiCoachService } from './aiCoachService'
import { MockAiCoachService } from './mockAiCoachService'
import { agentResponseSchema } from '../types/apiContract'
import type { AgentResponse, LearningContext } from '../types/chat'
import type { ActivityDraft } from '../types/activityDraft'
import type { AgentRequestOptions } from '../types/agentWorkflow'

export class AiCoachApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AiCoachApiError'
    this.status = status
  }
}

export class ApiAiCoachService implements AiCoachService {
  private readonly baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  async sendMessage(
    message: string,
    context: LearningContext,
    draft?: ActivityDraft,
    options?: AgentRequestOptions,
  ): Promise<AgentResponse> {
    const requestOptions = options ?? {
      conversationId: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
    }
    const url = this.baseUrl
      ? new URL('/api/ai-coach/message', this.baseUrl)
      : '/api/ai-coach/message'
    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, draft, ...requestOptions }),
      })
    } catch {
      throw new AiCoachApiError('AI Coach API is unavailable.')
    }

    if (!response.ok) {
      throw new AiCoachApiError(
        `AI Coach API returned HTTP ${response.status}.`,
        response.status,
      )
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new AiCoachApiError('AI Coach API returned invalid JSON.', 502)
    }
    const parsed = agentResponseSchema.safeParse(payload)
    if (!parsed.success)
      throw new AiCoachApiError('AI Coach API returned an invalid response.', 502)
    return parsed.data
  }
}

export class FallbackAiCoachService implements AiCoachService {
  private readonly api: AiCoachService
  private readonly fallback: AiCoachService

  constructor(
    api: AiCoachService,
    fallback: AiCoachService = new MockAiCoachService(),
  ) {
    this.api = api
    this.fallback = fallback
  }

  async sendMessage(
    message: string,
    context: LearningContext,
    draft?: ActivityDraft,
    options?: AgentRequestOptions,
  ): Promise<AgentResponse> {
    try {
      return await this.api.sendMessage(message, context, draft, options)
    } catch (error) {
      if (error instanceof AiCoachApiError && error.status && error.status < 500)
        throw error
      const response = await this.fallback.sendMessage(message, context, draft, options)
      return {
        ...response,
        text: `Using the local mock fallback because the AI Coach API is unavailable.\n\n${response.text}`,
      }
    }
  }
}