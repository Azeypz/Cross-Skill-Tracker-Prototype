import { CalendarDays, ChevronDown } from 'lucide-react'
import { formatActivityDate } from '../data/sampleActivities'
import type { ActivityCategory, ActivityFilterValues } from '../types/activity'

interface ActivityFiltersProps {
  categories: ActivityCategory[]
  value: ActivityFilterValues
  onChange: (value: ActivityFilterValues) => void
}

export default function ActivityFilters({
  categories,
  value,
  onChange,
}: ActivityFiltersProps) {
  const dateLabel =
    value.from && value.to
      ? `${formatActivityDate(value.from)} - ${formatActivityDate(value.to)}`
      : value.from
        ? `From ${formatActivityDate(value.from)}`
        : value.to
          ? `Until ${formatActivityDate(value.to)}`
          : 'All dates'

  return (
    <section className="activity-filters" aria-label="Filter activities">
      <details className="date-filter">
        <summary className="filter-control">
          <CalendarDays size={17} aria-hidden="true" />
          <span>{dateLabel}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </summary>
        <div className="date-filter-popover">
          <label htmlFor="date-from">From</label>
          <input
            id="date-from"
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(event) =>
              onChange({ ...value, from: event.target.value })
            }
          />
          <label htmlFor="date-to">To</label>
          <input
            id="date-to"
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
          />
          <button
            type="button"
            className="plain-button"
            onClick={() => onChange({ ...value, from: '', to: '' })}
          >
            Clear dates
          </button>
        </div>
      </details>
      <div className="select-control">
        <select
          aria-label="Category filter"
          value={value.category}
          onChange={(event) =>
            onChange({
              ...value,
              category: event.target.value as ActivityFilterValues['category'],
            })
          }
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <ChevronDown size={15} aria-hidden="true" />
      </div>
      <div className="select-control status-filter">
        <select
          aria-label="Status filter"
          value={value.status}
          onChange={(event) =>
            onChange({
              ...value,
              status: event.target.value as ActivityFilterValues['status'],
            })
          }
        >
          <option value="">All Status</option>
          <option>Completed</option>
          <option>In Progress</option>
        </select>
        <ChevronDown size={15} aria-hidden="true" />
      </div>
    </section>
  )
}
