import { z } from 'zod'

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
  })
  .strict()

const learningPlanSchema = z
  .object({
    id: z.string().min(1).max(200),
    name: z.string().max(500),
    description: z.string().optional(),
    targetSkill: z.string().optional(),
    targetCompletionDate: z.string().optional(),
    category: z.string().optional(),
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
    hours: z.number().finite().positive().max(24),
    status: z.enum(['Completed', 'In Progress']),
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

export const aiCoachRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(4000),
    context: z
      .object({
        activities: z.array(activitySchema).max(1000),
        learningPlans: z.array(learningPlanSchema).max(500),
        categories: z.array(z.string().max(500)).max(500).optional(),
        dataUnavailable: z.boolean().optional(),
      })
      .strict(),
    draft: draftSchema.optional(),
  })
  .strict()

export const agentResponseSchema = z
  .object({
    kind: z.enum(['answer', 'recommendation', 'question', 'draft']),
    text: z.string().max(10000),
    title: z.string().max(500).optional(),
    draft: draftSchema.optional(),
  })
  .strict()