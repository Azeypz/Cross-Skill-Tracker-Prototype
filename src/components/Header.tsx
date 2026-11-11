import { ChevronDown, Cloud, RotateCcw } from 'lucide-react'

export default function Header({
  onResetPrototype,
}: {
  onResetPrototype?: () => void
}) {
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
      <div className="header-actions">
        {onResetPrototype && (
          <button
            type="button"
            className="prototype-reset-button"
            onClick={onResetPrototype}
            title="Development/prototype only: reset Productivity Log data"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset Prototype Data</span>
            <span className="prototype-only-label">Development only</span>
          </button>
        )}
        <div className="user-profile" aria-label="Current user: Alex Santos">
          <span className="profile-initials" aria-hidden="true">
            AS
          </span>
          <span className="profile-name">Alex Santos</span>
          <ChevronDown size={14} aria-hidden="true" />
        </div>
      </div>
    </header>
  )
}
