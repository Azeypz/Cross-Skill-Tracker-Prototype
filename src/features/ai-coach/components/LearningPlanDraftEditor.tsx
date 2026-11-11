import FormField from '../../../components/FormField'
import type {
  LearningActivityType,
  LearningPlanDraft,
} from '../types/learningPlanDraft'

const activityTypes: LearningActivityType[] = [
  'lesson',
  'reading',
  'video',
  'lab',
  'practice',
  'assessment',
  'review',
]

interface LearningPlanDraftEditorProps {
  draft: LearningPlanDraft
  onChange: (changes: Partial<Omit<LearningPlanDraft, 'id'>>) => void
  onReview: () => void
  onCancel: () => void
}

export default function LearningPlanDraftEditor({
  draft,
  onChange,
  onReview,
  onCancel,
}: LearningPlanDraftEditorProps) {
  return (
    <form
      className="ai-draft-editor learning-plan-editor"
      aria-label="Edit learning plan draft"
      onSubmit={(event) => {
        event.preventDefault()
        onReview()
      }}
    >
      <h3>Edit learning plan</h3>
      <FormField id="learning-draft-title" label="Plan title" required>
        <input
          id="learning-draft-title"
          value={draft.title}
          required
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </FormField>
      <FormField id="learning-draft-skill" label="Target skill" required>
        <input
          id="learning-draft-skill"
          value={draft.skill}
          required
          onChange={(event) => onChange({ skill: event.target.value })}
        />
      </FormField>
      <FormField id="learning-draft-category" label="Category" required>
        <input
          id="learning-draft-category"
          value={draft.category}
          required
          onChange={(event) => onChange({ category: event.target.value })}
        />
      </FormField>
      <FormField id="learning-draft-level" label="Current level" required>
        <select
          id="learning-draft-level"
          value={draft.currentLevel}
          onChange={(event) =>
            onChange({
              currentLevel: event.target.value as LearningPlanDraft['currentLevel'],
            })
          }
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </FormField>
      <FormField id="learning-draft-goal" label="Goal" required>
        <textarea
          id="learning-draft-goal"
          rows={3}
          value={draft.goal}
          required
          onChange={(event) => onChange({ goal: event.target.value })}
        />
      </FormField>
      <FormField id="learning-draft-date" label="Start date" required>
        <input
          id="learning-draft-date"
          type="date"
          value={draft.startDate}
          required
          onChange={(event) => onChange({ startDate: event.target.value })}
        />
      </FormField>
      <div className="learning-plan-schedule-inputs">
        <FormField id="learning-draft-weeks" label="Duration (weeks)" required>
          <input
            id="learning-draft-weeks"
            type="number"
            min="1"
            max="52"
            step="1"
            value={draft.durationWeeks}
            required
            onChange={(event) =>
              onChange({ durationWeeks: Number(event.target.value) })
            }
          />
        </FormField>
        <FormField id="learning-draft-days" label="Study days / week" required>
          <input
            id="learning-draft-days"
            type="number"
            min="1"
            max="7"
            step="1"
            value={draft.studyDaysPerWeek}
            required
            onChange={(event) =>
              onChange({ studyDaysPerWeek: Number(event.target.value) })
            }
          />
        </FormField>
        <FormField id="learning-draft-daily-hours" label="Hours / study day" required>
          <input
            id="learning-draft-daily-hours"
            type="number"
            min="0.01"
            max="24"
            step="0.25"
            value={draft.hoursPerStudyDay}
            required
            onChange={(event) =>
              onChange({ hoursPerStudyDay: Number(event.target.value) })
            }
          />
        </FormField>
      </div>
      <p className="learning-plan-commitment">
        {draft.studyDaysPerWeek * draft.hoursPerStudyDay} hours per week ·{' '}
        {draft.totalEstimatedHours} hours total
      </p>
      <div className="learning-plan-edit-weeks">
        {draft.weeklyPlans.map((week, weekIndex) => (
          <fieldset key={week.weekNumber} className="learning-plan-edit-week">
            <legend>Week {week.weekNumber}</legend>
            <FormField
              id={`learning-week-${week.weekNumber}-title`}
              label="Week title"
              required
            >
              <input
                id={`learning-week-${week.weekNumber}-title`}
                value={week.title}
                required
                onChange={(event) =>
                  onChange({
                    weeklyPlans: draft.weeklyPlans.map((item, index) =>
                      index === weekIndex
                        ? { ...item, title: event.target.value }
                        : item,
                    ),
                  })
                }
              />
            </FormField>
            <FormField
              id={`learning-week-${week.weekNumber}-objective`}
              label="Objective"
              required
            >
              <textarea
                id={`learning-week-${week.weekNumber}-objective`}
                rows={2}
                value={week.objective}
                required
                onChange={(event) =>
                  onChange({
                    weeklyPlans: draft.weeklyPlans.map((item, index) =>
                      index === weekIndex
                        ? { ...item, objective: event.target.value }
                        : item,
                    ),
                  })
                }
              />
            </FormField>
            {week.activities.map((activity, activityIndex) => (
              <div
                className="learning-plan-edit-activity"
                key={`${week.weekNumber}-${activityIndex}`}
              >
                <FormField
                  id={`learning-week-${week.weekNumber}-activity-${activityIndex}-title`}
                  label="Activity"
                  required
                >
                  <input
                    id={`learning-week-${week.weekNumber}-activity-${activityIndex}-title`}
                    value={activity.title}
                    required
                    onChange={(event) =>
                      onChange({
                        weeklyPlans: draft.weeklyPlans.map((item, index) =>
                          index === weekIndex
                            ? {
                                ...item,
                                activities: item.activities.map((task, taskIndex) =>
                                  taskIndex === activityIndex
                                    ? { ...task, title: event.target.value }
                                    : task,
                                ),
                              }
                            : item,
                        ),
                      })
                    }
                  />
                </FormField>
                <FormField
                  id={`learning-week-${week.weekNumber}-activity-${activityIndex}-description`}
                  label="Activity details"
                  required
                >
                  <textarea
                    id={`learning-week-${week.weekNumber}-activity-${activityIndex}-description`}
                    rows={2}
                    value={activity.description}
                    required
                    onChange={(event) =>
                      onChange({
                        weeklyPlans: draft.weeklyPlans.map((item, index) =>
                          index === weekIndex
                            ? {
                                ...item,
                                activities: item.activities.map((task, taskIndex) =>
                                  taskIndex === activityIndex
                                    ? { ...task, description: event.target.value }
                                    : task,
                                ),
                              }
                            : item,
                        ),
                      })
                    }
                  />
                </FormField>
                <FormField
                  id={`learning-week-${week.weekNumber}-activity-${activityIndex}-type`}
                  label="Activity type"
                >
                  <select
                    id={`learning-week-${week.weekNumber}-activity-${activityIndex}-type`}
                    value={activity.type}
                    onChange={(event) =>
                      onChange({
                        weeklyPlans: draft.weeklyPlans.map((item, index) =>
                          index === weekIndex
                            ? {
                                ...item,
                                activities: item.activities.map((task, taskIndex) =>
                                  taskIndex === activityIndex
                                    ? {
                                        ...task,
                                        type: event.target.value as LearningActivityType,
                                      }
                                    : task,
                                ),
                              }
                            : item,
                        ),
                      })
                    }
                  >
                    {activityTypes.map((type) => (
                      <option key={type} value={type}>
                        {type[0]?.toUpperCase()}{type.slice(1)}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="ai-draft-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button">
          Review plan
        </button>
      </div>
    </form>
  )
}