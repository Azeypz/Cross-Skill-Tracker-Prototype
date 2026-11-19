import type { CreationState, PlanDetails, PlanWizard, ProposedActivity } from '../data/planWizard'

export type ActivityPage = 'my-log' | 'add-activity' | 'learning-plans' | 'plan-wizard'
export type ActivityStatus = 'Not Started' | 'In Progress' | 'Completed'
export type MilestoneStatus = 'Not Started' | 'In Progress' | 'Completed'
export const learningPlanStatuses = ['Not Started', 'In Progress', 'Completed'] as const
export type LearningPlanStatus = (typeof learningPlanStatuses)[number]

export function isLearningPlanStatus(value: unknown): value is LearningPlanStatus {
  return learningPlanStatuses.some((status) => status === value)
}
export type ActivityCategory = string

export interface Milestone {
  dueDate?: string
  completionCriteria?: string
  initialStatus?: MilestoneStatus
  proposedActivities?: ProposedActivity[]
  id: string
  title: string
  required: boolean
  status: MilestoneStatus
  estimatedHours?: number
}

export interface LearningPlan {
  creationState?: CreationState
  startDate?: string
  targetProficiency?: PlanDetails['targetProficiency']
  categoryIsCustom?: boolean
  resourceUrl?: string
  remarks?: string
  status: LearningPlanStatus
  id: string
  name: string
  description?: string
  targetSkill?: string
  targetCompletionDate?: string
  category?: ActivityCategory
  plannedHours?: number
  milestones: Milestone[]
}

export interface NewLearningPlanInput {
  status?: LearningPlanStatus
  name: string
  description: string
  targetSkill: string
  targetCompletionDate: string
  category?: ActivityCategory
  plannedHours?: number
  milestones?: Array<Omit<Milestone, 'status'> & { status?: MilestoneStatus }>
}

export interface Evidence {
  name: string
  size: number
  type: string
}

export interface Reflection {
  learning: string
  blockers: string
  nextStep: string
}

export interface Activity {
  id: string
  date: string
  title: string
  learningPlanId: string
  milestoneId: string | null
  category: ActivityCategory
  hours?: number
  status: ActivityStatus
  reflection: Reflection
  evidence?: Evidence
}

export interface ActivityFilterValues {
  from: string
  to: string
  category: ActivityCategory | ''
  status: ActivityStatus | ''
}

export interface ActivityData {
  activities: Activity[]
  customLearningPlans: LearningPlan[]
  customCategories: ActivityCategory[]
  milestoneProgress: Record<string, MilestoneStatus>
  builtInPlanStatuses?: Record<string, LearningPlanStatus>
  planHours?: Record<string, {
    plannedHours?: number
    milestoneHours: Record<string, number>
  }>
}

export interface PlanHoursInput {
  planId: string
  plannedHours?: number
  milestoneHours: Record<string, number>
  newMilestone?: { title: string; estimatedHours: number }
}
export interface NewActivityInput {
  idempotencyKey?: string
  date: string
  learningPlanId: string
  newLearningPlanName: string
  milestoneId: string
  title: string
  category: ActivityCategory
  newCategoryName: string
  hours?: number
  status: ActivityStatus
  reflection: Reflection
  evidence?: Evidence
}

export interface ActivityRepository {
  load: () => ActivityData
  saveActivity: (input: NewActivityInput) => ActivityData
  saveLearningPlan: (input: NewLearningPlanInput) => ActivityData
  savePlanStatus: (planId: string, status: LearningPlanStatus) => ActivityData
  saveWizard: (input: PlanWizard, state: CreationState, draftId?: string) => ActivityData
  savePlanHours: (input: PlanHoursInput) => ActivityData
  deleteActivity: (activityId: string) => ActivityData
}
