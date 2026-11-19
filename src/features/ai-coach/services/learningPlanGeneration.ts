import { learningPlanDraftSchema } from '../types/apiContract'
import type {
  LearningActivityType,
  LearningPlanDraft,
  LearningPlanWeekDraft,
} from '../types/learningPlanDraft'
import type { LearningContext } from '../types/chat'

const oracleTopics = [
  'Oracle database architecture and instance components',
  'Oracle installation, configuration, and startup',
  'Users, roles, privileges, and database security',
  'Tablespaces, storage, and capacity management',
  'Backup, recovery, and high availability',
  'Performance monitoring and troubleshooting',
  'Operational automation and maintenance routines',
  'Administration scenarios and knowledge review',
]

const azureTopics = [
  'Cloud concepts and shared responsibility',
  'Azure architecture, regions, and resource organization',
  'Compute and networking service selection',
  'Storage and database service selection',
  'Identity, security, and governance',
  'Pricing, cost management, and service agreements',
  'Azure scenario practice and service comparisons',
  'Certification review and knowledge assessment',
]

const generalTopics = [
  'Core concepts and terminology',
  'Tools, workflows, and foundational techniques',
  'Guided examples and common use cases',
  'Troubleshooting and applied problem solving',
  'A practical project using the core concepts',
  'Review, assessment, and next-step planning',
]

const activityTypes: LearningActivityType[] = [
  'lesson',
  'practice',
  'reading',
  'lab',
  'assessment',
  'review',
]

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function localDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function roundedHours(value: number) {
  return Math.round(value * 100) / 100
}

function splitHours(total: number) {
  if (total > 24) {
    const chunks: number[] = []
    let remaining = total
    while (remaining > 24) {
      chunks.push(24)
      remaining = roundedHours(remaining - 24)
    }
    if (remaining > 0) chunks.push(remaining)
    return chunks
  }
  const first = roundedHours(total * 0.6)
  const second = roundedHours(total - first)
  return second > 0 ? [first, second] : [total]
}

function makeWeek(
  skill: string,
  topic: string,
  weekNumber: number,
  hours: number,
): LearningPlanWeekDraft {
  const allocations = splitHours(hours)
  const activities = allocations.map((estimatedHours, index) => {
    const type = activityTypes[(weekNumber + index - 1) % activityTypes.length]!
    const step = index === 0 ? 'Learn' : 'Apply'
    return {
      title: `${step}: ${topic}`,
      description:
        index === 0
          ? `Study the key ideas and terminology for ${topic.toLowerCase()}.`
          : `Complete a focused ${type} using ${topic.toLowerCase()} in ${skill}.`,
      type,
      estimatedHours,
      status: 'not-started' as const,
    }
  })
  return {
    weekNumber,
    title: `Week ${weekNumber}: ${topic}`,
    objective: `Build practical understanding of ${topic.toLowerCase()}.`,
    estimatedHours: hours,
    activities,
  }
}

function promptLevel(message: string) {
  const match = message.match(/\b(beginner|intermediate|advanced)\b/i)
  return (match?.[1]?.toLowerCase() ?? 'beginner') as LearningPlanDraft['currentLevel']
}

function promptDuration(message: string) {
  const match = message.match(/\b(\d{1,2})\s*[- ]?\s*weeks?\b/i)
  return Math.min(Number(match?.[1] ?? 4), 52)
}

function promptStudySchedule(message: string) {
  const dayMatch = message.match(/\b(\d)\s+(?:study\s+)?days?\s+(?:per|a|each)\s+week\b/i)
  const periodMatch = message.match(
    /\b(\d+(?:\.\d+)?)\s*hours?\s*(?:per|a|each)\s*(weekdays?|workdays?|days?|study days?)\b/i,
  )
  const weeklyHoursMatch = message.match(
    /\b(\d+(?:\.\d+)?)\s*hours?\s*(?:per|a|each)\s*week\b/i,
  )
  const studyDaysPerWeek = dayMatch
    ? Math.max(1, Math.min(Number(dayMatch[1]), 7))
    : periodMatch && /weekdays?|workdays?/i.test(periodMatch[2]!)
      ? 5
      : periodMatch
        ? 7
        : 5
  const hoursPerStudyDay = periodMatch
    ? Number(periodMatch[1])
    : weeklyHoursMatch
      ? Number(weeklyHoursMatch[1]) / studyDaysPerWeek
      : 1
  return { studyDaysPerWeek, hoursPerStudyDay }
}

function knownTopics(message: string) {
  const match = message.match(
    /\b(?:already\s+know|already\s+familiar\s+with|know)\s+(.+?)(?=\s+so\s+|[,.;]|$)/i,
  )
  return match?.[1]
    ?.split(/\s*(?:,|\band\b)\s*/i)
    .map(normalized)
    .filter(Boolean) ?? []
}

