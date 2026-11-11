import type { AgentResponse, LearningContext } from '../types/chat'
import type { ActivityDraft } from '../types/activityDraft'
import type { AgentRequestOptions } from '../types/agentWorkflow'

export interface AiCoachService {
  sendMessage(
    message: string,
    context: LearningContext,
    draft?: ActivityDraft,
    options?: AgentRequestOptions,
  ): Promise<AgentResponse>
}
