import type { ActivityDraft } from './activityDraft'
import type { LearningPlanDraft } from './learningPlanDraft'

export type AgentIntent =
  | 'GET_RECENT_ACTIVITIES'
  | 'GET_NEXT_RECOMMENDATION'
  | 'CREATE_ACTIVITY'
  | 'CREATE_LEARNING_PLAN'
  | 'UNKNOWN'

export type AgentWorkflowStep =
  | 'DETECTING_INTENT'
  | 'READING_CONTEXT'
  | 'COLLECTING_INFORMATION'
  | 'VALIDATING'
  | 'AWAITING_CONFIRMATION'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'

export type AgentResponseType =
  | 'MESSAGE'
  | 'FOLLOW_UP'
  | 'RECOMMENDATION'
  | 'CONFIRMATION_REQUIRED'
  | 'SUCCESS'
  | 'ERROR'

export type PendingAgentAction =
  | {
      actionId: string
      type: 'CREATE_ACTIVITY'
      payload: ActivityDraft
    }
  | {
      actionId: string
      type: 'CREATE_LEARNING_PLAN'
      payload: LearningPlanDraft
    }

export interface AgentWorkflowState {
  workflowId: string
  intent: AgentIntent
  step: AgentWorkflowStep
  collectedFields: Record<string, unknown>
  missingFields: string[]
  validationErrors: string[]
  pendingAction?: PendingAgentAction
  createdAt: string
  updatedAt: string
}

export interface AgentRequestOptions {
  conversationId: string
  idempotencyKey: string
  workflowState?: AgentWorkflowState
}