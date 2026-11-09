export default function ProgressBar({
  value,
  label,
  color = 'purple',
}: {
  value: number
  label: string
  color?: string
}) {
  return (
    <div
      className={`progress-track ${color}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  )
}
