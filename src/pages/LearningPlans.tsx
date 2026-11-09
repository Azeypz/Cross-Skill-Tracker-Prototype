import { useState } from 'react'
import type { FormEvent } from 'react'
import { BookOpen, CheckCircle2, Plus, X } from 'lucide-react'
import FormField from '../components/FormField'
import { customNameError } from '../data/activityRepository'
import { formatActivityDate } from '../data/sampleActivities'
import type { LearningPlan, NewLearningPlanInput } from '../types/activity'

interface LearningPlansProps {
  learningPlans: LearningPlan[]
  onSave: (input: NewLearningPlanInput) => void | Promise<void>
}

export default function LearningPlans({
  learningPlans,
  onSave,
}: LearningPlansProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const nameError = customNameError(
    name,
    learningPlans.map((plan) => plan.name),
    'learning plan',
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    if (nameError) {
      setSaveError(nameError)
      const field = event.currentTarget.elements.namedItem('name')
      if (field instanceof HTMLInputElement) field.focus()
      return
    }
    const values = new FormData(event.currentTarget)
    setSaveError('')
    setIsSaving(true)
    try {
      await onSave({
        name,
        description: String(values.get('description')),
        targetSkill: String(values.get('targetSkill')),
        targetCompletionDate: String(values.get('targetCompletionDate')),
      })
      setName('')
      setCreating(false)
      setNotice('Learning plan created successfully.')
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Learning plan could not be saved. Please try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="activity-page learning-plans-page">
      <div className="activity-page-heading">
        <div>
          <h1>Learning Plans</h1>
          <p>Plan the path. Prove the progress.</p>
        </div>
        {!creating && (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setName('')
              setSaveError('')
              setNotice('')
              setCreating(true)
            }}
          >
            <Plus size={18} aria-hidden="true" />
            New Learning Plan
          </button>
        )}
      </div>
      {notice && (
        <div className="save-notice" role="status">
          <CheckCircle2 size={17} aria-hidden="true" />
          <span>{notice}</span>
          <button
            type="button"
            className="action-icon"
            title="Dismiss notification"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {creating && (
        <form
          className="activity-form learning-plan-form"
          aria-labelledby="create-plan-heading"
          onSubmit={handleSubmit}
        >
          <h2 id="create-plan-heading">New Learning Plan</h2>
          <FormField id="plan-name" label="Learning Plan Name" required>
            <input
              id="plan-name"
              name="name"
              placeholder="Enter learning plan name"
              value={name}
              required
              autoFocus
              aria-invalid={Boolean(name && nameError)}
              aria-describedby={
                name && nameError ? 'plan-name-error' : undefined
              }
              onChange={(event) => {
                setName(event.target.value)
                setSaveError('')
              }}
            />
            {name && nameError && (
              <p className="field-error" id="plan-name-error" role="alert">
                {nameError}
              </p>
            )}
          </FormField>
          <FormField id="plan-description" label="Description">
            <textarea
              id="plan-description"
              name="description"
              placeholder="Describe your learning goal"
              rows={3}
            />
          </FormField>
          <div className="form-columns">
            <FormField id="plan-target-skill" label="Target Skill">
              <input
                id="plan-target-skill"
                name="targetSkill"
                placeholder="e.g. Cloud architecture"
              />
            </FormField>
            <FormField id="plan-target-date" label="Target Completion Date">
              <input
                id="plan-target-date"
                name="targetCompletionDate"
                type="date"
              />
            </FormField>
          </div>
          {saveError && (
            <p className="form-save-error" role="alert">
              {saveError}
            </p>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={isSaving}
              onClick={() => {
                setCreating(false)
                setName('')
                setSaveError('')
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={isSaving}
            >
              {isSaving ? 'Creating...' : 'Create Learning Plan'}
            </button>
          </div>
        </form>
      )}
      <section aria-label="Existing learning plans">
        <div
          className="activity-table-scroll"
          role="region"
          aria-label="Learning plans table, scroll horizontally on smaller screens"
          tabIndex={0}
        >
          <table className="activity-table learning-plans-table">
            <caption className="visually-hidden">
              Existing learning plans and their targets
            </caption>
            <thead>
              <tr>
                {[
                  'Learning Plan Name',
                  'Description',
                  'Target Skill',
                  'Target Completion Date',
                ].map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {learningPlans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <div className="learning-plan-name">
                      <BookOpen size={19} aria-hidden="true" />
                      <span>{plan.name}</span>
                    </div>
                  </td>
                  <td className="learning-plan-description">
                    {plan.description || 'Not set'}
                  </td>
                  <td>{plan.targetSkill || 'Not set'}</td>
                  <td>
                    {plan.targetCompletionDate
                      ? formatActivityDate(plan.targetCompletionDate)
                      : 'Not set'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="learning-plans-count">
          {learningPlans.length} learning{' '}
          {learningPlans.length === 1 ? 'plan' : 'plans'}
        </p>
      </section>
    </div>
  )
}
