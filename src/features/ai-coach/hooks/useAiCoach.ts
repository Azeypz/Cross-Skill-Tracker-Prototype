import { useRef, useState } from 'react'
import type { AiCoachService } from '../services/aiCoachService'
import type { CoachMessage, LearningContext } from '../types/chat'
import type { NewActivityInput } from '../../../types/activity'
import type { ActivityDraft, DraftStage } from '../types/activityDraft'
import {
  toActivityInput,
  validateActivityDraft,
} from '../services/draftValidation'

export function useAiCoach(
  service: AiCoachService,
  context: LearningContext,
  onSaveActivity: (input: NewActivityInput) => void | Promise<void>,
) {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! What would you like to explore in your learning?',
    },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<ActivityDraft>()
  const [draftStage, setDraftStage] = useState<DraftStage>('collecting')
  const [isSaving, setIsSaving] = useState(false)
  const sending = useRef(false)
  const saving = useRef(false)
  const requestId = useRef(0)
  const savedDrafts = useRef(new Set<string>())

  async function sendMessage(message = input) {
    const text = message.trim()
    if (!text || sending.current || saving.current || draftStage === 'editing')
      return
    const request = ++requestId.current
    sending.current = true
    setIsSending(true)
    setError('')
    setInput(text)
    if (draft) setDraftStage('collecting')
    setMessages((previous) => {
      const last = previous[previous.length - 1]
      if (last?.role === 'user' && last.text === text) return previous
      return [...previous, { id: crypto.randomUUID(), role: 'user', text }]
    })
    try {
      const response = await service.sendMessage(text, context, draft)
      if (request !== requestId.current) return
      if (response.draft) {
        setDraft(response.draft)
        setDraftStage(response.kind === 'draft' ? 'ready' : 'collecting')
      } else setDraftStage(draftStage)
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response.text,
          title: response.title,
          kind: response.kind,
        },
      ])
      setInput('')
    } catch {
      if (request !== requestId.current) return
      if (draft) setDraftStage('collecting')
      setError(
        'The coach is unavailable right now. Your message is kept. Please try again or use Add Activity.',
      )
    } finally {
      if (request === requestId.current) {
        sending.current = false
        setIsSending(false)
      }
    }
  }

  function cancelDraft() {
    if (saving.current) return
    ++requestId.current
    sending.current = false
    setIsSending(false)
    setDraft(undefined)
    setDraftStage('collecting')
    setError('')
    setInput('')
    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'Activity draft cancelled. Nothing was saved.',
      },
    ])
  }

  function editDraft() {
    if (sending.current || saving.current) return
    setDraftStage('editing')
    setError('')
  }

  function updateDraft(changes: Partial<Omit<ActivityDraft, 'id'>>) {
    if (draftStage !== 'editing' || saving.current) return
    setDraft((previous) =>
      previous ? { ...previous, ...changes, id: previous.id } : previous,
    )
    setError('')
  }

  function reviewDraft() {
    if (!draft || saving.current) return
    const issues = validateActivityDraft(draft, context)
    if (issues.length) {
      setError(issues[0].message)
      return
    }
    setDraftStage('ready')
    setError('')
  }

  async function confirmDraft() {
    if (
      !draft ||
      draftStage !== 'ready' ||
      sending.current ||
      saving.current ||
      savedDrafts.current.has(draft.id)
    )
      return
    saving.current = true
    setIsSaving(true)
    setError('')
    try {
      const input = toActivityInput(draft, context)
      await onSaveActivity(input)
      savedDrafts.current.add(draft.id)
      setDraft(undefined)
      setDraftStage('collecting')
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          kind: 'success',
          text: 'Activity added successfully.',
        },
      ])
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Activity was not saved. Please try again.',
      )
    } finally {
      saving.current = false
      setIsSaving(false)
    }
  }

  return {
    messages,
    input,
    setInput,
    isSending,
    error,
    sendMessage,
    draft,
    draftStage,
    isSaving,
    cancelDraft,
    editDraft,
    updateDraft,
    reviewDraft,
    confirmDraft,
  }
}
