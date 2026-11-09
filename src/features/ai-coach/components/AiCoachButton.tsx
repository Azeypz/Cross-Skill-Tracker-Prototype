import type { Ref } from 'react'
import { Bot } from 'lucide-react'

export default function AiCoachButton({
  open,
  onClick,
  buttonRef,
}: {
  open: boolean
  onClick: () => void
  buttonRef: Ref<HTMLButtonElement>
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="ai-coach-launcher"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={open ? 'ai-coach-panel' : undefined}
      aria-haspopup="dialog"
      aria-label={open ? 'Close AI Learning Coach' : 'Open AI Learning Coach'}
      title="AI Learning Coach"
    >
      <Bot size={23} aria-hidden="true" />
      <span>AI Coach</span>
    </button>
  )
}
