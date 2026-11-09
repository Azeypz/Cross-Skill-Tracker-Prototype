import type { ReactNode } from 'react'

interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  children: ReactNode
}

export default function FormField({
  id,
  label,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="required-marker" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
    </div>
  )
}
