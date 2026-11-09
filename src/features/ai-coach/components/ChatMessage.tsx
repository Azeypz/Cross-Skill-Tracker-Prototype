import { Bot, UserRound } from 'lucide-react'
import type { CoachMessage } from '../types/chat'

export default function ChatMessage({ message }: { message: CoachMessage }) {
  const Icon = message.role === 'assistant' ? Bot : UserRound
  return (
    <div
      className={`ai-chat-message ai-chat-message-${message.role}${message.kind ? ` ai-chat-${message.kind}` : ''}`}
    >
      <span
        className="ai-chat-avatar"
        aria-label={message.role === 'assistant' ? 'Coach' : 'You'}
      >
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="ai-chat-message-content">
        {message.kind === 'question' && (
          <strong className="ai-question-label">More information needed</strong>
        )}
        {message.title && (
          <strong className="ai-recommendation-label">{message.title}</strong>
        )}
        <p role={message.kind === 'success' ? 'status' : undefined}>
          {message.text}
        </p>
      </div>
    </div>
  )
}
