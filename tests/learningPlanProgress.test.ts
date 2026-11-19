import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  activityCatalog, activityRepository, activityStorageKey, initialActivityData,
  learningPlanProgress,
} from '../src/data/activityRepository'
import type { Activity, LearningPlan, NewActivityInput } from '../src/types/activity'
import { MockAiCoachService } from '../src/features/ai-coach/services/mockAiCoachService'
import { aiCoachRequestSchema } from '../src/features/ai-coach/types/apiContract'
import LearningPlans from '../src/pages/LearningPlans'

const plan: LearningPlan = {
  id: 'plan', name: 'Example', status: 'In Progress', plannedHours: 5, milestones: [
    { id: 'a', title: 'First', required: true, status: 'Not Started', estimatedHours: 1 },
    { id: 'b', title: 'Second', required: true, status: 'Not Started', estimatedHours: 1.5 },
    { id: 'c', title: 'Third', required: true, status: 'Not Started', estimatedHours: 2.5 },
  ],
}
function activity(id: string, milestoneId: string | null, status: Activity['status'], learningPlanId = 'plan'): Activity {
  return {
    id, milestoneId, status, learningPlanId, date: '2026-11-12', title: id,
    category: 'Cloud', hours: 9, reflection: { learning: '', blockers: '', nextStep: '' },
  }
}

test('progress counts completed planned hours once per milestone within the plan', () => {
  const first = activity('1', 'a', 'Completed')
  const second = activity('2', 'b', 'Completed')
  const third = activity('3', 'c', 'Completed')
  assert.equal(learningPlanProgress(plan, []), 0)
  assert.equal(learningPlanProgress(plan, [first]), 20)
  assert.equal(learningPlanProgress(plan, [first, second]), 50)
  assert.equal(learningPlanProgress(plan, [first, second, third]), 100)
  assert.equal(learningPlanProgress({ ...plan, plannedHours: 2 }, [first, second, third]), 100)
  assert.equal(learningPlanProgress({
    ...plan, plannedHours: 0.3,
    milestones: [{ ...plan.milestones[0], estimatedHours: 0.1 }, { ...plan.milestones[1], estimatedHours: 0.2 }],
  }, [first, second]), 100)
  assert.equal(learningPlanProgress(plan, [
    first, activity('duplicate', 'a', 'Completed'), activity('in-progress', 'b', 'In Progress'),
    activity('other-plan', 'b', 'Completed', 'other'), activity('free-text', null, 'Completed'),
  ]), 20)
  assert.equal(learningPlanProgress({ ...plan, plannedHours: undefined }, [first]), undefined)
  assert.equal(learningPlanProgress({ ...plan, milestones: [{ ...plan.milestones[0], estimatedHours: undefined }] }, [first]), 0)
})

test('planned hours persist, update after completion and deletion, and support custom milestones', () => {
  const storage = new Map<string, string>([[activityStorageKey, JSON.stringify({
    version: 1, ...initialActivityData(), customLearningPlans: [plan],
  })]])
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } },
  })
  try {
    activityRepository.savePlanStatus('azure', 'In Progress')
    activityRepository.savePlanStatus('plan', 'Completed')
    const changed = activityRepository.savePlanHours({
      planId: 'plan', plannedHours: 5, milestoneHours: { a: 1, b: 1.5, c: 2.5 },
      newMilestone: { title: 'Extra', estimatedHours: 1 },
    })
    assert.equal(activityCatalog(changed).learningPlans.find((p) => p.id === 'plan')?.milestones.length, 4)
    const input: NewActivityInput = {
      date: '2026-11-12', learningPlanId: 'plan', newLearningPlanName: '', milestoneId: 'a',
      title: '', category: 'Cloud', newCategoryName: '', status: 'Completed',
      reflection: { learning: '', blockers: '', nextStep: '' },
    }
    activityRepository.saveActivity(input)
    const loaded = activityRepository.load()
    const loadedPlan = activityCatalog(loaded).learningPlans.find((p) => p.id === 'plan')!
    assert.equal(loadedPlan.status, 'Completed')
    assert.equal(activityCatalog(loaded).learningPlans.find((p) => p.id === 'azure')?.status, 'In Progress')
    assert.equal(learningPlanProgress(loadedPlan, loaded.activities), 20)
    const deleted = activityRepository.deleteActivity(loaded.activities[0].id)
    assert.equal(learningPlanProgress(activityCatalog(deleted).learningPlans.find((p) => p.id === 'plan')!, deleted.activities), 0)
    assert.equal(activityRepository.load().planHours?.plan.plannedHours, 5)
    assert.throws(() => activityRepository.savePlanHours({ planId: 'plan', plannedHours: 0, milestoneHours: {} }), /greater than zero/)
    assert.throws(() => activityRepository.savePlanHours({ planId: 'plan', milestoneHours: { foreign: 1 } }), /does not belong/)
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})

