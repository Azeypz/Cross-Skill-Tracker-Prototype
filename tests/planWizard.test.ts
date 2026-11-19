import assert from 'node:assert/strict'
import { test } from 'node:test'
import { activityCatalog, activityRepository, learningPlanProgress } from '../src/data/activityRepository'
import { startWizard, wizardError, type PlanWizard } from '../src/data/planWizard'

function example(): PlanWizard {
  const plan = startWizard()
  Object.assign(plan, {
    name: 'Lab plan', category: 'Other', customCategory: 'Lab training', remarks: 'Practice troubleshooting',
    description: 'Diagnose a connectivity issue', targetSkill: 'Networking', startDate: '2026-11-01',
    targetCompletionDate: '2026-11-30', status: 'In Progress', plannedHours: 4,
  })
  for (const m of plan.milestones) Object.assign(m, {
    title: 'Demonstration', dueDate: '2026-11-15', completionCriteria: 'Show a successful connection',
  })
  return plan
}

test('wizard gates conditional fields, milestone dates, and proposed activity hours', () => {
  const p = example()
  assert.ok(wizardError({ ...p, customCategory: '' }, 1))
  assert.ok(wizardError({ ...p, remarks: ' ' }, 1))
  assert.equal(wizardError({ ...p, category: 'Oracle', remarks: '' }, 1), '')
  assert.ok(wizardError({ ...p, startDate: '2026-12-01' }, 1))
  assert.ok(wizardError({ ...p, resourceUrl: 'not a URL' }, 1))
  assert.ok(wizardError({ ...p, milestones: [] }, 2))
  p.milestones[0].dueDate = '2026-12-01'
  assert.ok(wizardError(p, 2))
  p.milestones[1].proposedActivities = []
  const a = p.milestones[0].proposedActivities[0]
  assert.ok(wizardError(p, 3))
  assert.equal(wizardError(p, 3, 'Draft'), '')
  a.title = 'Practice'
  for (const hours of [undefined, 0.25, 1.5, 2.25, 9, 24]) {
    a.estimatedHours = hours
    assert.equal(wizardError(p, 3), '')
  }
  for (const hours of [0, 8.76, 9.01, 25]) {
    a.estimatedHours = hours
    assert.ok(wizardError(p, 3))
  }
})

test('resume a draft and publish in place without creating sessions or completed hours', (t) => {
  let serialized: string | null = null
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: { getItem: () => serialized, setItem: (_: string, value: string) => { serialized = value } },
  } })
  t.after(() => Reflect.deleteProperty(globalThis, 'window'))
  const p = example()
  activityRepository.saveWizard(p, 'Draft')
  const draft = activityRepository.load().customLearningPlans[0]
  assert.equal(draft.status, 'Not Started')
  const resumed = startWizard(draft)
  assert.deepEqual(resumed, { ...p, status: 'Not Started' })
  resumed.milestones[0].proposedActivities[0].title = 'Connectivity lab'
  resumed.milestones[1].proposedActivities = []
  resumed.milestones[1].initialStatus = 'Completed'
  resumed.status = 'In Progress'
  activityRepository.saveWizard(resumed, 'Created', draft.id)
  const data = activityRepository.load()
  const plan = activityCatalog(data).learningPlans.find((item) => item.id === draft.id)!
  assert.equal(data.customLearningPlans.length, 1)
  assert.equal(plan.creationState, 'Created')
  assert.equal(plan.status, 'In Progress')
  assert.deepEqual(plan.milestones.map((m) => m.id), p.milestones.map((m) => m.id))
  assert.equal(plan.milestones[1].status, 'Completed')
  assert.deepEqual(data.activities, [])
  assert.equal(learningPlanProgress(plan, data.activities), 0)
  assert.throws(() => activityRepository.saveWizard(resumed, 'Created', draft.id), /no longer available/)
})
