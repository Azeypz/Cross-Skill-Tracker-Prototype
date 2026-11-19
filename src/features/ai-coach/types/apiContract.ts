import { z } from 'zod'
import { learningPlanStatuses } from '../../../types/activity'

const evidenceSchema = z
  .object({
    name: z.string().max(500),
    size: z.number().finite().nonnegative(),
    type: z.string().max(200),
  })
  .strict()

const milestoneSchema = z
  .object({
    id: z.string().min(1).max(200),
    title: z.string().max(500),
    required: z.boolean(),
    status: z.enum(['Not Started', 'In Progress', 'Completed']),
    estimatedHours: z.number().finite().positive().optional(),
  })
  .strict()

const learningPlanSchema = z
  .object({
    status: z.enum(learningPlanStatuses).default('Not Started'),
    id: z.string().min(1).max(200),
    name: z.string().max(500),
    description: z.string().optional(),
    targetSkill: z.string().optional(),
    targetCompletionDate: z.string().optional(),
    category: z.string().optional(),
    plannedHours: z.number().finite().positive().optional(),
    milestones: z.array(milestoneSchema).max(500),
  })
  .strict()

const activitySchema = z
  .object({
    id: z.string().min(1).max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    title: z.string().max(2000),
    learningPlanId: z.string().min(1).max(200),
    milestoneId: z.string().max(200).nullable(),
    category: z.string().max(500),
    hours: z.number().finite().positive().max(24).optional(),
    status: z.enum(['Not Started', 'Completed', 'In Progress']),
    reflection: z
      .object({
        learning: z.string().max(5000),
        blockers: z.string().max(5000),
        nextStep: z.string().max(5000),
      })
      .strict(),
    evidence: evidenceSchema.optional(),
  })
  .strict()

const draftSchema = z
  .object({
    id: z.string().min(1).max(200),
    date: z.string().max(100).optional(),
    learningPlan: z.string().max(500).optional(),
    activity: z.string().max(2000).optional(),
    category: z.string().max(500).optional(),
    hours: z.number().finite().optional(),
    status: z.string().max(100).optional(),
    learned: z.string().max(5000).optional(),
    blockers: z.string().max(5000).optional(),
    nextStep: z.string().max(5000).optional(),
    evidence: evidenceSchema.optional(),
    awaitingFields: z
      .array(
        z.enum([
          'date',
          'learningPlan',
          'activity',
          'category',
          'hours',
          'status',
          'learned',
          'blockers',
          'nextStep',
        ]),
      )
      .max(9)
      .optional(),
  })
  .strict()

const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const learningPlanActivitySchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    description: z.string().trim().min(1).max(2000),
    type: z.enum([
      'lesson',
      'reading',
      'video',
      'lab',
      'practice',
      'assessment',
      'review',
    ]),
    estimatedHours: z.number().finite().positive().max(24),
    resourceUrl: z.string().url().max(2048).optional(),
    status: z.literal('not-started'),
  })
  .strict()

const learningPlanWeekSchema = z
  .object({
    weekNumber: z.number().int().min(1).max(52),
    title: z.string().trim().min(1).max(500),
    objective: z.string().trim().min(1).max(2000),
    estimatedHours: z.number().finite().positive().max(168),
    activities: z.array(learningPlanActivitySchema).min(1).max(30),
  })
  .strict()
  .superRefine((week, context) => {
    const activityHours = week.activities.reduce(
      (total, activity) => total + activity.estimatedHours,
      0,
    )
    if (activityHours > week.estimatedHours + 0.01)
      context.addIssue({
        code: 'custom',
        path: ['activities'],
        message: 'Activity hours cannot exceed the weekly estimate.',
      })
  })

export const learningPlanDraftSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(500),
    category: z.string().trim().min(1).max(500),
    skill: z.string().trim().min(1).max(500),
    currentLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    goal: z.string().trim().min(1).max(2000),
    startDate: z.string().refine(validDate, 'Enter a valid start date.'),
    durationWeeks: z.number().int().min(1).max(52),
    studyDaysPerWeek: z.number().int().min(1).max(7),
    hoursPerStudyDay: z.number().finite().positive().max(24),
    totalEstimatedHours: z.number().finite().positive().max(8736),
    weeklyPlans: z.array(learningPlanWeekSchema).min(1).max(52),
  })
  .strict()
  .superRefine((plan, context) => {
    const weeklyAvailability = plan.studyDaysPerWeek * plan.hoursPerStudyDay
    const availableStudyBudget = plan.durationWeeks * weeklyAvailability
    if (plan.weeklyPlans.length !== plan.durationWeeks)
      context.addIssue({
        code: 'custom',
        path: ['weeklyPlans'],
        message: 'There must be one weekly plan for each duration week.',
      })
    plan.weeklyPlans.forEach((week, index) => {
      if (week.weekNumber !== index + 1)
        context.addIssue({
          code: 'custom',
          path: ['weeklyPlans', index, 'weekNumber'],
          message: 'Weekly plan numbers must be ordered from 1 to duration.',
        })
      if (week.estimatedHours > weeklyAvailability + 0.01)
        context.addIssue({
          code: 'custom',
          path: ['weeklyPlans', index, 'estimatedHours'],
          message: 'Weekly hours cannot exceed the available study time.',
        })
    })
    const weeklyEstimate = plan.weeklyPlans.reduce(
      (total, week) => total + week.estimatedHours,
      0,
    )
    if (plan.totalEstimatedHours > availableStudyBudget + 0.01)
      context.addIssue({
        code: 'custom',
        path: ['totalEstimatedHours'],
        message: 'Total hours cannot exceed the available study budget.',
      })
    if (Math.abs(plan.totalEstimatedHours - weeklyEstimate) > 0.01)
      context.addIssue({
        code: 'custom',
        path: ['totalEstimatedHours'],
        message: 'Total hours must match the weekly estimates.',
      })
  })

