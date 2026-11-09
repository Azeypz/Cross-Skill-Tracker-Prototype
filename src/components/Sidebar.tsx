import { BookOpen, CirclePlus, ClipboardList } from 'lucide-react'
import type { ActivityPage } from '../types/activity'

const navigation = [
  { page: 'my-log', label: 'My Log', icon: ClipboardList },
  { page: 'add-activity', label: 'Add Activity', icon: CirclePlus },
  { page: 'learning-plans', label: 'Learning Plans', icon: BookOpen },
] as const

export default function Sidebar({ page }: { page: ActivityPage }) {
  return (
    <aside className="log-sidebar">
      <nav aria-label="Main navigation">
        {navigation.map(({ page: destination, label, icon: Icon }) => (
          <a
            key={destination}
            href={`#/${destination}`}
            className={`log-nav-item${page === destination ? ' is-selected' : ''}`}
            aria-current={page === destination ? 'page' : undefined}
          >
            <Icon size={19} aria-hidden="true" />
            {label}
          </a>
        ))}
      </nav>
    </aside>
  )
}