function requestedSkill(message: string, context: LearningContext) {
  const statedSkill = message.match(/\btarget\s+skill\s+is\s+(.+?)(?=[,.;]|$)/i)?.[1]
  if (statedSkill) return statedSkill.trim()

  const focus = message.match(/\bfocus\s+on\s+(.+?)(?=[,.;]|$)/i)?.[1]
  if (focus) return focus.trim()

  const fromPlan = message.match(/\bplan\s+(?:for|on)\s+(.+?)(?=[,.;]|$)/i)?.[1]
  if (fromPlan && !/^\d+(?:\.\d+)?\s*hours?\b/i.test(fromPlan))
    return fromPlan.trim()

  const beforePlan = message.match(
    /\b(?:create|make|build|generate|design)\s+(?:me\s+)?(?:an?\s+)?(.+?)\s+(?:(?:learning|study)\s+)?plan\b/i,
  )?.[1]
  if (beforePlan) {
    const cleaned = beforePlan
      .replace(/^\d{1,2}\s*[- ]?\s*weeks?\s*/i, '')
      .replace(/^(?:a|an|the)\s+/i, '')
      .replace(/\s+for\s+\d+(?:\.\d+)?\s*hours?.*$/i, '')
      .trim()
    if (cleaned && !/^learning|^study$/i.test(cleaned)) return cleaned
  }

  const eligiblePlans = context.eligibleLearningPlans ?? context.learningPlans
  const recent = [...eligiblePlans].reverse()
  const recentPlan = recent.find((plan) => plan.status === 'In Progress')
    ?? recent.find((plan) => plan.status !== 'Completed')
  return recentPlan?.targetSkill?.trim() || recentPlan?.name.trim() || ''
}

export function isLearningPlanIntent(message: string) {
  return (
    /\b(?:create|make|build|generate|design)\b.{0,80}\bplan\b/i.test(message) ||
    /\bwhat\s+should\s+i\s+learn\s+next\b/i.test(message) ||
    /\bfocus\s+on\b/i.test(message) ||
    (/\b(?:beginner|intermediate|advanced)\b/i.test(message) &&
      /\b(?:hours?|days?)\b/i.test(message))
  )
}

export function createLearningPlanDraft(
  message: string,
  context: LearningContext,
): LearningPlanDraft | undefined {
  const skill = requestedSkill(message, context)
  if (!skill) return undefined

  const durationWeeks = promptDuration(message)
  const { studyDaysPerWeek, hoursPerStudyDay } = promptStudySchedule(message)
  const weeklyHours = roundedHours(studyDaysPerWeek * hoursPerStudyDay)
  const totalEstimatedHours = roundedHours(durationWeeks * weeklyHours)
  const exclusions = knownTopics(message)
  const topicPool = /oracle|database|dba/i.test(skill)
    ? oracleTopics
    : /az-?900|azure/i.test(skill)
      ? azureTopics
      : generalTopics
  const topics = topicPool.filter(
    (topic) =>
      !exclusions.some(
        (known) => known && normalized(topic).includes(known),
      ) &&
      ![
        ...context.learningPlans.flatMap((plan) =>
          plan.milestones
            .filter((milestone) => milestone.status === 'Completed')
            .map((milestone) => milestone.title),
        ),
        ...context.activities
          .filter((activity) => activity.status === 'Completed')
          .map((activity) => activity.title),
      ].some((completedTitle) => {
        const completedTopic = normalized(completedTitle)
        const candidateTopic = normalized(topic)
        return completedTopic === candidateTopic ||
          (completedTopic.length > 10 && candidateTopic.includes(completedTopic))
      }),
  )
  const weeklyPlans = Array.from({ length: durationWeeks }, (_, index) => {
    const topic =
      topics[index] ??
      `Applied ${skill} practice and review ${index + 1}`
    return makeWeek(skill, topic, index + 1, weeklyHours)
  })
  const level = promptLevel(message)
  const category = /oracle|database|sql|data/i.test(skill)
    ? 'Data & Analytics'
    : /azure|cloud|security|network/i.test(skill)
      ? 'Cloud & Infrastructure'
      : 'Technology'
  const draft: LearningPlanDraft = {
    id: crypto.randomUUID(),
    title: `${skill} Learning Plan`,
    category,
    skill,
    currentLevel: level,
    goal: `Build ${level}-level capability in ${skill} through structured study and applied practice.`,
    startDate: localDate(),
    durationWeeks,
    studyDaysPerWeek,
    hoursPerStudyDay,
    totalEstimatedHours,
    weeklyPlans,
  }
  const parsed = learningPlanDraftSchema.safeParse(draft)
  if (!parsed.success) throw new Error('Generated learning plan was invalid.')
  return parsed.data
}

export function updateLearningPlanSchedule(
  draft: LearningPlanDraft,
  changes: Partial<LearningPlanDraft>,
): LearningPlanDraft {
  const updated = { ...draft, ...changes }
  const durationWeeks = Math.max(1, Math.min(52, Math.round(updated.durationWeeks)))
  const studyDaysPerWeek = Math.max(1, Math.min(7, Math.round(updated.studyDaysPerWeek)))
  const hoursPerStudyDay = Math.max(0.01, Math.min(24, updated.hoursPerStudyDay))
  const weeklyHours = roundedHours(studyDaysPerWeek * hoursPerStudyDay)
  const weeklyPlans = Array.from({ length: durationWeeks }, (_, index) => {
    const existing = updated.weeklyPlans[index]
    const topic = existing?.title.replace(/^Week \d+: /, '') ?? `Guided ${updated.skill} practice ${index + 1}`
    const week = makeWeek(updated.skill, topic, index + 1, weeklyHours)
    return existing
      ? {
          ...week,
          title: existing.title,
          objective: existing.objective,
          activities: week.activities.map((activity, activityIndex) => ({
            ...activity,
            ...existing.activities[activityIndex],
            estimatedHours: activity.estimatedHours,
          })),
        }
      : week
  })
  return {
    ...updated,
    durationWeeks,
    studyDaysPerWeek,
    hoursPerStudyDay,
    totalEstimatedHours: roundedHours(durationWeeks * weeklyHours),
    weeklyPlans,
  }
}