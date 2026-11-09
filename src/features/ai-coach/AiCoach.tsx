import { useRef, useState } from 'react'
import AiCoachButton from './components/AiCoachButton'
import AiCoachPanel from './components/AiCoachPanel'
import { useAiCoach } from './hooks/useAiCoach'
import { MockAiCoachService } from './services/mockAiCoachService'
import type { AiCoachService } from './services/aiCoachService'
import type { LearningContext } from './types/chat'
import type { NewActivityInput } from '../../types/activity'
import './ai-coach.css'

const mockService = new MockAiCoachService()

export default function AiCoach({
  context,
  service = mockService,
  onSaveActivity,
}: {
  context: LearningContext
  service?: AiCoachService
  onSaveActivity: (input: NewActivityInput) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const coach = useAiCoach(service, context, onSaveActivity)
  function closePanel() {
    setOpen(false)
    buttonRef.current?.focus()
  }
  return (
    <>
      <AiCoachButton
        open={open}
        onClick={() => {
          if (open) closePanel()
          else setOpen(true)
        }}
        buttonRef={buttonRef}
      />
      {open && (
        <AiCoachPanel
          messages={coach.messages}
          input={coach.input}
          onInputChange={coach.setInput}
          isSending={coach.isSending}
          error={coach.error}
          onSend={coach.sendMessage}
          onClose={closePanel}
          context={context}
          draft={coach.draft}
          draftStage={coach.draftStage}
          isSaving={coach.isSaving}
          onCancelDraft={coach.cancelDraft}
          onEditDraft={coach.editDraft}
          onUpdateDraft={coach.updateDraft}
          onReviewDraft={coach.reviewDraft}
          onConfirmDraft={coach.confirmDraft}
        />
      )}
    </>
  )
}