const agentIntentSchema = z.enum([
  'GET_RECENT_ACTIVITIES',
  'GET_NEXT_RECOMMENDATION',
  'CREATE_ACTIVITY',
  'CREATE_LEARNING_PLAN',
  'UNKNOWN',
])

const agentWorkflowStepSchema = z.enum([
  'DETECTING_INTENT',
  'READING_CONTEXT',
  'COLLECTING_INFORMATION',
  'VALIDATING',
  'AWAITING_CONFIRMATION',
  'EXECUTING',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
])

const pendingAgentActionSchema = z.discriminatedUnion('type', [
  z.object({
    actionId: z.string().min(1).max(200),
    type: z.literal('CREATE_ACTIVITY'),
    payload: draftSchema,
  }).strict(),
  z.object({
    actionId: z.string().min(1).max(200),
    type: z.literal('CREATE_LEARNING_PLAN'),
    payload: learningPlanDraftSchema,
  }).strict(),
])

const agentWorkflowStateSchema = z
  .object({
    workflowId: z.string().min(1).max(200),
    intent: agentIntentSchema,
    step: agentWorkflowStepSchema,
    collectedFields: z.record(z.string(), z.unknown()),
    missingFields: z.array(z.string().max(100)).max(30),
    validationErrors: z.array(z.string().max(1000)).max(30),
    pendingAction: pendingAgentActionSchema.optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()

export const aiCoachRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(4000),
    conversationId: z.string().trim().min(1).max(200),
    idempotencyKey: z.string().trim().min(1).max(200),
    workflowState: agentWorkflowStateSchema.optional(),
    context: z
      .object({
        activities: z.array(activitySchema).max(1000),
        learningPlans: z.array(learningPlanSchema).max(500),
        completedLearningPlans: z.array(learningPlanSchema).max(500),
        eligibleLearningPlans: z.array(learningPlanSchema).max(500),
        categories: z.array(z.string().max(500)).max(500).optional(),
        dataUnavailable: z.boolean().optional(),
      })
      .strict(),
    draft: draftSchema.optional(),
  })
  .strict()

const responseText = z.string().max(10000)
const responseTitle = z.string().max(500).optional()
const workflowResponseFields = {
  message: responseText,
  intent: agentIntentSchema,
  responseType: z.enum([
    'MESSAGE',
    'FOLLOW_UP',
    'RECOMMENDATION',
    'CONFIRMATION_REQUIRED',
    'SUCCESS',
    'ERROR',
  ]),
  workflowState: agentWorkflowStateSchema,
  pendingAction: pendingAgentActionSchema.optional(),
  validationErrors: z.array(z.string().max(1000)).max(30).optional(),
}

export const agentResponseSchema = z.discriminatedUnion('kind', [
  z.object({ ...workflowResponseFields, kind: z.literal('chat'), text: responseText, title: responseTitle }).strict(),
  z.object({ ...workflowResponseFields, kind: z.literal('answer'), text: responseText, title: responseTitle }).strict(),
  z.object({ ...workflowResponseFields, kind: z.literal('recommendation'), text: responseText, title: responseTitle }).strict(),
  z.object({ ...workflowResponseFields, kind: z.literal('question'), text: responseText, title: responseTitle, draft: draftSchema.optional() }).strict(),
  z.object({ ...workflowResponseFields, kind: z.literal('activity-draft'), text: responseText, title: responseTitle, draft: draftSchema }).strict(),
  z.object({ ...workflowResponseFields, kind: z.literal('draft'), text: responseText, title: responseTitle, draft: draftSchema }).strict(),
  z.object({ ...workflowResponseFields, kind: z.literal('learning-plan-draft'), text: responseText, title: responseTitle, learningPlanDraft: learningPlanDraftSchema }).strict(),
  z.object({ ...workflowResponseFields, kind: z.literal('success'), text: responseText, title: responseTitle }).strict(),
  z.object({ ...workflowResponseFields, kind: z.literal('error'), text: responseText, title: responseTitle }).strict(),
])