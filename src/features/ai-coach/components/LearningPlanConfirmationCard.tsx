import { Check, Pencil, X } from 'lucide-react'
import type { DraftStage } from '../types/activityDraft'
import type { LearningPlanDraft } from '../types/learningPlanDraft'
import LearningPlanDraftEditor from './LearningPlanDraftEditor'

interface LearningPlanConfirmationCardProps {
  draft: LearningPlanDraft
  stage: DraftStage
  isSending: boolean
  isSaving: boolean
  onCancel: () => void
  onEdit: () => void
  onChange: (changes: Partial<Omit<LearningPlanDraft, 'id'>>) => void
  onReview: () => void
  onConfirm: () => Promise<void>
}

function hours(value: number) {
  return `${Number(value.toFixed(2))} ${value === 1 ? 'hour' : 'hours'}`
}

export default function LearningPlanConfirmationCard({
  draft,
  stage,
  isSending,
  isSaving,
  onCancel,
  onEdit,
  onChange,
  onReview,
  onConfirm,
}: LearningPlanConfirmationCardProps) {
  if (stage === 'editing')
    return (
      <section className="ai-draft-card learning-plan-card">
        <LearningPlanDraftEditor
          draft={draft}
          onChange={onChange}
          onReview={onReview}
          onCancel={onCancel}
        />
      </section>
    )

  return (
    <section
      className="ai-draft-card learning-plan-card"
      aria-label="Learning plan draft preview"
    >
      <h3>Learning plan preview</h3>
      <dl className="ai-draft-details">
        <dt>Plan</dt>
        <dd>{draft.title}</dd>
        <dt>Skill / category</dt>
        <dd>{draft.skill} / {draft.category}</dd>
        <dt>Current level</dt>
        <dd>{draft.currentLevel}</dd>
        <dt>Goal</dt>
        <dd>{draft.goal}</dd>
        <dt>Starts</dt>
        <dd>{draft.startDate}</dd>
        <dt>Duration</dt>
        <dd>{draft.durationWeeks} weeks</dd>
        <dt>Study commitment</dt>
        <dd>
          {draft.studyDaysPerWeek} days/week × {hours(draft.hoursPerStudyDay)}/day
          <br />
          {hours(draft.studyDaysPerWeek * draft.hoursPerStudyDay)} per week ·{' '}
          {hours(draft.totalEstimatedHours)} total
        </dd>
      </dl>
      <div className="learning-plan-week-list">
        {draft.weeklyPlans.map((week) => (
          <section className="learning-plan-preview-week" key={week.weekNumber}>
            <div className="learning-plan-week-heading">
              <h4>{week.title}</h4>
              <span>{hours(week.estimatedHours)}</span>
            </div>
            <p>{week.objective}</p>
            <ul>
              {week.activities.map((activity, index) => (
                <li key={`${week.weekNumber}-${index}`}>
                  <strong>{activity.title}</strong>
                  <span>{activity.description}</span>
                  <small>
                    {activity.type} · {hours(activity.estimatedHours)} · Not started
                  </small>
                  {activity.resourceUrl && (
                    <a href={activity.resourceUrl} target="_blank" rel="noreferrer">
                      Open resource
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="ai-draft-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={isSending || isSaving}
          onClick={onEdit}
        >
          <Pencil size={13} aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={isSaving}
          onClick={onCancel}
        >
          <X size={13} aria-hidden="true" />
          Cancel
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={isSending || isSaving}
          onClick={() => void onConfirm()}
        >
          <Check size={14} aria-hidden="true" />
          {isSaving ? 'Saving...' : 'Confirm & Save'}
        </button>
      </div>
    </section>
  )
}