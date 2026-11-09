type AvatarProps = {
  name: string
  initials: string
  image: number
  small?: boolean
}

export default function Avatar({
  name,
  initials,
  image,
  small = false,
}: AvatarProps) {
  return (
    <span
      className={`avatar${small ? ' avatar-small' : ''}`}
      role="img"
      aria-label={name}
    >
      <span aria-hidden="true">{initials}</span>
      <img
        src={`https://i.pravatar.cc/80?img=${image}`}
        alt=""
        onError={(event) => {
          event.currentTarget.style.display = 'none'
        }}
      />
    </span>
  )
}
