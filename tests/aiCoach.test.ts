import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import type { LearningPlan } from '../src/types/activity'
import type { LearningContext } from '../src/features/ai-coach/types/chat'
import type { ActivityDraft } from '../src/features/ai-coach/types/activityDraft'
import { MockAiCoachService } from '../src/features/ai-coach/services/mockAiCoachService'
import { collectActivityDraft } from '../src/features/ai-coach/services/mockDraftCollection'
import { toActivityInput } from '../src/features/ai-coach/services/draftValidation'
import { advanceAgentWorkflow } from '../src/features/ai-coach/services/agentWorkflow'
import { AiCoachApiError, ApiAiCoachService } from '../src/features/ai-coach/services/apiAiCoachService'
import { activityRepository, activityStorageKey } from '../src/data/activityRepository'

const plan: LearningPlan = { id: 'coach-plan', name: 'Azure Certification', status: 'Not Started', category: 'Cloud', milestones: [] }
const contextWith = (plans: LearningPlan[]): LearningContext => ({
  activities: [], learningPlans: plans, completedLearningPlans: [],
  eligibleLearningPlans: plans, categories: ['Cloud'],
})

test('current learning returns empty-state answers when there are no activities', async () => {
  const coach = new MockAiCoachService()
  const none = await coach.sendMessage('What am I currently learning?', contextWith([]))
  assert.equal(none.kind, 'answer')
  assert.equal(none.text, "You don't have any recorded learning activities or Learning Plans yet.")
  const plansOnly = await coach.sendMessage('What am I currently learning?', contextWith([plan]))
  assert.equal(plansOnly.kind, 'answer')
  assert.ok(plansOnly.text.startsWith("You have Learning Plans, but you haven't recorded any learning activities yet."))
})

test('conversational activity creation reaches confirmation and saves without hours', () => {
  const context = contextWith([plan])
  const answers: Record<string, string> = {
    date: 'today', learningPlan: plan.name, activity: 'Azure networking lab',
    status: 'In Progress', learned: 'VNet peering', blockers: 'None', nextStep: 'Practice routing',
  }
  let response = collectActivityDraft('Help me add an activity', context)
  let workflow = advanceAgentWorkflow('Help me add an activity', response)
  let draft: ActivityDraft | undefined = response.draft
  for (let turn = 0; response.kind === 'question' && turn < 10; turn++) {
    const field = draft!.awaitingFields![0]
    assert.notEqual(field, 'hours')
    response = collectActivityDraft(answers[field], context, draft)
    workflow = advanceAgentWorkflow(answers[field], response, workflow)
    draft = response.draft
  }
  assert.equal(response.kind, 'draft')
  assert.equal(workflow.step, 'AWAITING_CONFIRMATION')
  assert.equal(workflow.pendingAction?.type, 'CREATE_ACTIVITY')
  assert.equal(draft!.activity, 'Azure networking lab')
  assert.equal(draft!.hours, undefined)

  const storage = new Map<string, string>([[activityStorageKey, JSON.stringify({
    version: 1, activities: [], customLearningPlans: [plan], customCategories: [], milestoneProgress: {},
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
    activityRepository.saveActivity(toActivityInput(draft!, context))
    const activity = activityRepository.load().activities.find((item) => item.title === 'Azure networking lab')
    assert.ok(activity)
    assert.equal(activity.hours, undefined)
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

async function apiError(fetchImpl: typeof fetch) {
  globalThis.fetch = fetchImpl
  const error = await new ApiAiCoachService('http://coach.test')
    .sendMessage('hi', contextWith([]))
    .then(() => undefined, (failure: unknown) => failure)
  assert.ok(error instanceof AiCoachApiError)
  return error.message
}

test('API client reports safe, specific failure reasons', async () => {
  assert.equal(await apiError(async () => { throw new TypeError('fetch failed') }), 'Coach API could not be reached.')
  assert.equal(
    await apiError(async () => Response.json({ error: 'AI Coach service failed.', stack: '/secret/path' }, { status: 500 })),
    'Coach API request failed: HTTP 500 (AI Coach service failed.)',
  )
  assert.equal(await apiError(async () => Response.json({ kind: 'answer' })), 'Coach response validation failed.')
  const answer = await new MockAiCoachService().sendMessage('What am I currently learning?', contextWith([]))
  const valid = {
    ...answer, message: answer.text, intent: 'UNKNOWN', responseType: 'MESSAGE',
    workflowState: advanceAgentWorkflow('What am I currently learning?', answer),
  }
  globalThis.fetch = async () => Response.json(valid)
  assert.equal((await new ApiAiCoachService('http://coach.test').sendMessage('hi', contextWith([]))).text, answer.text)
  assert.equal(
    await apiError(async () => Response.json({ ...valid, workflowState: { ...valid.workflowState, step: 'BOGUS' } })),
    'Coach workflow validation failed.',
  )
})
