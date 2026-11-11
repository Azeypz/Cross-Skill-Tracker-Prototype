import { useRef, useState } from 'react'
import type { AiCoachService } from '../services/aiCoachService'
import type { CoachMessage, LearningContext } from '../types/chat'
import type {
  Activity,
  NewActivityInput,
  NewLearningPlanInput,
} from '../../../types/activity'
import type { ActivityDraft, DraftStage } from '../types/activityDraft'
import type { LearningPlanDraft } from '../types/learningPlanDraft'
import type { AgentWorkflowState } from '../types/agentWorkflow'
import { learningPlanDraftSchema } from '../types/apiContract'
import {
  isLearningPlanIntent,
  updateLearningPlanSchedule,
} from '../services/learningPlanGeneration'
import {
  toActivityInput,
  validateActivityDraft,
} from '../services/draftValidation'
import {
  advanceAgentWorkflow,
  detectAgentIntent,
  initialAgentWorkflowState,
} from '../services/agentWorkflow'

export function useAiCoach(
  service: AiCoachService,
  context: LearningContext,
  onSaveActivity: (input: NewActivityInput) => Activity | Promise<Activity>,
  onSaveLearningPlan: (input: NewLearningPlanInput) => void | Promise<void>,
) {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! What would you like to explore in your learning?',
    },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<ActivityDraft>()
  const [draftStage, setDraftStage] = useState<DraftStage>('collecting')
  const [learningPlanDraft, setLearningPlanDraft] =
    useState<LearningPlanDraft>()
  const [learningPlanDraftStage, setLearningPlanDraftStage] =
    useState<DraftStage>('collecting')
  const [isSaving, setIsSaving] = useState(false)
  const [workflowState, setWorkflowState] = useState(initialAgentWorkflowState)
  const workflowStateRef = useRef<AgentWorkflowState>(workflowState)
  const conversationId = useRef(crypto.randomUUID())
  const retryMessage = useRef<
    { text: string; idempotencyKey: string } | undefined
  >(undefined)
  const sending = useRef(false)
  const saving = useRef(false)
  const requestId = useRef(0)
  const savedDrafts = useRef(new Set<string>())
  const savedLearningPlanDrafts = useRef(new Set<string>())
  const pendingLearningPlanRequest = useRef<string | undefined>(undefined)

  function updateWorkflow(
    step: AgentWorkflowState['step'],
    changes: Partial<AgentWorkflowState> = {},
  ) {
    const updated = {
      ...workflowStateRef.current,
      ...changes,
      step,
      updatedAt: new Date().toISOString(),
    }
    workflowStateRef.current = updated
    setWorkflowState(updated)
  }

  async function sendMessage(message = input) {
    const text = message.trim()
    if (
      !text ||
      sending.current ||
      saving.current ||
      draftStage === 'editing' ||
      learningPlanDraftStage === 'editing'
    )
      return
    const request = ++requestId.current
    const idempotencyKey =
      retryMessage.current?.text === text
        ? retryMessage.current.idempotencyKey
        : crypto.randomUUID()
    retryMessage.current = { text, idempotencyKey }
    sending.current = true
    setIsSending(true)
    setError('')
    setInput(text)
    updateWorkflow('DETECTING_INTENT', {
      intent: detectAgentIntent(
        text,
        Boolean(draft),
        Boolean(learningPlanDraft),
      ),
      pendingAction: undefined,
    })
    updateWorkflow('READING_CONTEXT')
    if (draft) setDraftStage('collecting')
    setMessages((previous) => {
      const last = previous[previous.length - 1]
      if (last?.role === 'user' && last.text === text) return previous
      return [...previous, { id: crypto.randomUUID(), role: 'user', text }]
    })
    try {
      const requestMessage = pendingLearningPlanRequest.current
        ? `${pendingLearningPlanRequest.current}\nThe target skill is ${text}.`
        : text
      const response = await service.sendMessage(requestMessage, context, draft, {
        conversationId: conversationId.current,
        idempotencyKey,
        workflowState: workflowStateRef.current,
      })
      if (request !== requestId.current) return
      const nextWorkflow = response.workflowState ??
        advanceAgentWorkflow(
          requestMessage,
          response,
          workflowStateRef.current,
        )
      workflowStateRef.current = nextWorkflow
      setWorkflowState(nextWorkflow)
      retryMessage.current = undefined
      if (response.kind === 'learning-plan-draft') {
        pendingLearningPlanRequest.current = undefined
        setLearningPlanDraft(response.learningPlanDraft)
        setLearningPlanDraftStage('ready')
      } else if (response.draft) {
        setDraft(response.draft)
        setDraftStage(
          response.kind === 'draft' || response.kind === 'activity-draft'
            ? 'ready'
            : 'collecting',
        )
      } else setDraftStage(draftStage)
      if (response.kind === 'question' && isLearningPlanIntent(requestMessage))
        pendingLearningPlanRequest.current = requestMessage
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response.text,
          title: response.title,
          kind: response.kind,
        },
      ])
      setInput('')
    } catch {
      if (request !== requestId.current) return
      if (draft) setDraftStage('collecting')
      updateWorkflow('FAILED')
      setError(
        'The coach is unavailable right now. Your message is kept. Please try again or use Add Activity.',
      )
    } finally {
      if (request === requestId.current) {
        sending.current = false
        setIsSending(false)
      }
    }
  }

  function cancelDraft() {
    if (saving.current) return
    ++requestId.current
    sending.current = false
    setIsSending(false)
    setDraft(undefined)
    setDraftStage('collecting')
    setError('')
    setInput('')
    updateWorkflow('CANCELLED', { pendingAction: undefined })
    retryMessage.current = undefined
    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'Activity draft cancelled. Nothing was saved.',
      },
    ])
  }

  function editDraft() {
    if (sending.current || saving.current) return
    setDraftStage('editing')
    setError('')
    updateWorkflow('COLLECTING_INFORMATION', { pendingAction: undefined })
  }

  function updateDraft(changes: Partial<Omit<ActivityDraft, 'id'>>) {
    if (draftStage !== 'editing' || saving.current) return
    setDraft((previous) =>
      previous ? { ...previous, ...changes, id: previous.id } : previous,
    )
    setError('')
    updateWorkflow('COLLECTING_INFORMATION', {
      pendingAction: undefined,
      validationErrors: [],
    })
  }

  function reviewDraft() {
    if (!draft || saving.current) return
    updateWorkflow('VALIDATING')
    const issues = validateActivityDraft(draft, context)
    if (issues.length) {
      setError(issues[0].message)
      updateWorkflow('COLLECTING_INFORMATION', {
        missingFields: issues.map((issue) => issue.field),
        validationErrors: issues.map((issue) => issue.message),
        pendingAction: undefined,
      })
      return
    }
    setDraftStage('ready')
    setError('')
    updateWorkflow('AWAITING_CONFIRMATION', {
      missingFields: [],
      validationErrors: [],
      pendingAction: {
        actionId: draft.id,
        type: 'CREATE_ACTIVITY',
        payload: draft,
      },
    })
  }

  async function confirmDraft() {
    if (
      !draft ||
      draftStage !== 'ready' ||
      sending.current ||
      saving.current ||
      savedDrafts.current.has(draft.id)
    )
      return
    saving.current = true
    setIsSaving(true)
    setError('')
    try {
      const input = toActivityInput(draft, context)
      input.idempotencyKey = draft.id
      updateWorkflow('EXECUTING')
      const savedActivity = await onSaveActivity(input)
      if (savedActivity.id !== draft.id)
        throw new Error('The saved activity could not be verified by its ID.')
      savedDrafts.current.add(draft.id)
      setDraft(undefined)
      setDraftStage('collecting')
      updateWorkflow('COMPLETED', { pendingAction: undefined })
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          kind: 'success',
          text: 'Activity added successfully.',
        },
      ])
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Activity was not saved. Please try again.',
      )
      updateWorkflow('FAILED', {
        pendingAction: {
          actionId: draft.id,
          type: 'CREATE_ACTIVITY',
          payload: draft,
        },
      })
    } finally {
      saving.current = false
      setIsSaving(false)
    }
  }

  function cancelLearningPlanDraft() {
    if (saving.current) return
    ++requestId.current
    sending.current = false
    setIsSending(false)
    setLearningPlanDraft(undefined)
    setLearningPlanDraftStage('collecting')
    pendingLearningPlanRequest.current = undefined
    setError('')
    updateWorkflow('CANCELLED', { pendingAction: undefined })
    retryMessage.current = undefined
    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'Learning plan draft cancelled. Nothing was saved.',
      },
    ])
  }

  function editLearningPlanDraft() {
    if (sending.current || saving.current) return
    setLearningPlanDraftStage('editing')
    setError('')
    updateWorkflow('COLLECTING_INFORMATION', { pendingAction: undefined })
  }

  function updateLearningPlanDraft(
    changes: Partial<Omit<LearningPlanDraft, 'id'>>,
  ) {
    if (learningPlanDraftStage !== 'editing' || saving.current) return
    setLearningPlanDraft((previous) => {
      if (!previous) return previous
      if (
        'durationWeeks' in changes ||
        'studyDaysPerWeek' in changes ||
        'hoursPerStudyDay' in changes ||
        'skill' in changes
      )
        return updateLearningPlanSchedule(previous, changes)
      return { ...previous, ...changes, id: previous.id }
    })
    setError('')
    updateWorkflow('COLLECTING_INFORMATION', { pendingAction: undefined })
  }

  function reviewLearningPlanDraft() {
    if (!learningPlanDraft || saving.current) return
    updateWorkflow('VALIDATING')
    const parsed = learningPlanDraftSchema.safeParse(learningPlanDraft)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Review the learning plan details.')
      updateWorkflow('COLLECTING_INFORMATION', {
        validationErrors: parsed.error.issues.map((issue) => issue.message),
      })
      return
    }
    setLearningPlanDraft(parsed.data)
    setLearningPlanDraftStage('ready')
    setError('')
    updateWorkflow('AWAITING_CONFIRMATION', {
      validationErrors: [],
      pendingAction: {
        actionId: parsed.data.id,
        type: 'CREATE_LEARNING_PLAN',
        payload: parsed.data,
      },
    })
  }

  async function confirmLearningPlanDraft() {
    if (
      !learningPlanDraft ||
      learningPlanDraftStage !== 'ready' ||
      sending.current ||
      saving.current ||
      savedLearningPlanDrafts.current.has(learningPlanDraft.id)
    )
      return
    const parsed = learningPlanDraftSchema.safeParse(learningPlanDraft)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'The learning plan is invalid.')
      return
    }
    saving.current = true
    setIsSaving(true)
    setError('')
    updateWorkflow('EXECUTING')
    try {
      const endDate = new Date(`${parsed.data.startDate}T00:00:00.000Z`)
      endDate.setUTCDate(endDate.getUTCDate() + parsed.data.durationWeeks * 7)
      const input: NewLearningPlanInput = {
        name: parsed.data.title,
        description: [
          parsed.data.goal,
          `${parsed.data.durationWeeks} weeks · ${parsed.data.studyDaysPerWeek} days per week · ${parsed.data.hoursPerStudyDay} hours per study day · ${parsed.data.totalEstimatedHours} total hours`,
        ].join('\n\n'),
        targetSkill: parsed.data.skill,
        targetCompletionDate: endDate.toISOString().slice(0, 10),
        category: parsed.data.category,
        milestones: parsed.data.weeklyPlans.flatMap((week) =>
          week.activities.map((activity, index) => ({
            id: `${parsed.data.id}-${week.weekNumber}-${index + 1}`,
            title: `Week ${week.weekNumber}: ${activity.title}`,
            required: true,
          })),
        ),
      }
      await onSaveLearningPlan(input)
      savedLearningPlanDrafts.current.add(parsed.data.id)
      setLearningPlanDraft(undefined)
      setLearningPlanDraftStage('collecting')
      updateWorkflow('COMPLETED', { pendingAction: undefined })
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          kind: 'success',
          text: 'Learning plan saved successfully. Progress starts at 0%.',
        },
      ])
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Learning plan was not saved. Please try again.',
      )
      updateWorkflow('FAILED', {
        pendingAction: {
          actionId: parsed.data.id,
          type: 'CREATE_LEARNING_PLAN',
          payload: parsed.data,
        },
      })
    } finally {
      saving.current = false
      setIsSaving(false)
    }
  }

  return {
    messages,
    workflowState,
    input,
    setInput,
    isSending,
    error,
    sendMessage,
    draft,
    draftStage,
    isSaving,
    cancelDraft,
    editDraft,
    updateDraft,
    reviewDraft,
    confirmDraft,
    learningPlanDraft,
    learningPlanDraftStage,
    cancelLearningPlanDraft,
    editLearningPlanDraft,
    updateLearningPlanDraft,
    reviewLearningPlanDraft,
    confirmLearningPlanDraft,
  }
}
