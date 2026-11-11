import { formatActivityDate } from '../../../data/sampleActivities'
import type { Activity, LearningPlan } from '../../../types/activity'
import type { AgentResponse, LearningContext } from '../types/chat'
import type { AiCoachService } from './aiCoachService'
import type { ActivityDraft } from '../types/activityDraft'
import type { AgentRequestOptions } from '../types/agentWorkflow'
import { collectActivityDraft, looksLikeActivity } from './mockDraftCollection'
import {
  createLearningPlanDraft,
  isLearningPlanIntent,
} from './learningPlanGeneration'

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
    return {
      kind: 'answer',
      text: "You don't have any recorded learning activities yet.",
    }
  const rows = recent.map((activity) => {
    const plan = context.learningPlans.find(
      (item) => item.id === activity.learningPlanId,
    )
    return `${formatActivityDate(activity.date)}: ${activity.title}\nActivity Category: ${activity.category} / Learning Plan: ${plan?.name ?? 'Learning plan unavailable'} / Plan Category: ${plan?.category ?? 'Not recorded'} / ${activity.hours} ${activity.hours === 1 ? 'hour' : 'hours'} / ${activity.status}`
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
    const requiredMilestones = plan.milestones.filter((item) => item.required)
    const status = requiredMilestones.length > 0 &&
      requiredMilestones.every((item) => item.status === 'Completed')
      ? 'Completed'
      : requiredMilestones.some((item) => item.status !== 'Not Started')
        ? 'In Progress'
        : 'Not Started'
    return `${plan.name} (${status})\nCategory: ${plan.category ?? 'Not recorded'}\nLatest recorded session: ${activity.title} (${activity.status}, ${formatActivityDate(activity.date)})`
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
  const eligiblePlans = context.eligibleLearningPlans ?? context.learningPlans
  const completedPlans = context.completedLearningPlans ?? []
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
    const plan = eligiblePlans.find(
      (item) => item.id === activity.learningPlanId,
    )
    return (
      plan &&
      (activity.milestoneId === null ||
        plan.milestones.some(
          (milestone) =>
            milestone.id === activity.milestoneId &&
            milestone.status !== 'Completed',
        )) &&
      activity.status === 'In Progress' &&
      !hasCompletedSession(plan, activity.milestoneId, activity.title)
    )
  })
  if (unfinishedSession) {
    const plan = eligiblePlans.find(
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
  const orderedEligiblePlans = [...eligiblePlans].sort((first, second) => {
    const rank = (plan: Readonly<LearningPlan>) =>
      plan.milestones.some(
        (milestone) => milestone.required && milestone.status === 'In Progress',
      )
        ? 0
        : 1
    return rank(first) - rank(second)
  })
  for (const plan of orderedEligiblePlans) {
    const milestone = plan.milestones.find(
      (item) => item.required && item.status !== 'Completed',
    )
    if (milestone)
      return response(
        [
          `Suggested milestone: ${milestone.title}`,
          `Learning plan: ${plan.name}`,
          'Reason: this is an incomplete required milestone.',
          `Suggested next action: review the requirements for ${milestone.title} before starting a session.`,
          'Expected outcome: a clear next task for this milestone.',
          'General suggestion: prerequisite order is not recorded.',
        ].join('\n\n'),
      )
  }
  const unstructuredPlan = orderedEligiblePlans.find(
    (plan) => !plan.milestones.length,
  )
  if (unstructuredPlan)
    return response(
      `Learning plan: ${unstructuredPlan.name}\n\nNo milestones are defined for this plan. General suggestion: review its learning goal and choose an activity. There is not enough milestone data to recommend a specific next milestone.`,
    )
  if (!eligiblePlans.length && completedPlans.length)
    return response(
      `Your completed plans remain part of your learning history: ${completedPlans.map((plan) => plan.name).join(', ')}. Consider choosing or creating another learning plan; I will not recommend repeating a completed plan.`,
    )
  return response(
    'No unfinished required milestone can be identified from the official milestone statuses. Review your eligible learning plans before choosing another activity.',
  )
}

export class MockAiCoachService implements AiCoachService {
  async sendMessage(
    message: string,
    context: LearningContext,
    draft?: ActivityDraft,
    _options?: AgentRequestOptions,
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
    if (
      /^(?:what should i learn next|what milestone should i do next|what should i focus on)$/.test(
        prompt,
      )
    )
      return recommendation(context)
    if (isLearningPlanIntent(message)) {
      const learningPlanDraft = createLearningPlanDraft(message, context)
      if (!learningPlanDraft)
        return {
          kind: 'question',
          text: 'Which skill would you like to learn? I can use a 4-week, 5-day-per-week, 1-hour-per-day beginner schedule if you do not have a schedule preference.',
        }
      const defaults: string[] = []
      if (!/\b\d{1,2}\s*[- ]?\s*weeks?\b/i.test(message))
        defaults.push('4 weeks')
      const explicitStudyDays =
        /\b\d\s+days?\s+(?:per|a|each)\s+week\b/i.test(message) ||
        /\bweekdays?|workdays?\b/i.test(message)
      const explicitDailyHours =
        /\b\d+(?:\.\d+)?\s*hours?\s*(?:per|a|each)\s*(?:study\s*)?day\b/i.test(message) ||
        /\b\d+(?:\.\d+)?\s*hours?\s*(?:per|a|each)\s*weekdays?\b/i.test(message)
      const explicitWeeklyHours =
        /\b\d+(?:\.\d+)?\s*hours?\s*(?:per|a|each)\s*week\b/i.test(message)
      if (!explicitStudyDays) defaults.push('5 study days per week')
      if (!explicitDailyHours && !explicitWeeklyHours)
        defaults.push('1 hour per study day')
      if (explicitWeeklyHours && !explicitDailyHours)
        defaults.push('weekly hours distributed evenly across the 5 default study days')
      if (!/\b(beginner|intermediate|advanced)\b/i.test(message))
        defaults.push('beginner level')
      return {
        kind: 'learning-plan-draft',
        title: 'Learning plan draft',
        text: `I prepared a ${learningPlanDraft.durationWeeks}-week plan for ${learningPlanDraft.skill}. Available study time is ${learningPlanDraft.studyDaysPerWeek * learningPlanDraft.hoursPerStudyDay} hours per week (${learningPlanDraft.totalEstimatedHours} hours total).${defaults.length ? ` Defaults used: ${defaults.join(', ')};` : ''} The start date is today. Review and confirm before saving.`,
        learningPlanDraft,
      }
    }
    if (prompt === 'show my recent learning activity')
      return recentActivity(context)
    if (prompt === 'what am i currently learning')
      return currentLearning(context)
    if (
      prompt === 'help me add an activity' ||
      draft ||
      looksLikeActivity(message)
    ) {
      return collectActivityDraft(message, context, draft)
    }
    if (/\b(?:delete|remove|edit|update)\b.{0,50}\b(?:activity|learning plan|milestone)\b/i.test(message))
      return {
        kind: 'answer',
        text: 'I can show recent activity, recommend next learning, prepare an activity draft, or prepare a learning plan draft. Editing and deletion through AI are not supported; use the application controls for those actions.',
      }
    return {
      kind: 'answer',
      text: 'Supported requests: show recent activities, recommend next learning, prepare an activity draft, or prepare a learning plan draft. I cannot edit or delete records through AI. Drafts are saved only after you confirm.',
    }
  }
}
