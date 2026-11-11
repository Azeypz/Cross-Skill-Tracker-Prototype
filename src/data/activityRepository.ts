import { categories, learningPlans } from './sampleActivities'
import type {
  Activity,
  ActivityData,
  ActivityRepository,
  LearningPlan,
  LearningPlanStatus,
  MilestoneStatus,
  NewActivityInput,
  NewLearningPlanInput,
} from '../types/activity'

export const otherOption = '__other__'
export const activityStorageKey = 'productivity-log:data:v1'
const milestoneStatuses: MilestoneStatus[] = [
  'Not Started',
  'In Progress',
  'Completed',
]

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function customNameError(
  value: string,
  existingNames: string[],
  label: string,
) {
  const name = normalizeName(value).toLowerCase()
  if (!name) return `Enter a ${label} name.`
  if (name === 'other' || name === otherOption)
    return `That ${label} name is reserved. Choose another name.`
  if (
    existingNames.some(
      (existing) => normalizeName(existing).toLowerCase() === name,
    )
  ) {
    return `This ${label} already exists. Select it from the dropdown.`
  }
  return ''
}

export function initialActivityData(): ActivityData {
  const milestoneProgress: Record<string, MilestoneStatus> = Object.fromEntries(
    learningPlans.flatMap((plan) =>
      plan.milestones.map(
        (milestone) => [milestone.id, 'Not Started' as MilestoneStatus],
      ),
    ),
  )
  return {
    activities: [],
    customLearningPlans: [],
    customCategories: [],
    milestoneProgress,
  }
}

export function activityCatalog(data: ActivityData) {
  const plans = [...learningPlans, ...data.customLearningPlans].map((plan) => ({
    ...plan,
    milestones: plan.milestones.map((milestone) => ({
      ...milestone,
      status: data.milestoneProgress[milestone.id] ?? milestone.status,
    })),
  }))
  return {
    learningPlans: plans,
    categories: [...categories, ...data.customCategories],
  }
}

export function learningPlanProgress(plan: LearningPlan) {
  const required = plan.milestones.filter((milestone) => milestone.required)
  if (!required.length) return 0
  return (
    (required.filter((milestone) => milestone.status === 'Completed').length /
      required.length) *
    100
  )
}

export function learningPlanStatus(plan: LearningPlan): LearningPlanStatus {
  const required = plan.milestones.filter((milestone) => milestone.required)
  if (
    required.length > 0 &&
    required.every((milestone) => milestone.status === 'Completed')
  )
    return 'Completed'
  if (required.some((milestone) => milestone.status !== 'Not Started'))
    return 'In Progress'
  return 'Not Started'
}

export function resetPrototypeData() {
  const data: ActivityData = {
    activities: [],
    customLearningPlans: [],
    customCategories: [],
    milestoneProgress: Object.fromEntries(
      learningPlans.flatMap((plan) =>
        plan.milestones.map(
          (milestone) => [milestone.id, 'Not Started' as MilestoneStatus],
        ),
      ),
    ) as Record<string, MilestoneStatus>,
  }
  return persist(data, 'Prototype data')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && normalizeName(value).length > 0
}

function isOptionalText(value: unknown) {
  return value === undefined || typeof value === 'string'
}

function isMilestoneStatus(value: unknown): value is MilestoneStatus {
  return milestoneStatuses.includes(value as MilestoneStatus)
}

