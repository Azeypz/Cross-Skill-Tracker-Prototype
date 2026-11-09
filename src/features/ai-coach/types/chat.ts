import type { Activity, LearningPlan } from '../../../types/activity'
import type { ActivityDraft } from './activityDraft'

export interface LearningContext {
  readonly activities: readonly Readonly<Activity>[]
  readonly learningPlans: readonly Readonly<LearningPlan>[]
  readonly categories?: readonly string[]
  readonly dataUnavailable?: boolean
}

export interface AgentResponse {
  kind: 'answer' | 'recommendation' | 'question' | 'draft'
  text: string
  title?: string
  draft?: ActivityDraft
}

export interface CoachMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  title?: string
  kind?: AgentResponse['kind'] | 'success' | 'error'
}
