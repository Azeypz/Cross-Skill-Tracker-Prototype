import { useState } from 'react'
import {
  AppWindow,
  ChevronLeft,
  ChevronRight,
  Eye,
  Cloud,
  Database,
  Trash2,
  Ellipsis,
  BookOpen,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { activityLearningPlanName, formatActivityDate } from '../data/sampleActivities'
import { formatActivityHours } from '../data/activityHours'
import type { Activity, LearningPlan } from '../types/activity'
import StatusBadge from './StatusBadge'
import ActivityDetails from './ActivityDetails'
import DeleteActivityDialog from './DeleteActivityDialog'

const categoryIcons = new Map<string, LucideIcon>([
  ['Cloud', Cloud],
  ['App Development', AppWindow],
  ['Database Administration', Database],
])
const pageSize = 8

export default function ActivityTable({
  activities,
  learningPlans,
  initialActivityId,
  onDeleteActivity,
}: {
  activities: Activity[]
  learningPlans: LearningPlan[]
  initialActivityId?: string
  onDeleteActivity: (activityId: string) => void
}) {
  const [requestedPage, setRequestedPage] = useState(() => {
    const index = activities.findIndex(
      (activity) => activity.id === initialActivityId,
    )
    return index < 0 ? 1 : Math.floor(index / pageSize) + 1
  })
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  )
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null)
  const totalPages = Math.max(1, Math.ceil(activities.length / pageSize))
  const page = Math.min(requestedPage, totalPages)
  const start = (page - 1) * pageSize
  const visibleActivities = activities.slice(start, start + pageSize)

  return (
    <section className="activity-results" aria-label="Activity log">
      <div
        className="activity-table-scroll"
        role="region"
        aria-label="Activities table, scroll horizontally on smaller screens"
        tabIndex={0}
      >
        <table className="activity-table">
          <caption className="visually-hidden">
            Learning sessions and their status
          </caption>
          <thead>
            <tr>
              {[
                'Date',
                'Activity / Task',
                'Learning Plan',
                'Category',
                'Hours',
                'Status',
                'Actions',
              ].map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleActivities.map((activity) => {
              const Icon = categoryIcons.get(activity.category) ?? BookOpen
              return (
                <tr key={activity.id}>
                  <td className="activity-date">
                    {formatActivityDate(activity.date)}
                  </td>
                  <td>
                    <div className="activity-task">
                      <span
                        className={`activity-category-icon category-${activity.learningPlanId}`}
                      >
                        <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span>{activity.title}</span>
                    </div>
                  </td>
                  <td>
                    {activityLearningPlanName(activity.learningPlanId, learningPlans)}
                  </td>
                  <td>{activity.category}</td>
                  <td className="activity-hours">
                    {formatActivityHours(activity.hours)}
                  </td>
                  <td>
                    <StatusBadge status={activity.status} />
                  </td>
                  <td className="activity-actions">
                    <details className="activity-action-menu">
                      <summary
                        className="action-icon"
                        aria-label={`Actions for ${activity.title}`}
                        title="Activity actions"
                      >
                        <Ellipsis size={19} aria-hidden="true" />
                      </summary>
                      <div className="action-menu-items">
                        <button
                          type="button"
                          className="action-menu-item"
                          onClick={(event) => {
                            event.currentTarget
                              .closest('details')
                              ?.removeAttribute('open')
                            setSelectedActivity(activity)
                          }}
                        >
                          <Eye size={15} />
                          View Details
                        </button>
                        <button
                          type="button"
                          className="action-menu-item destructive-menu-item"
                          onClick={(event) => {
                            event.currentTarget
                              .closest('details')
                              ?.removeAttribute('open')
                            setActivityToDelete(activity)
                          }}
                        >
                          <Trash2 size={15} />
                          Delete Activity
                        </button>
                      </div>
                    </details>
                  </td>
                </tr>
              )
            })}
            {activities.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-activities">
                  No activities match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="activity-pagination">
        <p aria-live="polite">
          {activities.length ? start + 1 : 0} -{' '}
          {Math.min(start + pageSize, activities.length)} of {activities.length}{' '}
          activities
        </p>
        <nav aria-label="Activity pagination">
          <button
            type="button"
            className="pagination-button"
            aria-label="Previous page"
            title="Previous page"
            disabled={page === 1}
            onClick={() => setRequestedPage(page - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span
            className="pagination-current"
            aria-current="page"
            aria-label={`Page ${page}`}
          >
            {page}
          </span>
          <button
            type="button"
            className="pagination-button"
            aria-label="Next page"
            title="Next page"
            disabled={page === totalPages}
            onClick={() => setRequestedPage(page + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </nav>
      </div>
      {selectedActivity && (
        <ActivityDetails
          activity={selectedActivity}
          learningPlans={learningPlans}
          onClose={() => setSelectedActivity(null)}
        />
      )}
      {activityToDelete && (
        <DeleteActivityDialog
          activity={activityToDelete}
          learningPlans={learningPlans}
          onCancel={() => setActivityToDelete(null)}
          onConfirm={() => {
            onDeleteActivity(activityToDelete.id)
            setActivityToDelete(null)
          }}
        />
      )}
    </section>
  )
}
