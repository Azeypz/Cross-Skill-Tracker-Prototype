import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Paperclip } from 'lucide-react'
import FormField from '../components/FormField'
import { customNameError, otherOption } from '../data/activityRepository'
import type {
  ActivityCategory,
  ActivityStatus,
  Evidence,
  LearningPlan,
  NewActivityInput,
} from '../types/activity'

function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function AddActivity({
  onSave,
  learningPlans,
  categories,
}: {
  onSave: (input: NewActivityInput) => void | Promise<void>
  learningPlans: LearningPlan[]
  categories: ActivityCategory[]
}) {
  const [planId, setPlanId] = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [activityTitle, setActivityTitle] = useState('')
  const [newLearningPlanName, setNewLearningPlanName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [category, setCategory] = useState<ActivityCategory | ''>('')
  const [evidence, setEvidence] = useState<Evidence>()
  const [fileError, setFileError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const selectedPlan = learningPlans.find((plan) => plan.id === planId)
  const planNameError =
    planId === otherOption
      ? customNameError(
          newLearningPlanName,
          learningPlans.map((plan) => plan.name),
          'learning plan',
        )
      : ''
  const categoryNameError =
    category === otherOption
      ? customNameError(newCategoryName, categories, 'category')
      : ''

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (fileError || isSaving) return
    if (planNameError || categoryNameError) {
      setSaveError(planNameError || categoryNameError)
      const field = event.currentTarget.elements.namedItem(
        planNameError ? 'newLearningPlanName' : 'newCategoryName',
      )
      if (field instanceof HTMLInputElement) field.focus()
      return
    }
    const values = new FormData(event.currentTarget)
    setSaveError('')
    setIsSaving(true)
    try {
      await onSave({
        date: String(values.get('date')),
        learningPlanId: planId,
        newLearningPlanName: planId === otherOption ? newLearningPlanName : '',
        milestoneId,
        title: activityTitle,
        category,
        newCategoryName: category === otherOption ? newCategoryName : '',
        hours: Number(values.get('hours')),
        status: values.get('status') as ActivityStatus,
        reflection: {
          learning: String(values.get('learning')).trim(),
          blockers: String(values.get('blockers')).trim(),
          nextStep: String(values.get('nextStep')).trim(),
        },
        evidence,
      })
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Activity could not be saved. Please try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="activity-page add-activity-page">
      <a href="#/my-log" className="back-to-log">
        <ArrowLeft size={15} aria-hidden="true" />
        Back to My Log
      </a>
      <div className="activity-page-heading">
        <div>
          <h1>Add Activity</h1>
          <p>Record what you worked on and keep track of your progress.</p>
        </div>
      </div>
      <form className="activity-form" onSubmit={handleSubmit}>
        <FormField id="activity-date" label="Date" required>
          <input
            id="activity-date"
            name="date"
            type="date"
            defaultValue={today()}
            required
          />
        </FormField>
        <FormField id="learning-plan" label="Learning Plan" required>
          <select
            id="learning-plan"
            name="learningPlan"
            value={planId}
            required
            onChange={(event) => {
              const plan = learningPlans.find(
                (item) => item.id === event.target.value,
              )
              setPlanId(event.target.value)
              setMilestoneId('')
              setActivityTitle('')
              setNewLearningPlanName('')
              setNewCategoryName('')
              setSaveError('')
              setCategory(plan?.category ?? '')
            }}
          >
            <option value="" disabled>
              Select a learning plan
            </option>
            {learningPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
            <option value={otherOption}>Other</option>
          </select>
        </FormField>
        {planId === otherOption && (
          <FormField id="new-learning-plan" label="New Learning Plan" required>
            <input
              id="new-learning-plan"
              name="newLearningPlanName"
              placeholder="Enter learning plan name"
              value={newLearningPlanName}
              required
              aria-invalid={Boolean(newLearningPlanName && planNameError)}
              aria-describedby={
                newLearningPlanName && planNameError
                  ? 'new-learning-plan-error'
                  : undefined
              }
              onChange={(event) => {
                setNewLearningPlanName(event.target.value)
                setSaveError('')
              }}
            />
            {newLearningPlanName && planNameError && (
              <p
                id="new-learning-plan-error"
                className="field-error"
                role="alert"
              >
                {planNameError}
              </p>
            )}
          </FormField>
        )}
        <FormField id="milestone" label="Milestone / Activity" required>
          {planId === otherOption || selectedPlan?.milestones.length === 0 ? (
            <input
              id="milestone"
              name="title"
              placeholder="Enter milestone or activity"
              value={activityTitle}
              required
              onChange={(event) => setActivityTitle(event.target.value)}
            />
          ) : (
            <select
              id="milestone"
              name="milestone"
              value={milestoneId}
              required
              disabled={!selectedPlan}
              onChange={(event) => setMilestoneId(event.target.value)}
            >
              <option value="" disabled>
                Select an activity
              </option>
              {selectedPlan?.milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.title}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField id="activity-category" label="Category" required>
          <select
            id="activity-category"
            name="category"
            value={category}
            required
            onChange={(event) => {
              setCategory(event.target.value as ActivityCategory)
              setNewCategoryName('')
              setSaveError('')
            }}
          >
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
            <option value={otherOption}>Other</option>
          </select>
        </FormField>
        {category === otherOption && (
          <FormField id="new-category" label="New Category" required>
            <input
              id="new-category"
              name="newCategoryName"
              placeholder="Enter category name"
              value={newCategoryName}
              required
              aria-invalid={Boolean(newCategoryName && categoryNameError)}
              aria-describedby={
                newCategoryName && categoryNameError
                  ? 'new-category-error'
                  : undefined
              }
              onChange={(event) => {
                setNewCategoryName(event.target.value)
                setSaveError('')
              }}
            />
            {newCategoryName && categoryNameError && (
              <p id="new-category-error" className="field-error" role="alert">
                {categoryNameError}
              </p>
            )}
          </FormField>
        )}
        <div className="form-columns">
          <FormField id="hours-spent" label="Hours Spent" required>
            <div className="hours-input">
              <input
                id="hours-spent"
                name="hours"
                type="number"
                placeholder="e.g. 1.5"
                min="0.25"
                max="24"
                step="0.25"
                required
              />
              <span>hours</span>
            </div>
          </FormField>
          <FormField id="task-status" label="Task Status" required>
            <select
              id="task-status"
              name="status"
              defaultValue="In Progress"
              required
            >
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </FormField>
        </div>
        <fieldset className="reflection-fields">
          <legend>Reflection</legend>
          <FormField id="learning" label="What did you learn?">
            <textarea
              id="learning"
              name="learning"
              rows={2}
              placeholder="Capture your key learnings..."
            />
          </FormField>
          <FormField id="blockers" label="Challenges / Blockers">
            <textarea
              id="blockers"
              name="blockers"
              rows={2}
              placeholder="What got in the way?"
            />
          </FormField>
          <FormField id="next-step" label="Next Step">
            <textarea
              id="next-step"
              name="nextStep"
              rows={2}
              placeholder="What will you do next?"
            />
          </FormField>
        </fieldset>
        <div className="form-field evidence-field">
          <label htmlFor="evidence">
            Evidence <span className="optional-label">(optional)</span>
          </label>
          <p id="evidence-description">
            Upload lab, screenshot, result, certificate, or presentation
          </p>
          <div className="file-input-row">
            <Paperclip size={18} aria-hidden="true" />
            <input
              id="evidence"
              name="evidence"
              type="file"
              accept="image/*,.pdf,.txt,.csv,.zip,.ppt,.pptx,.doc,.docx,.xlsx,.sql"
              aria-describedby={`evidence-description evidence-note${fileError ? ' evidence-error' : ''}`}
              aria-invalid={Boolean(fileError)}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file && file.size > 10 * 1024 * 1024) {
                  setFileError('Choose a file smaller than 10 MB.')
                  setEvidence(undefined)
                  return
                }
                setFileError('')
                setEvidence(
                  file
                    ? { name: file.name, size: file.size, type: file.type }
                    : undefined,
                )
              }}
            />
          </div>
          <p className="field-note" id="evidence-note">
            Up to 10 MB. Only the file name and metadata are saved locally.
          </p>
          {fileError && (
            <p className="field-error" id="evidence-error" role="alert">
              {fileError}
            </p>
          )}
        </div>
        {saveError && (
          <p className="form-save-error" role="alert">
            {saveError}
          </p>
        )}
        <div className="form-actions">
          <a href="#/my-log" className="secondary-button">
            Cancel
          </a>
          <button
            type="submit"
            className="primary-button"
            disabled={Boolean(fileError) || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Activity'}
          </button>
        </div>
      </form>
    </div>
  )
}
