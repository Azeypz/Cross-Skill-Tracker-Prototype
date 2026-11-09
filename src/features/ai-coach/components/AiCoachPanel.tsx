import { useEffect, useRef } from 'react'
import { Bot, Send, X } from 'lucide-react'
import type { CoachMessage, LearningContext } from '../types/chat'
import type { ActivityDraft, DraftStage } from '../types/activityDraft'
import { suggestedPrompts } from '../services/mockAiCoachService'
import ChatMessage from './ChatMessage'
import ActivityConfirmationCard from './ActivityConfirmationCard'

interface AiCoachPanelProps {
  messages: CoachMessage[]
  input: string
  onInputChange: (input: string) => void
  isSending: boolean
  error: string
  onSend: (message?: string) => Promise<void>
  onClose: () => void
  context: LearningContext
  draft?: ActivityDraft
  draftStage: DraftStage
  isSaving: boolean
  onCancelDraft: () => void
  onEditDraft: () => void
  onUpdateDraft: (changes: Partial<Omit<ActivityDraft, 'id'>>) => void
  onReviewDraft: () => void
  onConfirmDraft: () => Promise<void>
}

export default function AiCoachPanel({
  messages,
  input,
  onInputChange,
  isSending,
  error,
  onSend,
  onClose,
  context,
  draft,
  draftStage,
  isSaving,
  onCancelDraft,
  onEditDraft,
  onUpdateDraft,
  onReviewDraft,
  onConfirmDraft,
}: AiCoachPanelProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  useEffect(() => {
    const log = logRef.current
    if (!log) return
    const latest = log.lastElementChild
    if (
      latest instanceof HTMLElement &&
      latest.offsetHeight > log.clientHeight - 36
    ) {
      log.scrollTop +=
        latest.getBoundingClientRect().top -
        log.getBoundingClientRect().top -
        18
    } else {
      log.scrollTop = log.scrollHeight
    }
  }, [messages.length, isSending, draftStage])

  return (
    <section
      id="ai-coach-panel"
      className="ai-coach-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="ai-coach-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <header className="ai-coach-header">
        <span className="ai-coach-header-icon">
          <Bot size={24} aria-hidden="true" />
        </span>
        <div>
          <h2 id="ai-coach-title">AI Learning Coach</h2>
          <p>Mock coach / Confirm before saving</p>
        </div>
        <button
          type="button"
          className="ai-coach-icon-button"
          onClick={onClose}
          aria-label="Close coach panel"
          title="Close coach panel"
        >
          <X size={19} />
        </button>
      </header>
      <div
        ref={logRef}
        className="ai-chat-log"
        role="log"
        aria-label="Coach conversation"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={isSending}
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isSending && (
          <p className="ai-chat-pending" role="status">
            Reading your learning records...
          </p>
        )}
        {draft && (
          <ActivityConfirmationCard
            draft={draft}
            context={context}
            stage={draftStage}
            isSending={isSending}
            isSaving={isSaving}
            onCancel={onCancelDraft}
            onEdit={onEditDraft}
            onChange={onUpdateDraft}
            onReview={onReviewDraft}
            onConfirm={onConfirmDraft}
          />
        )}
      </div>
      <div className="ai-coach-prompts" aria-label="Suggested prompts">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isSending || isSaving || draftStage === 'editing'}
            onClick={() => void onSend(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
      <form
        className="ai-coach-composer"
        onSubmit={(event) => {
          event.preventDefault()
          void onSend()
        }}
      >
        {error && (
          <p className="ai-coach-error" role="alert">
            {error}
          </p>
        )}
        <label className="visually-hidden" htmlFor="ai-coach-message">
          Message the AI Learning Coach
        </label>
        <div className="ai-coach-input-row">
          <textarea
            ref={inputRef}
            id="ai-coach-message"
            value={input}
            rows={2}
            maxLength={2000}
            readOnly={isSending || isSaving || draftStage === 'editing'}
            placeholder="Ask about your learning..."
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <button
            type="submit"
            className="ai-coach-send"
            disabled={
              isSending || isSaving || draftStage === 'editing' || !input.trim()
            }
            title="Send message"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </section>
  )
}
