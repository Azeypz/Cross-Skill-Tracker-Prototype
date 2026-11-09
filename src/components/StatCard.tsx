import { ArrowUpRight, type LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: string
  change: string
  icon: LucideIcon
  color: string
  detail: string
}

export default function StatCard({
  label,
  value,
  change,
  icon: Icon,
  color,
  detail,
}: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${color}`}>
          <Icon size={19} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-bottom">
        <span className="stat-change">
          <ArrowUpRight size={14} />
          {change}
        </span>
        <span>{detail}</span>
      </div>
    </article>
  )
}
