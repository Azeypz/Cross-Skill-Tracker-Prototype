import { ArrowRight, Check, ClipboardCheck, Plus } from 'lucide-react'
import Avatar from '../../components/Avatar'
import { activities } from './data'

export default function RecentActivity({
  expanded = false,
  onViewAll,
}: {
  expanded?: boolean
  onViewAll?: () => void
}) {
  return (
    <section
      className="section activity-section"
      aria-labelledby="activity-heading"
    >
      <div className="section-heading">
        <div>
          <h2 id="activity-heading">Recent Activity</h2>
          <p>Small steps. Meaningful milestones.</p>
        </div>
        {!expanded && (
          <button className="text-button" onClick={onViewAll}>
            View activity log <ArrowRight size={16} />
          </button>
        )}
      </div>
      <ol className="activity-list">
        {activities
          .slice(0, expanded ? activities.length : 4)
          .map((activity) => {
            const Icon =
              activity.kind === 'completed'
                ? Check
                : activity.kind === 'started'
                  ? Plus
                  : ClipboardCheck
            return (
              <li key={activity.id}>
                <div className="activity-avatar">
                  <Avatar
                    name={activity.member}
                    initials={activity.initials}
                    image={activity.avatar}
                  />
                  <span className={`activity-kind ${activity.kind}`}>
                    <Icon size={10} />
                  </span>
                </div>
                <div className="activity-copy">
                  <p>
                    <strong>{activity.member}</strong> {activity.action}
                  </p>
                  <span>{activity.subject}</span>
                </div>
                <time>{activity.time}</time>
              </li>
            )
          })}
      </ol>
      <div className="activity-footer">
        <span className="legend-dot" /> You're all caught up on your team's
        latest progress.
      </div>
    </section>
  )
}
