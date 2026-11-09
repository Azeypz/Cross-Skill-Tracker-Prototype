import type { ActivityStatus } from '../types/activity'

export default function StatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <span
      className={`activity-status ${status === 'Completed' ? 'status-completed' : 'status-in-progress'}`}
    >
      {status}
    </span>
  )
}
