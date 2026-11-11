import type { AgentResponse } from '../types/chat'
import type {
  AgentIntent,
  AgentResponseType,
  AgentWorkflowState,
  PendingAgentAction,
} from '../types/agentWorkflow'
import { looksLikeActivity } from './mockDraftCollection'
import { isLearningPlanIntent } from './learningPlanGeneration'

export function detectAgentIntent(
  message: string,
  hasActivityDraft = false,
  hasLearningPlanDraft = false,
): AgentIntent {
  const prompt = message.trim().toLowerCase().replace(/[?!.]+$/, '')
  if (
    /^(?:what should i learn next|what milestone should i do next|what should i focus on)$/.test(
      prompt,
    )
  )
    return 'GET_NEXT_RECOMMENDATION'
  if (prompt === 'show my recent learning activity')
    return 'GET_RECENT_ACTIVITIES'
  if (hasActivityDraft || looksLikeActivity(message)) return 'CREATE_ACTIVITY'
  if (hasLearningPlanDraft || isLearningPlanIntent(message))
    return 'CREATE_LEARNING_PLAN'
  return 'UNKNOWN'
}

function responseType(response: AgentResponse): AgentResponseType {
  if (response.kind === 'error') return 'ERROR'
  if (response.kind === 'success') return 'SUCCESS'
  if (response.kind === 'question') return 'FOLLOW_UP'
  if (response.kind === 'recommendation') return 'RECOMMENDATION'
  if (
    response.kind === 'draft' ||
    response.kind === 'activity-draft' ||
    response.kind === 'learning-plan-draft'
  )
    return 'CONFIRMATION_REQUIRED'
  return 'MESSAGE'
}

export function advanceAgentWorkflow(
  message: string,
  response: AgentResponse,
  previous?: AgentWorkflowState,
  options?: { workflowId?: string; now?: Date },
): AgentWorkflowState {
  const intent = detectAgentIntent(
    message,
    Boolean(response.draft),
    Boolean(response.learningPlanDraft),
  )
  const continues =
    previous?.intent === intent &&
    !['COMPLETED', 'CANCELLED', 'FAILED'].includes(previous.step)
  const now = options?.now ?? new Date()
  const timestamp = now.toISOString()
  const activityAction: PendingAgentAction | undefined =
    response.draft &&
    (response.kind === 'draft' || response.kind === 'activity-draft')
      ? {
          actionId: response.draft.id,
          type: 'CREATE_ACTIVITY',
          payload: response.draft,
        }
      : undefined
  const learningPlanAction: PendingAgentAction | undefined =
    response.learningPlanDraft
      ? {
          actionId: response.learningPlanDraft.id,
          type: 'CREATE_LEARNING_PLAN',
          payload: response.learningPlanDraft,
        }
      : undefined
  const pendingAction = activityAction ?? learningPlanAction
  const intentFields = response.draft
    ? Object.fromEntries(
        Object.entries(response.draft).filter(
          ([key, value]) => key !== 'id' && key !== 'awaitingFields' && value !== undefined,
        ),
      )
    : response.learningPlanDraft
      ? {
          skill: response.learningPlanDraft.skill,
          category: response.learningPlanDraft.category,
          goal: response.learningPlanDraft.goal,
          targetDate: response.learningPlanDraft.startDate,
        }
      : {}
  const missingFields = response.draft?.awaitingFields ??
    (response.kind === 'question' && intent === 'CREATE_LEARNING_PLAN'
      ? ['targetSkill']
      : [])
  const validationErrors = response.validationErrors ?? []
  const step = response.kind === 'error'
    ? 'FAILED'
    : response.kind === 'question'
      ? 'COLLECTING_INFORMATION'
      : pendingAction
        ? 'AWAITING_CONFIRMATION'
        : 'COMPLETED'

  return {
    workflowId:
      continues
        ? previous.workflowId
        : options?.workflowId ?? crypto.randomUUID(),
    intent,
    step,
    collectedFields: {
      ...(continues ? previous.collectedFields : {}),
      ...intentFields,
    },
    missingFields,
    validationErrors,
    pendingAction,
    createdAt: continues ? previous.createdAt : timestamp,
    updatedAt: timestamp,
  }
}

export function initialAgentWorkflowState(): AgentWorkflowState {
  const now = new Date().toISOString()
  return {
    workflowId: crypto.randomUUID(),
    intent: 'UNKNOWN',
    step: 'DETECTING_INTENT',
    collectedFields: {},
    missingFields: [],
    validationErrors: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function transitionAgentWorkflow(
  state: AgentWorkflowState,
  step: AgentWorkflowState['step'],
): AgentWorkflowState {
  return {
    ...state,
    step,
    pendingAction:
      step === 'CANCELLED' || step === 'COMPLETED'
        ? undefined
        : state.pendingAction,
    updatedAt: new Date().toISOString(),
  }
}

export function workflowResponseType(response: AgentResponse) {
  return responseType(response)
}