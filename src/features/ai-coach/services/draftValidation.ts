import type { ActivityStatus, NewActivityInput } from '../../../types/activity'
import type { ActivityDraft, DraftIssue } from '../types/activityDraft'
import type { LearningContext } from '../types/chat'

export const draftLabels = {
  date: 'Date',
  learningPlan: 'Learning Plan',
  activity: 'Milestone / Activity',
  category: 'Category',
  hours: 'Hours Spent',
  status: 'Task Status',
  learned: 'What did you learn?',
  blockers: 'Challenges / Blockers',
  nextStep: 'Next Step',
}

export function normalized(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function findPlan(draft: ActivityDraft, context: LearningContext) {
  return context.learningPlans.find(
    (plan) => normalized(plan.name) === normalized(draft.learningPlan ?? ''),
  )
}

export function validSessionDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

export function validateActivityDraft(
  draft: ActivityDraft,
  context: LearningContext,
): DraftIssue[] {
  const issues: DraftIssue[] = []
  const plan = findPlan(draft, context)
  if (!draft.date || !validSessionDate(draft.date))
    issues.push({
      field: 'date',
      message:
        'What date was the session? Use a valid date, today, or yesterday.',
    })
  if (!draft.learningPlan?.trim())
    issues.push({
      field: 'learningPlan',
      message: 'Which existing learning plan should this be recorded under?',
    })
  else if (!plan)
    issues.push({
      field: 'learningPlan',
      message:
        "I couldn't find that learning plan. Would you like to use an existing learning plan or create one manually first?",
    })
  if (!draft.activity?.trim())
    issues.push({
      field: 'activity',
      message: 'Which milestone or activity did you work on?',
    })
  else if (
    plan?.milestones.length &&
    !plan.milestones.some(
      (milestone) =>
        normalized(milestone.title) === normalized(draft.activity ?? ''),
    )
  ) {
    issues.push({
      field: 'activity',
      message: `Choose an existing milestone for ${plan.name}: ${plan.milestones.map((milestone) => milestone.title).join(', ')}.`,
    })
  }
  if (!draft.category?.trim())
    issues.push({
      field: 'category',
      message: 'Which existing category should I use?',
    })
  else if (
    !context.categories?.some(
      (category) => normalized(category) === normalized(draft.category ?? ''),
    )
  )
    issues.push({
      field: 'category',
      message:
        "I couldn't find that category. Would you like to use an existing category or create one manually first?",
    })
  if (
    draft.hours === undefined ||
    !Number.isFinite(draft.hours) ||
    draft.hours <= 0 ||
    draft.hours > 24
  )
    issues.push({
      field: 'hours',
      message:
        'How many hours did you spend? Enter more than 0 and no more than 24.',
    })
  if (draft.status !== 'Completed' && draft.status !== 'In Progress')
    issues.push({
      field: 'status',
      message: 'Was the task Completed or In Progress?',
    })
  if (!draft.learned?.trim())
    issues.push({ field: 'learned', message: 'What did you learn?' })
  if (!draft.blockers?.trim())
    issues.push({
      field: 'blockers',
      message:
        'Did you encounter any challenges or blockers? Say none if there were none.',
    })
  if (!draft.nextStep?.trim())
    issues.push({
      field: 'nextStep',
      message: 'What is your next step? Say none if you have not decided.',
    })
  if (
    draft.evidence &&
    (!draft.evidence.name.trim() ||
      !draft.evidence.type.trim() ||
      !Number.isFinite(draft.evidence.size) ||
      draft.evidence.size < 0 ||
      draft.evidence.size > 10 * 1024 * 1024)
  ) {
    issues.push({
      field: 'evidence',
      message:
        'Evidence needs a filename, MIME type, and size no larger than 10 MB. Only metadata is retained.',
    })
  }
  return issues
}

export function toActivityInput(
  draft: ActivityDraft,
  context: LearningContext,
): NewActivityInput {
  if (context.dataUnavailable)
    throw new Error(
      'Saved learning data is unavailable. Resolve the storage error before saving.',
    )
  const issues = validateActivityDraft(draft, context)
  if (issues.length) throw new Error(issues[0].message)
  const plan = findPlan(draft, context)!
  const milestone = plan.milestones.find(
    (item) => normalized(item.title) === normalized(draft.activity!),
  )
  return {
    date: draft.date!,
    learningPlanId: plan.id,
    newLearningPlanName: '',
    milestoneId: milestone?.id ?? '',
    title: draft.activity!.trim(),
    category: context.categories!.find(
      (item) => normalized(item) === normalized(draft.category!),
    )!,
    newCategoryName: '',
    hours: draft.hours!,
    status: draft.status as ActivityStatus,
    reflection: {
      learning: draft.learned!.trim(),
      blockers: draft.blockers!.trim(),
      nextStep: draft.nextStep!.trim(),
    },
    evidence: draft.evidence,
  }
}
