import { formatActivityDate } from '../../../data/sampleActivities'
import type { Activity, LearningPlan } from '../../../types/activity'
import type { AgentResponse, LearningContext } from '../types/chat'
import type { AiCoachService } from './aiCoachService'
import type { ActivityDraft } from '../types/activityDraft'
import { collectActivityDraft, looksLikeActivity } from './mockDraftCollection'

export const suggestedPrompts = [
  'What should I learn next?',
  'Show my recent learning activity',
  'What am I currently learning?',
  'Help me add an activity',
] as const

function sortedActivities(context: LearningContext) {
  return [...context.activities].sort((first, second) =>
    second.date.localeCompare(first.date),
  )
}

function recentActivity(context: LearningContext): AgentResponse {
  const recent = sortedActivities(context).slice(0, 5)
  if (!recent.length)
    return { kind: 'answer', text: 'No learning activities are recorded yet.' }
  const rows = recent.map((activity) => {
    const plan = context.learningPlans.find(
      (item) => item.id === activity.learningPlanId,
    )
    return `${formatActivityDate(activity.date)}: ${activity.title}\n${plan?.name ?? 'Learning plan unavailable'} / ${activity.hours} ${activity.hours === 1 ? 'hour' : 'hours'} / ${activity.status}`
  })
  return {
    kind: 'answer',
    text: `Your most recent recorded learning:\n\n${rows.join('\n\n')}`,
  }
}

function currentLearning(context: LearningContext): AgentResponse {
  if (!context.learningPlans.length)
    return {
      kind: 'answer',
      text: 'No learning plans are available. You can create one in Learning Plans.',
    }
  const recent = sortedActivities(context)
  const latestByPlan = new Map<string, Readonly<Activity>>()
  for (const activity of recent) {
    if (!latestByPlan.has(activity.learningPlanId))
      latestByPlan.set(activity.learningPlanId, activity)
  }
  const recorded = context.learningPlans.filter((plan) =>
    latestByPlan.has(plan.id),
  )
  const rows = recorded.map((plan) => {
    const activity = latestByPlan.get(plan.id)!
    return `${plan.name}\nLatest recorded session: ${activity.title} (${activity.status}, ${formatActivityDate(activity.date)})`
  })
  const withoutSessions = context.learningPlans.filter(
    (plan) => !latestByPlan.has(plan.id),
  )
  if (withoutSessions.length)
    rows.push(
      `Plans without recorded sessions: ${withoutSessions.map((plan) => plan.name).join(', ')}.`,
    )
  return {
    kind: 'answer',
    text: `Your learning plans and latest recorded work:\n\n${rows.join('\n\n')}`,
  }
}

function recommendation(context: LearningContext): AgentResponse {
  const response = (text: string): AgentResponse => ({
    kind: 'recommendation',
    title: 'Mock AI Recommendation',
    text,
  })
  if (!context.learningPlans.length)
    return response(
      'No learning plans are available to base a recommendation on. Create a learning plan first.',
    )
  const recent = sortedActivities(context)
  const hasCompletedSession = (
    plan: Readonly<LearningPlan>,
    milestoneId: string | null,
    title: string,
  ) =>
    recent.some(
      (activity) =>
        activity.learningPlanId === plan.id &&
        activity.status === 'Completed' &&
        (milestoneId
          ? activity.milestoneId === milestoneId
          : activity.title === title),
    )
  const unfinishedSession = recent.find((activity) => {
    const plan = context.learningPlans.find(
      (item) => item.id === activity.learningPlanId,
    )
    return (
      plan &&
      activity.status === 'In Progress' &&
      !hasCompletedSession(plan, activity.milestoneId, activity.title)
    )
  })
  if (unfinishedSession) {
    const plan = context.learningPlans.find(
      (item) => item.id === unfinishedSession.learningPlanId,
    )!
    const blocker = unfinishedSession.reflection.blockers.trim()
    const nextStep = unfinishedSession.reflection.nextStep.trim()
    return response(
      [
        `Suggested activity: ${unfinishedSession.title}`,
        `Learning plan: ${plan.name}`,
        'Reason: a recorded session is In Progress, with no completed session recorded for this activity.',
        blocker
          ? `Recorded blocker: ${blocker}`
          : 'No blocker was recorded for this session.',
        `Suggested next action: ${nextStep || `Review your notes for ${unfinishedSession.title} and choose a next step.`}`,
        'Expected outcome: a documented next step for this activity.',
        'General suggestion: prerequisite order is not recorded.',
      ].join('\n\n'),
    )
  }
  for (const plan of context.learningPlans) {
    const milestone = plan.milestones.find(
      (item) =>
        item.required && !hasCompletedSession(plan, item.id, item.title),
    )
    if (milestone)
      return response(
        [
          `Suggested milestone: ${milestone.title}`,
          `Learning plan: ${plan.name}`,
          'Reason: this is a required milestone with no completed session recorded.',
          `Suggested next action: review the requirements for ${milestone.title} before starting a session.`,
          'Expected outcome: a clear next task for this milestone.',
          'General suggestion: prerequisite order is not recorded.',
        ].join('\n\n'),
      )
  }
  const unstructuredPlan = context.learningPlans.find(
    (plan) => !plan.milestones.length,
  )
  if (unstructuredPlan)
    return response(
      `Learning plan: ${unstructuredPlan.name}\n\nNo milestones are defined for this plan. General suggestion: review its learning goal and choose an activity. There is not enough milestone data to recommend a specific next milestone.`,
    )
  return response(
    'No unfinished required milestone can be identified from the recorded sessions. Review your learning plans before choosing another activity; no official plan completion is inferred.',
  )
}

export class MockAiCoachService implements AiCoachService {
  async sendMessage(
    message: string,
    context: LearningContext,
    draft?: ActivityDraft,
  ): Promise<AgentResponse> {
    const prompt = message
      .trim()
      .toLowerCase()
      .replace(/[?!.]+$/, '')
      .replace(/\s+/g, ' ')
    if (context.dataUnavailable)
      return {
        kind: 'answer',
        text: 'Your saved learning data is unavailable, so I cannot provide a reliable summary or recommendation right now. Please resolve the storage error shown in the application.',
      }
    if (prompt === 'show my recent learning activity')
      return recentActivity(context)
    if (prompt === 'what am i currently learning')
      return currentLearning(context)
    if (prompt === 'what should i learn next') return recommendation(context)
    if (
      prompt === 'help me add an activity' ||
      draft ||
      looksLikeActivity(message)
    ) {
      return collectActivityDraft(message, context, draft)
    }
    return {
      kind: 'answer',
      text: 'Ask about your learning, or tell me about a session you want to record. I can prepare a draft, but only Confirm & Save can save it.',
    }
  }
}
