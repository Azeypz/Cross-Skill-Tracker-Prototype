import { ChevronDown, Cloud } from 'lucide-react'

export default function Header() {
  return (
    <header className="productivity-header">
      <a
        href="#/my-log"
        className="product-brand"
        aria-label="Hybrid Cloud Productivity Log home"
      >
        <Cloud
          className="product-cloud"
          size={37}
          strokeWidth={1.6}
          aria-hidden="true"
        />
        <span>
          Hybrid Cloud<span className="product-name">Productivity Log</span>
        </span>
      </a>
      <div className="user-profile" aria-label="Current user: Alex Santos">
        <span className="profile-initials" aria-hidden="true">
          AS
        </span>
        <span className="profile-name">Alex Santos</span>
        <ChevronDown size={14} aria-hidden="true" />
      </div>
    </header>
  )
}
