import { categories, learningPlans, sampleActivities } from './sampleActivities'
import type {
  Activity,
  ActivityData,
  ActivityRepository,
  LearningPlan,
  NewActivityInput,
  NewLearningPlanInput,
} from '../types/activity'

export const otherOption = '__other__'
export const activityStorageKey = 'productivity-log:data:v1'

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
  return {
    activities: sampleActivities,
    customLearningPlans: [],
    customCategories: [],
  }
}

export function activityCatalog(data: ActivityData) {
  return {
    learningPlans: [...learningPlans, ...data.customLearningPlans],
    categories: [...categories, ...data.customCategories],
  }
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
        typeof milestone.required === 'boolean',
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
    (value.status === 'Completed' || value.status === 'In Progress') &&
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
      !stored.customCategories.every(isNonemptyString)
    ) {
      throw new Error('Invalid saved data')
    }
    return {
      activities: stored.activities,
      customLearningPlans: stored.customLearningPlans,
      customCategories: stored.customCategories,
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
  const plan: LearningPlan = {
    id: crypto.randomUUID(),
    name: normalizeName(input.name),
    description: input.description.trim(),
    targetSkill: normalizeName(input.targetSkill),
    targetCompletionDate: input.targetCompletionDate,
    milestones: [],
  }
  return persist(
    { ...data, customLearningPlans: [...data.customLearningPlans, plan] },
    'Learning plan',
  )
}

function saveActivity(input: NewActivityInput): ActivityData {
  const data = load()
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
  const milestone = plan.milestones.find(
    (item) => item.id === input.milestoneId,
  )
  if (plan.milestones.length && !milestone)
    throw new Error('Select a milestone / activity.')

  const activity: Activity = {
    id: crypto.randomUUID(),
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
  }
  return persist(next, 'Activity')
}

export const activityRepository: ActivityRepository = {
  load,
  saveActivity,
  saveLearningPlan,
}
