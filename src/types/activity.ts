export type ActivityPage = 'my-log' | 'add-activity' | 'learning-plans'
export type ActivityStatus = 'Not Started' | 'In Progress' | 'Completed'
export type MilestoneStatus = 'Not Started' | 'In Progress' | 'Completed'
export type LearningPlanStatus = MilestoneStatus
export type ActivityCategory = string

export interface Milestone {
  id: string
  title: string
  required: boolean
  status: MilestoneStatus
}

export interface LearningPlan {
  id: string
  name: string
  description?: string
  targetSkill?: string
  targetCompletionDate?: string
  category?: ActivityCategory
  milestones: Milestone[]
}

export interface NewLearningPlanInput {
  name: string
  description: string
  targetSkill: string
  targetCompletionDate: string
  category?: ActivityCategory
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
  hours: number
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
  hours: number
  status: ActivityStatus
  reflection: Reflection
  evidence?: Evidence
}

export interface ActivityRepository {
  load: () => ActivityData
  saveActivity: (input: NewActivityInput) => ActivityData
  saveLearningPlan: (input: NewLearningPlanInput) => ActivityData
  deleteActivity: (activityId: string) => ActivityData
}
