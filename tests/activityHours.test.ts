import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { activityHoursError, formatActivityHours, validActivityHours } from '../src/data/activityHours'
import { activityRepository, activityStorageKey } from '../src/data/activityRepository'
import type { Activity, LearningPlan, NewActivityInput } from '../src/types/activity'
import type { ActivityDraft } from '../src/features/ai-coach/types/activityDraft'
import { validateActivityDraft, toActivityInput } from '../src/features/ai-coach/services/draftValidation'
import { collectActivityDraft } from '../src/features/ai-coach/services/mockDraftCollection'
import { advanceAgentWorkflow, workflowResponseType } from '../src/features/ai-coach/services/agentWorkflow'
import { agentResponseSchema, aiCoachRequestSchema } from '../src/features/ai-coach/types/apiContract'
import ActivityConfirmationCard from '../src/features/ai-coach/components/ActivityConfirmationCard'

const plan: LearningPlan = {
  id: 'hours-test-plan', name: 'Azure Certification', status: 'Not Started', category: 'Cloud', milestones: [],
}
const context = {
  activities: [], learningPlans: [plan], categories: ['Cloud'],
  completedLearningPlans: [], eligibleLearningPlans: [plan],
}
const draft: ActivityDraft = {
  id: 'draft', date: '2026-11-11', learningPlan: plan.name,
  activity: 'Azure networking', category: 'Cloud', status: 'In Progress',
  learned: 'Reviewed networking', blockers: 'None', nextStep: 'Practice routing',
}
const input: NewActivityInput = {
  date: draft.date!, learningPlanId: plan.id, newLearningPlanName: '',
  milestoneId: '', title: draft.activity!, category: 'Cloud', newCategoryName: '',
  status: 'In Progress', reflection: { learning: '', blockers: '', nextStep: '' },
}
const validHours = [undefined, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.25, 3, 4.5, 8, 9, 24]
const invalidHours = [0, -1, 25, 1.1, NaN, Infinity]

test('optional hours accept quarter-hours and reject invalid supplied values', () => {
  for (const hours of validHours) {
    assert.equal(validActivityHours(hours), true, String(hours))
    assert.deepEqual(validateActivityDraft({ ...draft, hours }, context), [])
    assert.equal(toActivityInput({ ...draft, hours }, context).hours, hours)
  }
  for (const hours of invalidHours) {
    assert.equal(validActivityHours(hours), false, String(hours))
    assert.equal(validateActivityDraft({ ...draft, hours }, context)[0]?.field, 'hours')
    assert.throws(() => toActivityInput({ ...draft, hours }, context))
  }
  assert.equal(formatActivityHours(undefined), '\u2014')
  assert.equal(formatActivityHours(2), '2 hours')
  assert.equal(formatActivityHours(1.5), '1.5 hours')
})

test('repository saves omitted hours, rejects invalid hours, and preserves legacy hours', () => {
  const storage = new Map<string, string>()
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } },
  })
  try {
    const legacy: Activity = {
      id: 'legacy', ...input, hours: 1.1, milestoneId: null,
    }
    storage.set(activityStorageKey, JSON.stringify({
      version: 1, activities: [legacy], customLearningPlans: [plan],
      customCategories: [], milestoneProgress: {},
    }))
    for (const hours of validHours) {
      const saved = activityRepository.saveActivity({ ...input, hours })
      assert.equal(saved.activities[0].hours, hours)
      const loaded = activityRepository.load()
      assert.equal(loaded.activities[0].hours, hours)
      if (hours === undefined) assert.equal('hours' in loaded.activities[0], false)
      assert.equal(loaded.activities.find((activity) => activity.id === 'legacy')?.hours, 1.1)
    }
    const before = storage.get(activityStorageKey)
    for (const hours of invalidHours)
      assert.throws(() => activityRepository.saveActivity({ ...input, hours }), {
        message: activityHoursError,
      })
    assert.equal(storage.get(activityStorageKey), before)
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})

test('Coach accepts a completed draft without hours and extracts supplied hours', () => {
  const response = collectActivityDraft(
    'Add an activity for Azure Certification. I reviewed Azure networking today.',
    context, draft,
  )
  assert.equal(response.kind, 'draft')
  assert.equal(response.draft?.hours, undefined)
  assert.deepEqual(response.draft?.awaitingFields, [])
  assert.equal(toActivityInput(response.draft!, context).hours, undefined)
  const supplied = collectActivityDraft('I studied Azure for 2 hours.', context, draft)
  assert.equal(supplied.draft?.hours, 2)
  const blank = collectActivityDraft('Hours:', context, { ...draft, hours: 2 })
  assert.equal(blank.draft?.hours, undefined)
  const partial = collectActivityDraft('Add an activity for Azure Certification. I reviewed Azure networking today.', context)
  assert.ok(!partial.draft?.awaitingFields?.includes('hours'))
  assert.ok(!partial.text.includes('hours'))
})

test('API request and confirmation response accept activities and drafts without hours', () => {
  const activity: Activity = {
    id: 'saved', date: input.date, title: input.title, learningPlanId: plan.id,
    milestoneId: null, category: input.category, status: input.status,
    reflection: input.reflection,
  }
  const request = {
    message: 'Review my activity', conversationId: 'conversation', idempotencyKey: 'request',
    context: { ...context, activities: [activity] }, draft,
  }
  assert.equal(aiCoachRequestSchema.safeParse(request).success, true)
  assert.equal(aiCoachRequestSchema.safeParse({
    ...request, context: { ...context, activities: [{ ...activity, hours: 1.1 }] },
  }).success, true)
  const result = collectActivityDraft('Review', context, draft)
  const workflowState = advanceAgentWorkflow('Review', result)
  assert.equal(agentResponseSchema.safeParse({
    ...result, message: result.text, intent: workflowState.intent,
    responseType: workflowResponseType(result), workflowState,
    pendingAction: workflowState.pendingAction,
  }).success, true)
})

test('Coach confirmation shows Not provided and retains Confirm & Save', () => {
  const markup = renderToStaticMarkup(createElement(ActivityConfirmationCard, {
    draft, context, stage: 'ready', isSending: false, isSaving: false,
    onCancel() {}, onEdit() {}, onChange() {}, onReview() {}, async onConfirm() {},
  }))
  assert.ok(markup.includes('Not provided'))
  assert.ok(markup.includes('Confirm &amp; Save'))
  assert.ok(!markup.includes('0 hours'))
})