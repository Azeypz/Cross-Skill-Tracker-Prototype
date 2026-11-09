import FormField from '../../../components/FormField'
import type { ActivityDraft } from '../types/activityDraft'
import type { LearningContext } from '../types/chat'
import { findPlan, validateActivityDraft } from '../services/draftValidation'

interface ActivityDraftEditorProps {
  draft: ActivityDraft
  context: LearningContext
  onChange: (changes: Partial<Omit<ActivityDraft, 'id'>>) => void
  onReview: () => void
  onCancel: () => void
}

export default function ActivityDraftEditor({
  draft,
  context,
  onChange,
  onReview,
  onCancel,
}: ActivityDraftEditorProps) {
  const plan = findPlan(draft, context)
  const issues = validateActivityDraft(draft, context)
  return (
    <form
      className="ai-draft-editor"
      aria-label="Edit activity draft"
      onSubmit={(event) => {
        event.preventDefault()
        onReview()
      }}
    >
      <h3>Edit activity draft</h3>
      <FormField id="draft-date" label="Date" required>
        <input
          id="draft-date"
          type="date"
          value={draft.date ?? ''}
          required
          onChange={(event) => onChange({ date: event.target.value })}
        />
      </FormField>
      <FormField id="draft-plan" label="Learning Plan" required>
        <select
          id="draft-plan"
          value={plan?.name ?? draft.learningPlan ?? ''}
          required
          onChange={(event) =>
            onChange({ learningPlan: event.target.value, activity: undefined })
          }
        >
          <option value="" disabled>
            Select a learning plan
          </option>
          {draft.learningPlan && !plan && (
            <option value={draft.learningPlan} disabled>
              {draft.learningPlan} (not found)
            </option>
          )}
          {context.learningPlans.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField id="draft-activity" label="Milestone / Activity" required>
        {plan?.milestones.length ? (
          <select
            id="draft-activity"
            value={
              plan.milestones.find(
                (item) =>
                  item.title.toLowerCase() === draft.activity?.toLowerCase(),
              )?.title ?? ''
            }
            required
            onChange={(event) => onChange({ activity: event.target.value })}
          >
            <option value="" disabled>
              Select an existing milestone
            </option>
            {plan.milestones.map((item) => (
              <option key={item.id}>{item.title}</option>
            ))}
          </select>
        ) : (
          <input
            id="draft-activity"
            value={draft.activity ?? ''}
            required
            onChange={(event) => onChange({ activity: event.target.value })}
          />
        )}
      </FormField>
      <FormField id="draft-category" label="Category" required>
        <select
          id="draft-category"
          value={
            context.categories?.find(
              (item) => item.toLowerCase() === draft.category?.toLowerCase(),
            ) ??
            draft.category ??
            ''
          }
          required
          onChange={(event) => onChange({ category: event.target.value })}
        >
          <option value="" disabled>
            Select a category
          </option>
          {draft.category &&
            !context.categories?.some(
              (item) => item.toLowerCase() === draft.category?.toLowerCase(),
            ) && (
              <option value={draft.category} disabled>
                {draft.category} (not found)
              </option>
            )}
          {context.categories?.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </FormField>
      <FormField id="draft-hours" label="Hours Spent" required>
        <input
          id="draft-hours"
          type="number"
          min="0.01"
          max="24"
          step="any"
          value={Number.isFinite(draft.hours) ? draft.hours : ''}
          required
          onChange={(event) =>
            onChange({
              hours: event.target.value
                ? Number(event.target.value)
                : undefined,
            })
          }
        />
      </FormField>
      <FormField id="draft-status" label="Task Status" required>
        <select
          id="draft-status"
          value={
            draft.status === 'Completed' || draft.status === 'In Progress'
              ? draft.status
              : ''
          }
          required
          onChange={(event) => onChange({ status: event.target.value })}
        >
          <option value="" disabled>
            Select status
          </option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
      </FormField>
      <FormField id="draft-learned" label="What did you learn?" required>
        <textarea
          id="draft-learned"
          rows={2}
          value={draft.learned ?? ''}
          required
          onChange={(event) => onChange({ learned: event.target.value })}
        />
      </FormField>
      <FormField id="draft-blockers" label="Challenges / Blockers" required>
        <textarea
          id="draft-blockers"
          rows={2}
          value={draft.blockers ?? ''}
          required
          onChange={(event) => onChange({ blockers: event.target.value })}
        />
      </FormField>
      <FormField id="draft-next-step" label="Next Step" required>
        <textarea
          id="draft-next-step"
          rows={2}
          value={draft.nextStep ?? ''}
          required
          onChange={(event) => onChange({ nextStep: event.target.value })}
        />
      </FormField>
      <FormField id="draft-evidence" label="Evidence metadata (optional)">
        <input
          id="draft-evidence"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0]
            onChange({
              evidence: file
                ? {
                    name: file.name,
                    size: file.size,
                    type: file.type || 'application/octet-stream',
                  }
                : undefined,
            })
          }}
        />
        {draft.evidence && (
          <p className="ai-draft-evidence">
            {draft.evidence.name} / {draft.evidence.type} /{' '}
            {draft.evidence.size} bytes{' '}
            <button
              type="button"
              className="plain-button"
              onClick={() => onChange({ evidence: undefined })}
            >
              Remove evidence
            </button>
          </p>
        )}
        <p>Only metadata is retained. Maximum 10 MB; no file is uploaded.</p>
      </FormField>
      {issues.length > 0 && (
        <p className="ai-draft-validation">{issues[0].message}</p>
      )}
      <div className="ai-draft-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button">
          Review draft
        </button>
      </div>
    </form>
  )
}
