import type { ActivityDraft, DraftField } from '../types/activityDraft'
import type { AgentResponse, LearningContext } from '../types/chat'
import { findPlan, normalized, validateActivityDraft } from './draftValidation'

const aliases: Record<string, DraftField> = {
  date: 'date',
  'learning plan': 'learningPlan',
  plan: 'learningPlan',
  'milestone / activity': 'activity',
  milestone: 'activity',
  activity: 'activity',
  task: 'activity',
  category: 'category',
  hours: 'hours',
  'hours spent': 'hours',
  status: 'status',
  'task status': 'status',
  learned: 'learned',
  'what i learned': 'learned',
  'what did you learn?': 'learned',
  reflection: 'learned',
  blocker: 'blockers',
  blockers: 'blockers',
  'challenges / blockers': 'blockers',
  challenges: 'blockers',
  'next step': 'nextStep',
}
const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
}

function escapePattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mentions(text: string, value: string) {
  return new RegExp(
    `(?:^|[^a-z0-9])${escapePattern(value)}(?:$|[^a-z0-9])`,
    'i',
  ).test(text)
}

function sessionDate(value: string, now: Date) {
  const text = normalized(value).replace(/[.!]$/, '')
  if (text === 'today' || text === 'yesterday') {
    const date = new Date(now)
    if (text === 'yesterday') date.setDate(date.getDate() - 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  const written = text.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (written) {
    const months = [
      'jan january',
      'feb february',
      'mar march',
      'apr april',
      'may',
      'jun june',
      'jul july',
      'aug august',
      'sep september',
      'oct october',
      'nov november',
      'dec december',
    ]
    const month = months.findIndex((names) =>
      names.split(' ').includes(written[1]),
    )
    if (month >= 0)
      return `${written[3]}-${String(month + 1).padStart(2, '0')}-${written[2].padStart(2, '0')}`
  }
  return value.trim()
}

function assign(
  draft: ActivityDraft,
  field: DraftField,
  value: string,
  now: Date,
) {
  const text = value.trim().replace(/[.!]$/, '').trim()
  if (field === 'date') draft.date = sessionDate(text, now)
  else if (field === 'hours') {
    const amount = text.replace(/\s*(?:hours?|hrs?)\.?$/i, '').trim()
    draft.hours = numberWords[normalized(amount)] ?? Number(amount)
  } else if (field === 'status') {
    const status = normalized(text)
    draft.status = /^(?:completed|complete|finished|done)$/.test(status)
      ? 'Completed'
      : /^(?:in progress|ongoing|still working)$/.test(status)
        ? 'In Progress'
        : text
  } else draft[field] = text
}

export function looksLikeActivity(message: string) {
  return /\b(?:i (?:studied|practiced|practised|worked on|learned|completed)|learning session|(?:help me |please )?(?:add|log|record) (?:an?|my) activity)\b|(?:^|[;\n])\s*(?:date|learning plan|activity|hours)\s*:/i.test(
    message,
  )
}

export function collectActivityDraft(
  message: string,
  context: LearningContext,
  previous?: ActivityDraft,
  now = new Date(),
): AgentResponse {
  const draft: ActivityDraft = {
    ...previous,
    id: previous?.id ?? crypto.randomUUID(),
  }
  const changes: ActivityDraft = { id: draft.id }
  const labelPattern = Object.keys(aliases)
    .sort((first, second) => second.length - first.length)
    .map(escapePattern)
    .join('|')
  const labels = new RegExp(
    `(?:^|[;\\n]|\\.\\s+)\\s*(${labelPattern})\\s*:\\s*([\\s\\S]*?)(?=(?:[;\\n]|\\.\\s+)\\s*(?:${labelPattern})\\s*:|$)`,
    'gi',
  )
  for (const match of message.matchAll(labels))
    assign(changes, aliases[normalized(match[1])], match[2], now)

  if (!changes.date) {
    const explicitDate = message.match(/\b\d{4}-\d{2}-\d{2}\b/)
    const relativeDate = message.match(/\b(today|yesterday)\b/i)
    const writtenDate = message.match(
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/i,
    )
    const suppliedDate = explicitDate ?? relativeDate ?? writtenDate
    if (suppliedDate) changes.date = sessionDate(suppliedDate[0], now)
  }
  if (changes.hours === undefined) {
    const hours = message.match(/(-?\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i)
    const wordHours = message.match(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+hours?\b/i,
    )
    if (hours) changes.hours = Number(hours[1])
    else if (wordHours) changes.hours = numberWords[wordHours[1].toLowerCase()]
    else if (/\bhalf an hour\b/i.test(message)) changes.hours = 0.5
    else if (/\ban hour\b/i.test(message)) changes.hours = 1
  }
  if (!changes.learningPlan) {
    const matched = [...context.learningPlans]
      .sort((first, second) => second.name.length - first.name.length)
      .find((plan) => mentions(message, plan.name))
    if (matched) changes.learningPlan = matched.name
    else {
      const naturalPlan = message.match(
        /\b(?:under|learning plan (?:is|called))\s+["']?([^\n;,."']+)/i,
      )
      if (naturalPlan) changes.learningPlan = naturalPlan[1].trim()
      else if (
        previous?.awaitingFields?.includes('learningPlan') &&
        message.includes(',')
      ) {
        changes.learningPlan = message.split(',')[0].trim()
      }
    }
  }
  const plan = findPlan({ ...draft, ...changes }, context)
  if (!changes.activity) {
    const milestone = plan?.milestones.find((item) =>
      mentions(message, item.title),
    )
    if (milestone) changes.activity = milestone.title
    else {
      const task = message.match(
        /\bI (?:studied|practiced|practised|worked on)\s+(.+?)\s+for\s+(?:-?\d|one\b|two\b|three\b|four\b|half\b)/i,
      )
      if (task) changes.activity = task[1].trim()
      else if (changes.learningPlan && message.includes(',')) {
        const segments = message.split(',')
        if (mentions(segments[0], changes.learningPlan))
          changes.activity = segments[1].split(/[.!;\n]/)[0].trim()
      }
    }
  }
  if (!changes.category) {
    const category = message.match(
      /\bcategory (?:is|should be)\s+["']?([^\n;,."']+)/i,
    )
    if (category) changes.category = category[1].trim()
    else if (previous?.awaitingFields?.includes('category')) {
      const matched = context.categories?.find(
        (item) => normalized(item) === normalized(message.replace(/[.!]$/, '')),
      )
      if (matched) changes.category = matched
    }
  }
  if (!changes.status) {
    if (
      /\b(?:not|never|haven't|hasn't)\s+(?:completed|finished)\b|\bI (?:completed|finished) nothing\b/i.test(
        message,
      )
    )
      changes.status = 'Not completed'
    else if (/\b(?:in progress|still working)\b/i.test(message))
      changes.status = 'In Progress'
    else if (
      /\b(?:I (?:completed|finished)|I am done|it is completed)\b/i.test(
        message,
      )
    )
      changes.status = 'Completed'
    else if (/^\s*(?:completed|in progress)[.!]?\s*$/i.test(message))
      assign(changes, 'status', message, now)
    else if (previous?.awaitingFields?.includes('status')) {
      const supplied = message
        .split(/[,;\n]/)
        .find((part) => /^(?:completed|in progress)[.!]?$/i.test(part.trim()))
      if (supplied) assign(changes, 'status', supplied, now)
    }
  }
  if (!changes.learned) {
    const learning = message.match(/\bI (?:learned|learnt)\s+([^\n.!?]+)/i)
    if (learning) changes.learned = learning[1].trim()
  }
  if (!changes.blockers) {
    if (
      /\b(?:no blockers|no challenges|no issues|did not encounter (?:any )?blockers)\b/i.test(
        message,
      )
    )
      changes.blockers = 'None'
    else {
      const blocker = message.match(
        /\b(?:I am still confused|I'm still confused|Still confused|I struggled|I got stuck)\b[^\n.!?]*/i,
      )
      if (blocker) changes.blockers = blocker[0].trim()
    }
  }
  if (!changes.nextStep) {
    const next = message.match(
      /\b(?:next(?: step)?\s*[:,]|I (?:will|plan to))\s*([^\n.!?]+)/i,
    )
    if (next) changes.nextStep = next[1].trim()
  }
  if (
    Object.keys(changes).length === 1 &&
    previous?.awaitingFields?.length &&
    !/^(?:save|confirm|cancel|edit)\b/i.test(message.trim())
  ) {
    assign(changes, previous.awaitingFields[0], message, now)
  }
  if (
    changes.learningPlan &&
    normalized(changes.learningPlan) !== normalized(draft.learningPlan ?? '') &&
    !changes.activity
  )
    delete draft.activity
  Object.assign(draft, changes)
  const issues = validateActivityDraft(draft, context)
  if (!issues.length) {
    draft.awaitingFields = []
    return {
      kind: 'draft',
      draft,
      text: 'Your draft is ready to review. Nothing is saved until you click Confirm & Save.',
    }
  }
  const unknown = issues.find((issue) =>
    issue.message.startsWith("I couldn't find"),
  )
  const questions = unknown ? [unknown] : issues.slice(0, 2)
  draft.awaitingFields = questions.flatMap((issue) =>
    issue.field === 'evidence' ? [] : [issue.field],
  )
  return {
    kind: 'question',
    draft,
    text: questions.map((issue) => issue.message).join(' '),
  }
}
