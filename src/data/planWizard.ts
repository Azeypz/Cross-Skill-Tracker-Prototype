import { z } from 'zod'
import { learningPlanStatuses, type LearningPlan } from '../types/activity'
import { validActivityHours, activityHoursError } from './activityHours'

export const planCategories = [
  'Database Administration', 'Oracle', 'Sybase DBA', 'Exasol', 'PostgreSQL',
  'Agentic AI', 'AWS', 'Azure', 'GCP', 'Claude', 'BenchFlow', 'Capdev Portal',
  'Facilitated Training', 'Agentic Garage Session', 'Other Trainings for Upskilling/Cross-skilling',
  'MAGS and IIS Additional Trainings', 'Interview Mandatory Training', 'Mandatory Training', 'Other',
] as const
export const proficiencies = ['Foundational awareness', 'Beginner', 'Working knowledge', 'Intermediate', 'Advanced', 'Certification ready'] as const
export const formats = ['Course / Training', 'Lab', 'Hands-on Practice', 'Review', 'Mock Exam', 'Certification', 'Assessment', 'Workshop', 'Self-Study', 'Other'] as const
export const evidenceOptions = ['Screenshot', 'Lab result', 'Course completion', 'Certificate', 'Assessment result', 'Presentation', 'Document', 'Other', 'None'] as const
export const needsRemarks = (category: string) => ['Other Trainings for Upskilling/Cross-skilling', 'MAGS and IIS Additional Trainings', 'Interview Mandatory Training', 'Other'].includes(category)
const title = z.string().trim().min(1).max(500)
const url = z.union([z.literal(''), z.url({ protocol: /^https?$/ })])
const status = z.enum(learningPlanStatuses)
export const detailsSchema = z.object({
  name: title, description: z.string().trim().min(1), targetSkill: title,
  category: z.string().refine((value) => planCategories.some((c) => c === value), 'Select a category.'),
  customCategory: z.string().trim().max(500), targetProficiency: z.enum(proficiencies),
  startDate: z.iso.date(), targetCompletionDate: z.iso.date(), status,
  resourceUrl: url, remarks: z.string().trim(), plannedHours: z.number().positive().optional(),
}).refine((p) => p.targetCompletionDate >= p.startDate, { message: 'Target completion cannot precede the start date.', path: ['targetCompletionDate'] })
  .refine((p) => p.category !== 'Other' || !!p.customCategory, { message: 'Enter a custom category.', path: ['customCategory'] })
  .refine((p) => !needsRemarks(p.category) || !!p.remarks, { message: 'Enter remarks for this category.', path: ['remarks'] })

const proposedSchema = z.object({
  id: z.uuid(), title: z.string().trim().max(500), description: z.string().trim(), format: z.enum(formats),
  estimatedHours: z.number().optional().refine(validActivityHours, activityHoursError),
  resourceUrl: url, evidenceExpected: z.enum(evidenceOptions),
})
const checkpointSchema = z.object({
  id: z.uuid(), title, dueDate: z.iso.date(), completionCriteria: z.string().trim().min(1),
  required: z.boolean(), initialStatus: status,
})
const milestoneSchema = checkpointSchema.extend({ proposedActivities: z.array(proposedSchema) })
export type ProposedActivity = z.infer<typeof proposedSchema>
export type WizardMilestone = z.infer<typeof milestoneSchema>
export type PlanDetails = z.infer<typeof detailsSchema>
export type PlanWizard = PlanDetails & { milestones: WizardMilestone[] }
export type CreationState = 'Draft' | 'Created'

export function newProposal(): ProposedActivity {
  return { id: crypto.randomUUID(), title: '', description: '', format: 'Course / Training', resourceUrl: '', evidenceExpected: 'None' }
}
export function newCheckpoint(): WizardMilestone {
  return { id: crypto.randomUUID(), title: '', dueDate: '', completionCriteria: '', required: true,
    initialStatus: 'Not Started', proposedActivities: [newProposal()] }
}

export function startWizard(draft?: LearningPlan): PlanWizard {
  return {
    name: draft?.name ?? '', description: draft?.description ?? '', targetSkill: draft?.targetSkill ?? '',
    category: draft?.categoryIsCustom ? 'Other' : draft?.category ?? '',
    customCategory: draft?.categoryIsCustom ? draft.category ?? '' : '',
    targetProficiency: draft?.targetProficiency ?? 'Working knowledge', startDate: draft?.startDate ?? '',
    targetCompletionDate: draft?.targetCompletionDate ?? '', status: draft?.status ?? 'Not Started',
    resourceUrl: draft?.resourceUrl ?? '', remarks: draft?.remarks ?? '', plannedHours: draft?.plannedHours,
    milestones: draft?.milestones.map((m) => ({
      id: m.id, title: m.title, dueDate: m.dueDate ?? '', completionCriteria: m.completionCriteria ?? '',
      required: m.required, initialStatus: m.initialStatus ?? 'Not Started', proposedActivities: m.proposedActivities ?? [],
    })) ?? [newCheckpoint(), newCheckpoint()],
  }
}

export function wizardError(plan: PlanWizard, step: 1 | 2 | 3, state: CreationState = 'Created'): string {
  if (step === 1) {
    const result = detailsSchema.safeParse(plan)
    if (!result.success) {
      const issue = result.error.issues[0]
      return `${issue.path.join('.')}: ${issue.message}`
    }
    return ''
  }
  if (!plan.milestones.length || plan.milestones.length > 500) return 'Enter between 1 and 500 milestones.'
  const ids = new Set<string>()
  for (const [i, m] of plan.milestones.entries()) {
    const prefix = `Milestone ${i + 1}`
    if (ids.has(m.id)) return `${prefix}: duplicate milestone ID.`
    ids.add(m.id)
    if (step === 2) {
      const parsed = checkpointSchema.safeParse(m)
      if (!parsed.success) return `${prefix}: check ${parsed.error.issues[0].path.join('.')}.`
      if (m.dueDate < plan.startDate || m.dueDate > plan.targetCompletionDate)
        return `${prefix}: due date must be within the plan dates.`
    } else {
      for (const [j, activity] of m.proposedActivities.entries()) {
        const parsed = proposedSchema.safeParse(activity)
        if (!parsed.success) return `${prefix}, activity ${j + 1}: ${parsed.error.issues[0].path.join('.')} — ${parsed.error.issues[0].message}`
        if (state === 'Created' && !parsed.data.title) return `${prefix}, activity ${j + 1}: enter a title or remove the activity.`
        if (ids.has(activity.id)) return `${prefix}: duplicate activity ID.`
        ids.add(activity.id)
      }
    }
  }
  return ''
}
