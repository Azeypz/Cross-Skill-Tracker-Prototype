import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { activityCatalog, activityRepository, activityStorageKey, initialActivityData } from '../src/data/activityRepository'
import { activityLearningPlanName, learningPlans } from '../src/data/sampleActivities'
import ActivityDraftEditor from '../src/features/ai-coach/components/ActivityDraftEditor'
import type { NewActivityInput } from '../src/types/activity'

test('built-in plans contain exactly their certification and upskilling milestones', () => {
  const expected = ['Azure', 'Oracle Database', 'Google Cloud Platform', 'SQL DBA', 'Claude', 'AWS']
  assert.deepEqual(learningPlans.map((plan) => plan.name), expected)
  for (const plan of learningPlans) {
    assert.deepEqual(plan.milestones.map((milestone) => milestone.title), [
      `${plan.name} Certification`,
      `${plan.name} Upskilling`,
    ])
  }
  const ids = learningPlans.flatMap((plan) => plan.milestones.map((milestone) => milestone.id))
  assert.equal(new Set(ids).size, ids.length)
})

test('draft editor offers only milestones of the selected plan', () => {
  const context = { activities: [], learningPlans, categories: ['Cloud'] }
  for (const plan of learningPlans) {
    const markup = renderToStaticMarkup(createElement(ActivityDraftEditor, {
      draft: { id: 'draft', learningPlan: plan.name },
      context,
      onChange() {},
      onReview() {},
      onCancel() {},
    }))
    const options = markup.match(/<select id="draft-activity"[\s\S]*?<\/select>/)?.[0]
    assert.ok(options)
    for (const other of learningPlans) {
      for (const milestone of other.milestones)
        assert.equal(options.includes(`>${milestone.title}</option>`), other.id === plan.id)
    }
  }
})

test('save rejects another plan’s milestone and retains legacy activities and custom plans', () => {
  const legacy = {
    id: 'legacy', date: '2024-10-14', title: 'Power Apps Canvas App Practice',
    learningPlanId: 'power-apps', milestoneId: 'canvas-app', category: 'App Development',
    status: 'In Progress', reflection: { learning: '', blockers: '', nextStep: '' },
  }
  const custom = { id: 'custom', name: 'Custom plan', milestones: [] }
  const storage = new Map([[activityStorageKey, JSON.stringify({
    version: 1, ...initialActivityData(), activities: [legacy], customLearningPlans: [custom],
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
    const input: NewActivityInput = {
      date: '2026-11-12', learningPlanId: 'azure', newLearningPlanName: '',
      milestoneId: 'aws-certification', title: '', category: 'Cloud',
      newCategoryName: '', status: 'In Progress',
      reflection: { learning: '', blockers: '', nextStep: '' },
    }
    assert.throws(() => activityRepository.saveActivity(input), /Select a milestone/)
    const data = activityRepository.saveActivity({ ...input, milestoneId: 'azure-certification' })
    assert.equal(data.activities[0].title, 'Azure Certification')
    assert.deepEqual(data.activities[1], legacy)
    assert.ok(activityCatalog(data).learningPlans.some((plan) => plan.id === custom.id))
    assert.equal(activityLearningPlanName(legacy.learningPlanId, learningPlans), 'Power Apps')
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