test('legacy plans default in place; creation and status edits validate before saving', (t) => {
  const legacy = { id: 'legacy', name: 'AWS Learning Plan', milestones: [], status: 'Unavailable' }
  let saved = JSON.stringify({ version: 1, ...initialActivityData(), customLearningPlans: [legacy] })
  t.after(() => Reflect.deleteProperty(globalThis, 'window'))
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: { getItem: () => saved, setItem: (_: string, value: string) => { saved = value } },
  } })
  const plans = () => activityCatalog(activityRepository.load()).learningPlans
  assert.ok(plans().every((p) => p.status === 'Not Started'))
  activityRepository.savePlanStatus(legacy.id, 'In Progress')
  assert.deepEqual(plans().find((p) => p.id === legacy.id), { ...legacy, plannedHours: undefined, status: 'In Progress' })
  const input = { name: 'New plan', description: '', targetSkill: '', targetCompletionDate: '' }
  const before = saved
  // @ts-expect-error Invalid runtime input must not overwrite saved data.
  assert.throws(() => activityRepository.saveLearningPlan({ ...input, status: 'Unavailable' }), /valid learning plan status/)
  // @ts-expect-error Invalid runtime input must not overwrite saved data.
  assert.throws(() => activityRepository.savePlanStatus('azure', 'Unavailable'), /valid learning plan status/)
  assert.equal(saved, before)
  activityRepository.saveLearningPlan({ ...input, status: 'Completed' })
  assert.equal(plans().find((p) => p.name === input.name)?.status, 'Completed')
})

test('Coach prioritizes active plans, falls back to unstarted plans, and retains completed plans as history', async () => {
  const coach = new MockAiCoachService()
  const next = async (learningPlans: LearningPlan[]) =>
    (await coach.sendMessage('What should I learn next?', { activities: [], learningPlans })).text
  const completed = { ...plan, id: 'done', name: 'Finished', status: 'Completed' } as const
  const upcoming = { ...plan, id: 'next', name: 'Upcoming', status: 'Not Started' } as const
  assert.match(await next([completed, upcoming, plan]), /Learning plan: Example/)
  assert.match(await next([completed, upcoming]), /Learning plan: Upcoming/)
  assert.match(await next([completed]), /learning history: Finished/)
})

test('Coach gives target guidance from recorded completion and planned estimates', async () => {
  const activities = [activity('1', 'a', 'Completed'), activity('2', 'b', 'In Progress')]
  const context = { activities, learningPlans: [plan], completedLearningPlans: [], eligibleLearningPlans: [plan] }
  assert.equal(aiCoachRequestSchema.safeParse({ message: 'How do I reach 50% for Example?', conversationId: 'c', idempotencyKey: 'k', context }).success, true)
  const coach = new MockAiCoachService()
  const response = await coach.sendMessage('How do I reach 50% progress for Example?', context)
  assert.match(response.text, /1.5 more completed planned hours/)
  assert.match(response.text, /Second \(1.5 planned hours\)/)
  assert.doesNotMatch(response.text, /First \(1 planned hours\)/)
  const unavailable = await coach.sendMessage('How do I reach 50% progress for Example?', {
    ...context, learningPlans: [{ ...plan, plannedHours: undefined }],
  })
  assert.match(unavailable.text, /Set total planned hours/)
  const missing = await coach.sendMessage('How do I reach 100% progress for Example?', {
    ...context, learningPlans: [{ ...plan, milestones: plan.milestones.map((m) => ({ ...m, estimatedHours: undefined })) }],
  })
  assert.match(missing.text, /no estimate/)
})

test('Learning Plans table shows compact statuses, progress bars and planned hours', () => {
  const markup = renderToStaticMarkup(createElement(LearningPlans, {
    learningPlans: [plan, { ...plan, id: 'empty', name: 'No estimate', plannedHours: undefined }],
    activities: [activity('1', 'a', 'Completed'), activity('2', 'b', 'Completed')],
    customPlanIds: [],
    onSaveHours() {},
    onSaveStatus() {},
  }))
  assert.match(markup, /<select aria-label="Status for Example"[^>]*status-in-progress/)
  assert.match(markup, /<option selected="">In Progress<\/option>/)
  assert.match(markup, />50%<\/span>/)
  assert.match(markup, /role="progressbar"[^>]*aria-valuenow="50"/)
  assert.match(markup, />5 hrs<\/span>/)
  assert.match(markup, />Edit<span class="visually-hidden"> planned hours for Example<\/span>/)
  assert.match(markup, />Unavailable<\/span>/)
  assert.match(markup, />Not set<\/span>/)
})
