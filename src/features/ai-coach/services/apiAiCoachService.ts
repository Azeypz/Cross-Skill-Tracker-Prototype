import type { AiCoachService } from './aiCoachService'
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

const workflowFields = new Set(['workflowState', 'pendingAction'])

function safeServerMessage(payload: unknown) {
  if (typeof payload !== 'object' || payload === null || !('error' in payload))
    return ''
  const error = (payload as { error: unknown }).error
  return typeof error === 'string' ? error.slice(0, 200) : ''
}

export class ApiAiCoachService implements AiCoachService {
  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(baseUrl = '', timeoutMs = 15_000) {
    this.baseUrl = baseUrl
    this.timeoutMs = timeoutMs
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
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError')
        throw new AiCoachApiError('Coach API request timed out.')
      throw new AiCoachApiError('Coach API could not be reached.')
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      payload = undefined
    }

    if (!response.ok) {
      const detail = safeServerMessage(payload)
      throw new AiCoachApiError(
        `Coach API request failed: HTTP ${response.status}${detail ? ` (${detail})` : ''}`,
        response.status,
      )
    }
    if (payload === undefined)
      throw new AiCoachApiError('Coach API returned invalid JSON.', response.status)

    const parsed = agentResponseSchema.safeParse(payload)
    if (!parsed.success) {
      const workflowIssue = parsed.error.issues.every((issue) =>
        workflowFields.has(String(issue.path[0])),
      )
      throw new AiCoachApiError(
        workflowIssue
          ? 'Coach workflow validation failed.'
          : 'Coach response validation failed.',
        response.status,
      )
    }
    return parsed.data
  }
}
