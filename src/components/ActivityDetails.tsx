import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { formatActivityDate } from '../data/sampleActivities'
import type { Activity, LearningPlan } from '../types/activity'
import StatusBadge from './StatusBadge'

export default function ActivityDetails({
  activity,
  learningPlans,
  onClose,
}: {
  activity: Activity
  learningPlans: LearningPlan[]
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="activity-dialog"
      aria-labelledby="activity-detail-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog-heading">
        <h2 id="activity-detail-title">{activity.title}</h2>
        <button
          type="button"
          className="action-icon"
          onClick={onClose}
          aria-label="Close activity details"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>
      <p className="detail-meta">
        {formatActivityDate(activity.date)} <span aria-hidden="true">/</span>{' '}
        {activity.hours} hours
      </p>
      <StatusBadge status={activity.status} />
      <dl className="session-details">
        <dt>Learning Plan</dt>
        <dd>
          {
            learningPlans.find((plan) => plan.id === activity.learningPlanId)
              ?.name
          }
        </dd>
        <dt>Category</dt>
        <dd>{activity.category}</dd>
        <dt>What did you learn?</dt>
        <dd>{activity.reflection.learning || 'No reflection recorded.'}</dd>
        <dt>Challenges / Blockers</dt>
        <dd>{activity.reflection.blockers || 'None recorded.'}</dd>
        <dt>Next Step</dt>
        <dd>{activity.reflection.nextStep || 'None recorded.'}</dd>
        {activity.evidence && (
          <>
            <dt>Evidence</dt>
            <dd>{activity.evidence.name} (file metadata only)</dd>
          </>
        )}
      </dl>
    </dialog>
  )
}
