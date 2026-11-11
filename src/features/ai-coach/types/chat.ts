import type { Activity, LearningPlan } from '../../../types/activity'
import type { ActivityDraft } from './activityDraft'
import type { LearningPlanDraft } from './learningPlanDraft'
import type {
  AgentIntent,
  AgentResponseType,
  AgentWorkflowState,
  PendingAgentAction,
} from './agentWorkflow'

export interface LearningContext {
  readonly activities: readonly Readonly<Activity>[]
  readonly learningPlans: readonly Readonly<LearningPlan>[]
  readonly completedLearningPlans?: readonly Readonly<LearningPlan>[]
  readonly eligibleLearningPlans?: readonly Readonly<LearningPlan>[]
  readonly categories?: readonly string[]
  readonly dataUnavailable?: boolean
}

type AgentResponseContent =
  | {
      kind: 'chat' | 'answer' | 'recommendation' | 'success' | 'error'
      text: string
      title?: string
      draft?: never
      learningPlanDraft?: never
    }
  | {
      kind: 'question'
      text: string
      title?: string
      draft?: ActivityDraft
      learningPlanDraft?: never
    }
  | {
      kind: 'activity-draft' | 'draft'
      text: string
      title?: string
      draft: ActivityDraft
      learningPlanDraft?: never
    }
  | {
      kind: 'learning-plan-draft'
      text: string
      title?: string
      learningPlanDraft: LearningPlanDraft
      draft?: never
    }

export type AgentResponse = AgentResponseContent & {
  message?: string
  intent?: AgentIntent
  responseType?: AgentResponseType
  workflowState?: AgentWorkflowState
  pendingAction?: PendingAgentAction
  validationErrors?: string[]
}

export interface CoachMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  title?: string
  kind?: AgentResponse['kind'] | 'success' | 'error'
}
