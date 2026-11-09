import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'

const chartData = {
  Week: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [7, 10, 8, 14, 11, 6, 8],
    max: 20,
    change: '12.3%',
  },
  Month: {
    labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
    values: [61, 72, 58, 64],
    max: 80,
    change: '8.5%',
  },
}

export default function WeeklyChart() {
  const [period, setPeriod] = useState<'Week' | 'Month'>('Week')
  const data = chartData[period]
  const total = data.values.reduce((sum, value) => sum + value, 0)
  return (
    <section
      className="section weekly-section"
      aria-labelledby="weekly-heading"
    >
      <div className="section-heading">
        <div>
          <h2 id="weekly-heading">Learning Overview</h2>
          <p>Consistency makes the difference.</p>
        </div>
        <div className="segmented-control" aria-label="Chart period">
          {(['Week', 'Month'] as const).map((option) => (
            <button
              key={option}
              aria-pressed={period === option}
              onClick={() => setPeriod(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-summary">
        <strong>
          {total}
          <span>hrs</span>
        </strong>
        <span className="stat-change">
          <ArrowUpRight size={14} />
          {data.change}
        </span>
        <span>vs. last {period.toLowerCase()}</span>
      </div>
      <div
        className="chart"
        role="img"
        aria-label={`${period} learning hours: ${total} total. ${data.labels.map((label, index) => `${label}: ${data.values[index]} hours`).join(', ')}`}
      >
        <div className="chart-lines">
          {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
            <span key={fraction}>{data.max * fraction}h</span>
          ))}
        </div>
        <div className="chart-bars">
          {data.values.map((value, index) => (
            <div className="chart-column" key={data.labels[index]}>
              <div
                className={`chart-bar${index === 3 ? ' highlighted' : ''}`}
                style={{ height: `${(value / data.max) * 100}%` }}
              />
              <span>{data.labels[index]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="chart-legend">
        <span className="legend-dot purple-dot" /> Time invested in learning
      </div>
    </section>
  )
}
