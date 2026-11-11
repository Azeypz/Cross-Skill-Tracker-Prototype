export type LearningLevel = 'beginner' | 'intermediate' | 'advanced'

export type LearningActivityType =
  | 'lesson'
  | 'reading'
  | 'video'
  | 'lab'
  | 'practice'
  | 'assessment'
  | 'review'

export interface LearningPlanActivityDraft {
  title: string
  description: string
  type: LearningActivityType
  estimatedHours: number
  resourceUrl?: string
  status: 'not-started'
}

export interface LearningPlanWeekDraft {
  weekNumber: number
  title: string
  objective: string
  estimatedHours: number
  activities: LearningPlanActivityDraft[]
}

export interface LearningPlanDraft {
  id: string
  title: string
  category: string
  skill: string
  currentLevel: LearningLevel
  goal: string
  startDate: string
  durationWeeks: number
  studyDaysPerWeek: number
  hoursPerStudyDay: number
  totalEstimatedHours: number
  weeklyPlans: LearningPlanWeekDraft[]
}