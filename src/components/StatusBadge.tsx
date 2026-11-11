import type { ActivityStatus } from '../types/activity'

export default function StatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <span
      className={`activity-status status-${status.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {status}
    </span>
  )
}
