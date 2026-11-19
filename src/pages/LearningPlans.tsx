import { useState } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { isLearningPlanStatus, learningPlanStatuses, type LearningPlanStatus } from '../types/activity'
import {
  learningPlanProgress,
} from '../data/activityRepository'
import { formatActivityDate } from '../data/sampleActivities'
import PlanHoursEditor from './PlanHoursEditor'
import type { Activity, LearningPlan, PlanHoursInput } from '../types/activity'

interface LearningPlansProps {
  learningPlans: LearningPlan[]
  activities: Activity[]
  customPlanIds: string[]
  notice?: string
  onSaveHours: (input: PlanHoursInput) => void | Promise<void>
  onSaveStatus: (planId: string, status: LearningPlanStatus) => void
}

export default function LearningPlans({
  learningPlans,
  activities,
  customPlanIds,
  notice,
  onSaveHours,
  onSaveStatus,
}: LearningPlansProps) {
  const [statusError, setStatusError] = useState('')
  const [editingPlanId, setEditingPlanId] = useState<string>()
  const editingPlan = learningPlans.find((plan) => plan.id === editingPlanId)

  return (
    <div className="activity-page learning-plans-page">
      <div className="activity-page-heading">
        <div>
          <h1>Learning Plans</h1>
          <p>Plan the path. Prove the progress.</p>
        </div>
          <a className="primary-button" href="#/learning-plans/new">
            <Plus size={18} aria-hidden="true" />
            New Learning Plan
          </a>
      </div>
      {notice && <p className="save-notice" role="status">{notice}</p>}
      {editingPlan && (
        <PlanHoursEditor
          key={editingPlan.id}
          plan={editingPlan}
          canAddMilestone={customPlanIds.includes(editingPlan.id)}
          onSave={onSaveHours}
          onCancel={() => setEditingPlanId(undefined)}
        />
      )}
      <section aria-label="Existing learning plans">
        {statusError && <p className="form-save-error" role="alert">{statusError}</p>}
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
                  'Status',
                  'Progress',
                  'Planned hours',
                ].map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {learningPlans.map((plan) => {
                const progress = learningPlanProgress(plan, activities)
                const progressLabel = progress === undefined
                  ? 'Unavailable'
                  : progress > 0 && progress < 0.1
                    ? '<0.1%'
                    : `${progress < 100 && progress.toFixed(1) === '100.0' ? '99.9' : Number(progress.toFixed(1))}%`
                return (
                  <tr key={plan.id}>
                    <td>
                      <div className="learning-plan-name">
                        <BookOpen size={19} aria-hidden="true" />
                        <span title={plan.name}>{plan.name}</span>
                        {plan.creationState === 'Draft' && <a href={`#/learning-plans/draft/${plan.id}`}>Edit draft</a>}
                      </div>
                    </td>
                    <td className="learning-plan-description" title={plan.description || undefined}>
                      {plan.description || 'Not set'}
                    </td>
                    <td className="learning-plan-text" title={plan.targetSkill || undefined}>
                      {plan.targetSkill || 'Not set'}
                    </td>
                    <td>
                      {plan.targetCompletionDate
                        ? formatActivityDate(plan.targetCompletionDate)
                        : 'Not set'}
                    </td>
                    <td>
                      <select
                        aria-label={`Status for ${plan.name}`}
                        className={`activity-status status-${plan.status.toLowerCase().replace(' ', '-')}`}
                        value={plan.status}
                        disabled={plan.creationState === 'Draft'}
                        onChange={(event) => {
                          const status = event.target.value
                          try {
                            if (!isLearningPlanStatus(status)) throw new Error('Select a valid learning plan status.')
                            onSaveStatus(plan.id, status)
                            setStatusError('')
                          } catch (error) {
                            setStatusError(error instanceof Error ? error.message : 'Learning plan status was not saved.')
                          }
                        }}
                      >
                        {learningPlanStatuses.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="learning-plan-progress">
                        <span>{progressLabel}</span>
                        {progress !== undefined && (
                          <div
                            className="learning-plan-progress-track"
                            role="progressbar"
                            aria-label={`${plan.name} progress`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={progress}
                          >
                            <span style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="learning-plan-hours">
                        <span>{plan.plannedHours === undefined ? 'Not set' : `${plan.plannedHours} hrs`}</span>
                        <button
                          type="button"
                          className="secondary-button learning-plan-hours-edit"
                          disabled={plan.creationState === 'Draft'}
                          onClick={() => setEditingPlanId(plan.id)}
                        >
                          Edit<span className="visually-hidden"> planned hours for {plan.name}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
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
