import type { Evidence } from '../../../types/activity'

export const draftFields = [
  'date',
  'learningPlan',
  'activity',
  'category',
  'hours',
  'status',
  'learned',
  'blockers',
  'nextStep',
] as const

export type DraftField = (typeof draftFields)[number]
export type DraftStage = 'collecting' | 'ready' | 'editing'

export interface ActivityDraft {
  id: string
  date?: string
  learningPlan?: string
  activity?: string
  category?: string
  hours?: number
  status?: string
  learned?: string
  blockers?: string
  nextStep?: string
  evidence?: Evidence
  awaitingFields?: DraftField[]
}

export interface DraftIssue {
  field: DraftField | 'evidence'
  message: string
}
