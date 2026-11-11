import { useEffect, useRef } from 'react'
import { formatActivityDate } from '../data/sampleActivities'
import type { Activity, LearningPlan } from '../types/activity'

export default function DeleteActivityDialog({
  activity,
  learningPlans,
  onCancel,
  onConfirm,
}: {
  activity: Activity
  learningPlans: LearningPlan[]
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const planName =
    learningPlans.find((plan) => plan.id === activity.learningPlanId)?.name ??
    'Learning plan unavailable'

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="activity-dialog delete-activity-dialog"
      aria-labelledby="delete-activity-title"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="dialog-heading">
        <h2 id="delete-activity-title">Delete activity?</h2>
      </div>
      <p className="delete-confirmation-intro">
        You are about to permanently remove:
      </p>
      <dl className="delete-activity-details">
        <dt>Activity Name</dt>
        <dd>{activity.title}</dd>
        <dt>Date</dt>
        <dd>{formatActivityDate(activity.date)}</dd>
        <dt>Learning Plan</dt>
        <dd>{planName}</dd>
      </dl>
      <p className="delete-confirmation-warning">
        This activity will no longer be included in your learning history or
        progress calculations.
      </p>
      <div className="form-actions">
        <button type="button" className="secondary-button" autoFocus onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="destructive-button" onClick={onConfirm}>
          Delete Activity
        </button>
      </div>
    </dialog>
  )
}