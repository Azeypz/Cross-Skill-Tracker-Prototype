import type { AgentResponse, LearningContext } from '../types/chat'
import type { ActivityDraft } from '../types/activityDraft'

export interface AiCoachService {
  sendMessage(
    message: string,
    context: LearningContext,
    draft?: ActivityDraft,
  ): Promise<AgentResponse>
}