function isOptionalTargetDate(value: unknown) {
  if (value === undefined || value === '') return true
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false
  const date = new Date(`${value}T12:00:00`)
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

function isLearningPlan(value: unknown): value is LearningPlan {
  return (
    isRecord(value) &&
    isNonemptyString(value.id) &&
    isNonemptyString(value.name) &&
    (value.category === undefined || isNonemptyString(value.category)) &&
    isOptionalText(value.description) &&
    isOptionalText(value.targetSkill) &&
    isOptionalTargetDate(value.targetCompletionDate) &&
    Array.isArray(value.milestones) &&
    value.milestones.every(
      (milestone: unknown) =>
        isRecord(milestone) &&
        isNonemptyString(milestone.id) &&
        isNonemptyString(milestone.title) &&
        typeof milestone.required === 'boolean' &&
        (milestone.status === undefined || isMilestoneStatus(milestone.status)),
    )
  )
}

function isActivity(value: unknown): value is Activity {
  if (!isRecord(value) || !isRecord(value.reflection)) return false
  const evidence = value.evidence
  return (
    isNonemptyString(value.id) &&
    isNonemptyString(value.title) &&
    typeof value.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    !Number.isNaN(Date.parse(`${value.date}T12:00:00`)) &&
    isNonemptyString(value.learningPlanId) &&
    (value.milestoneId === null || isNonemptyString(value.milestoneId)) &&
    isNonemptyString(value.category) &&
    typeof value.hours === 'number' &&
    Number.isFinite(value.hours) &&
    value.hours > 0 &&
    value.hours <= 24 &&
    (value.status === 'Not Started' ||
      value.status === 'Completed' ||
      value.status === 'In Progress') &&
    typeof value.reflection.learning === 'string' &&
    typeof value.reflection.blockers === 'string' &&
    typeof value.reflection.nextStep === 'string' &&
    (evidence === undefined ||
      (isRecord(evidence) &&
        typeof evidence.name === 'string' &&
        typeof evidence.size === 'number' &&
        typeof evidence.type === 'string'))
  )
}

function recalculateMilestoneProgress(
  activities: Activity[],
  plans: LearningPlan[],
): Record<string, MilestoneStatus> {
  return Object.fromEntries(
    plans.flatMap((plan) =>
      plan.milestones.map((milestone) => {
        const records = activities.filter(
          (activity) =>
            activity.learningPlanId === plan.id &&
            activity.milestoneId === milestone.id,
        )
        const status: MilestoneStatus = records.some(
          (activity) => activity.status === 'Completed',
        )
          ? 'Completed'
          : records.some((activity) => activity.status === 'In Progress')
            ? 'In Progress'
            : 'Not Started'
        return [milestone.id, status]
      }),
    ),
  )
}

function load(): ActivityData {
  let serialized: string | null
  try {
    serialized = window.localStorage.getItem(activityStorageKey)
  } catch {
    throw new Error(
      'Browser storage is unavailable. Enable local storage to save your activities.',
    )
  }
  if (serialized === null) return initialActivityData()

  try {
    const stored: unknown = JSON.parse(serialized)
    if (
      !isRecord(stored) ||
      stored.version !== 1 ||
      !Array.isArray(stored.activities) ||
      !stored.activities.every(isActivity) ||
      !Array.isArray(stored.customLearningPlans) ||
      !stored.customLearningPlans.every(isLearningPlan) ||
      !Array.isArray(stored.customCategories) ||
      !stored.customCategories.every(isNonemptyString) ||
      (stored.milestoneProgress !== undefined &&
        (!isRecord(stored.milestoneProgress) ||
          !Object.values(stored.milestoneProgress).every(isMilestoneStatus)))
    ) {
      throw new Error('Invalid saved data')
    }
    const data: ActivityData = {
      activities: stored.activities,
      customLearningPlans: stored.customLearningPlans,
      customCategories: stored.customCategories,
      milestoneProgress: {},
    }
    return {
      ...data,
      milestoneProgress: recalculateMilestoneProgress(data.activities, [
        ...learningPlans,
        ...data.customLearningPlans,
      ]),
    }
  } catch {
    throw new Error(
      'Saved activities could not be read. Your stored data has not been overwritten.',
    )
  }
}

function persist(data: ActivityData, recordName: string) {
  try {
    window.localStorage.setItem(
      activityStorageKey,
      JSON.stringify({ version: 1, ...data }),
    )
  } catch {
    throw new Error(
      `${recordName} was not saved. Browser storage is full or unavailable. Free some space and try again.`,
    )
  }
  return data
}

function saveLearningPlan(input: NewLearningPlanInput): ActivityData {
  const data = load()
  const catalog = activityCatalog(data)
  const nameError = customNameError(
    input.name,
    catalog.learningPlans.map((plan) => plan.name),
    'learning plan',
  )
  if (nameError) throw new Error(nameError)
  if (!isOptionalTargetDate(input.targetCompletionDate))
    throw new Error('Enter a valid target completion date.')
  const milestones = input.milestones ?? []
  if (
    !Array.isArray(milestones) ||
    !milestones.every(
      (milestone) =>
        isNonemptyString(milestone.id) &&
        isNonemptyString(milestone.title) &&
          typeof milestone.required === 'boolean' &&
          (milestone.status === undefined || isMilestoneStatus(milestone.status)),
    )
  )
    throw new Error('Learning plan activities are invalid.')
  const plan: LearningPlan = {
    id: crypto.randomUUID(),
    name: normalizeName(input.name),
    description: input.description.trim(),
    targetSkill: normalizeName(input.targetSkill),
    targetCompletionDate: input.targetCompletionDate,
    category: input.category ? normalizeName(input.category) : undefined,
    milestones: milestones.map((milestone) => ({
      ...milestone,
      status: milestone.status ?? 'Not Started',
    })),
  }
  const milestoneProgress = { ...data.milestoneProgress }
  for (const milestone of plan.milestones)
    milestoneProgress[milestone.id] = milestone.status
  return persist(
    {
      ...data,
      customLearningPlans: [...data.customLearningPlans, plan],
      milestoneProgress,
    },
    'Learning plan',
  )
}

function saveActivity(input: NewActivityInput): ActivityData {
  const data = load()
  if (
    input.idempotencyKey &&
    data.activities.some((activity) => activity.id === input.idempotencyKey)
  )
    return data
  const catalog = activityCatalog(data)
  const newPlan = input.learningPlanId === otherOption
  const newCategory = input.category === otherOption
  const planError = newPlan
    ? customNameError(
        input.newLearningPlanName,
        catalog.learningPlans.map((plan) => plan.name),
        'learning plan',
      )
    : ''
  const categoryError = newCategory
    ? customNameError(input.newCategoryName, catalog.categories, 'category')
    : ''
  if (planError || categoryError) throw new Error(planError || categoryError)

  const category = newCategory
    ? normalizeName(input.newCategoryName)
    : input.category
  if (!newCategory && !catalog.categories.includes(category))
    throw new Error('Select a category.')
  const plan: LearningPlan | undefined = newPlan
    ? {
        id: crypto.randomUUID(),
        name: normalizeName(input.newLearningPlanName),
        category,
        milestones: [],
      }
    : catalog.learningPlans.find((item) => item.id === input.learningPlanId)
  if (!plan) throw new Error('Select a learning plan.')
  if (
    !newPlan &&
    plan.category &&
    normalizeName(category).toLowerCase() !==
      normalizeName(plan.category).toLowerCase()
  )
    throw new Error('Activity category must match the selected learning plan.')
  const milestone = plan.milestones.find(
    (item) => item.id === input.milestoneId,
  )
  if (plan.milestones.length && !milestone)
    throw new Error('Select a milestone / activity.')

  const activity: Activity = {
    id: input.idempotencyKey ?? crypto.randomUUID(),
    date: input.date,
    title: milestone?.title ?? normalizeName(input.title),
    learningPlanId: plan.id,
    milestoneId: milestone?.id ?? null,
    category,
    hours: input.hours,
    status: input.status,
    reflection: input.reflection,
    evidence: input.evidence,
  }
  if (!isActivity(activity))
    throw new Error('Enter a valid date, activity, hours, and task status.')
  const next: ActivityData = {
    activities: [activity, ...data.activities],
    customLearningPlans: newPlan
      ? [...data.customLearningPlans, plan]
      : data.customLearningPlans,
    customCategories: newCategory
      ? [...data.customCategories, category]
      : data.customCategories,
    milestoneProgress: {},
  }
  next.milestoneProgress = recalculateMilestoneProgress(next.activities, [
    ...learningPlans,
    ...next.customLearningPlans,
  ])
  return persist(next, 'Activity')
}

function deleteActivity(activityId: string): ActivityData {
  const data = load()
  if (!data.activities.some((activity) => activity.id === activityId))
    return data
  const activities = data.activities.filter(
    (activity) => activity.id !== activityId,
  )
  const next: ActivityData = {
    ...data,
    activities,
    milestoneProgress: recalculateMilestoneProgress(activities, [
      ...learningPlans,
      ...data.customLearningPlans,
    ]),
  }
  return persist(next, 'Activity')
}

export const activityRepository: ActivityRepository = {
  load,
  saveActivity,
  saveLearningPlan,
  deleteActivity,
}
