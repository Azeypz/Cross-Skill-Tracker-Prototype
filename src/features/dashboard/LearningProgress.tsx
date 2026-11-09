import { ArrowRight, BookOpen, Search } from 'lucide-react'
import { useState } from 'react'
import Avatar from '../../components/Avatar'
import ProgressBar from '../../components/ProgressBar'
import { plans } from './data'

export default function LearningProgress({
  expanded = false,
  onViewAll,
}: {
  expanded?: boolean
  onViewAll?: () => void
}) {
  const [query, setQuery] = useState('')
  const visiblePlans = (expanded ? plans : plans.slice(0, 4)).filter((plan) =>
    `${plan.title} ${plan.member} ${plan.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )

  return (
    <section
      className="section learning-section"
      aria-labelledby="learning-heading"
    >
      <div className="section-heading">
        <div>
          <h2 id="learning-heading">Learning Progress</h2>
          <p>A closer look at your team's learning journey.</p>
        </div>
        {!expanded && (
          <button className="text-button" onClick={onViewAll}>
            View all plans <ArrowRight size={16} />
          </button>
        )}
      </div>
      <div className="learning-toolbar">
        <span className="section-tab">
          {expanded ? 'All learning plans' : 'Featured learning plans'}{' '}
          <span>{expanded ? plans.length : 4}</span>
        </span>
        <label className="search-field">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search plans..."
            aria-label="Search learning plans"
          />
        </label>
      </div>
      <div className="table-scroll">
        <table className="plans-table">
          <thead>
            <tr>
              <th>Learning plan</th>
              <th>Member</th>
              <th>Modules</th>
              <th>Progress</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visiblePlans.map((plan) => (
              <tr key={plan.id}>
                <td>
                  <div className="plan-title">
                    <span className={`plan-icon ${plan.color}`}>
                      <BookOpen size={19} />
                    </span>
                    <div>
                      <strong>{plan.title}</strong>
                      <span>{plan.category}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="member-cell">
                    <Avatar
                      name={plan.member}
                      initials={plan.initials}
                      image={plan.avatar}
                      small
                    />
                    <span>{plan.member}</span>
                  </div>
                </td>
                <td className="modules-cell">
                  <strong>{plan.completed}</strong> / {plan.total}
                </td>
                <td>
                  <div className="progress-cell">
                    <ProgressBar
                      value={plan.progress}
                      label={plan.title}
                      color={plan.color}
                    />
                    <span>{plan.progress}%</span>
                  </div>
                </td>
                <td>
                  <span
                    className={`status-badge ${plan.progress === 100 ? 'completed' : 'in-progress'}`}
                  >
                    <span />
                    {plan.progress === 100 ? 'Completed' : 'In progress'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visiblePlans.length === 0 && (
        <div className="empty-state">No plans match "{query}".</div>
      )}
      <div className="section-footer">
        <span>
          Showing {visiblePlans.length} of {plans.length} learning plans
        </span>
        <span>
          <span className="legend-dot" /> Updated just now
        </span>
      </div>
    </section>
  )
}
