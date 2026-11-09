import { CheckCircle2, Plus, X } from 'lucide-react'
import ActivityFilters from '../components/ActivityFilters'
import ActivityTable from '../components/ActivityTable'
import type {
  Activity,
  ActivityCategory,
  ActivityFilterValues,
  LearningPlan,
} from '../types/activity'

interface ActivityLogProps {
  activities: Activity[]
  learningPlans: LearningPlan[]
  categories: ActivityCategory[]
  lastSavedActivityId?: string
  filters: ActivityFilterValues
  onFiltersChange: (filters: ActivityFilterValues) => void
  notice: string
  onDismissNotice: () => void
}

export default function ActivityLog({
  activities,
  learningPlans,
  categories,
  lastSavedActivityId,
  filters,
  onFiltersChange,
  notice,
  onDismissNotice,
}: ActivityLogProps) {
  const filteredActivities = activities
    .filter(
      (activity) =>
        (!filters.from || activity.date >= filters.from) &&
        (!filters.to || activity.date <= filters.to) &&
        (!filters.category || activity.category === filters.category) &&
        (!filters.status || activity.status === filters.status),
    )
    .sort((first, second) => second.date.localeCompare(first.date))

  return (
    <div className="activity-page">
      <div className="activity-page-heading">
        <div>
          <h1>My Activity Log</h1>
          <p>
            Keep track of what you're learning and building in Hybrid Cloud.
          </p>
        </div>
        <a href="#/add-activity" className="primary-button">
          <Plus size={18} aria-hidden="true" />
          Add Activity
        </a>
      </div>
      {notice && (
        <div className="save-notice" role="status">
          <CheckCircle2 size={17} />
          <span>{notice}</span>
          <button
            type="button"
            className="action-icon"
            aria-label="Dismiss notification"
            title="Dismiss notification"
            onClick={onDismissNotice}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <ActivityFilters
        categories={categories}
        value={filters}
        onChange={onFiltersChange}
      />
      <ActivityTable
        key={`${filters.from}-${filters.to}-${filters.category}-${filters.status}`}
        activities={filteredActivities}
        learningPlans={learningPlans}
        initialActivityId={lastSavedActivityId}
      />
    </div>
  )
}
