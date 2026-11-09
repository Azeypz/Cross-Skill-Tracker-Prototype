export type Page =
  | 'Dashboard'
  | 'Members'
  | 'Learning Plans'
  | 'Weekly Progress'
  | 'Modules & Labs'
  | 'Assessments'
  | 'Activity Log'

export type Plan = {
  id: number
  title: string
  category: string
  member: string
  avatar: number
  initials: string
  completed: number
  total: number
  progress: number
  color: 'purple' | 'blue' | 'green' | 'orange'
}

export type Activity = {
  id: number
  member: string
  initials: string
  avatar: number
  action: string
  subject: string
  time: string
  kind: 'completed' | 'started' | 'assessment'
}
