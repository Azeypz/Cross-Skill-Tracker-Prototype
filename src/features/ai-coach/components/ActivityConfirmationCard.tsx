import { Check, Pencil, X } from 'lucide-react'
import type { ActivityDraft, DraftStage } from '../types/activityDraft'
import type { LearningContext } from '../types/chat'
import { formatActivityDate } from '../../../data/sampleActivities'
import ActivityDraftEditor from './ActivityDraftEditor'

export interface ActivityConfirmationProps {
  draft: ActivityDraft
  context: LearningContext
  stage: DraftStage
  isSending: boolean
  isSaving: boolean
  onCancel: () => void
  onEdit: () => void
  onChange: (changes: Partial<Omit<ActivityDraft, 'id'>>) => void
  onReview: () => void
  onConfirm: () => Promise<void>
}

export default function ActivityConfirmationCard(
  props: ActivityConfirmationProps,
) {
  const { draft, stage, isSending, isSaving } = props
  if (stage === 'editing')
    return (
      <section className="ai-draft-card">
        <ActivityDraftEditor
          draft={draft}
          context={props.context}
          onChange={props.onChange}
          onReview={props.onReview}
          onCancel={props.onCancel}
        />
      </section>
    )
  return (
    <section
      className="ai-draft-card"
      aria-label={
        stage === 'ready'
          ? 'Activity draft confirmation'
          : 'Pending activity draft'
      }
    >
      <h3>
        {stage === 'ready'
          ? 'Ready to add activity'
          : 'Activity draft in progress'}
      </h3>
      {stage === 'ready' && (
        <dl className="ai-draft-details">
          <dt>Date</dt>
          <dd>{formatActivityDate(draft.date!)}</dd>
          <dt>Learning Plan</dt>
          <dd>{draft.learningPlan}</dd>
          <dt>Activity</dt>
          <dd>{draft.activity}</dd>
          <dt>Category</dt>
          <dd>{draft.category}</dd>
          <dt>Hours</dt>
          <dd>{draft.hours}</dd>
          <dt>Status</dt>
          <dd>{draft.status}</dd>
          <dt>Learned</dt>
          <dd>{draft.learned}</dd>
          <dt>Blocker</dt>
          <dd>{draft.blockers}</dd>
          <dt>Next Step</dt>
          <dd>{draft.nextStep}</dd>
          {draft.evidence && (
            <>
              <dt>Evidence metadata</dt>
              <dd>
                {draft.evidence.name} / {draft.evidence.type} /{' '}
                {draft.evidence.size} bytes
              </dd>
            </>
          )}
        </dl>
      )}
      <div className="ai-draft-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={isSending || isSaving}
          onClick={props.onEdit}
        >
          <Pencil size={13} aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={isSaving}
          onClick={props.onCancel}
        >
          <X size={13} aria-hidden="true" />
          Cancel
        </button>
        {stage === 'ready' && (
          <button
            type="button"
            className="primary-button"
            disabled={isSending || isSaving}
            onClick={() => void props.onConfirm()}
          >
            <Check size={14} aria-hidden="true" />
            {isSaving ? 'Saving...' : 'Confirm & Save'}
          </button>
        )}
      </div>
    </section>
  )
}
