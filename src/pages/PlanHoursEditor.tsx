import { useState } from 'react'
import type { FormEvent } from 'react'
import FormField from '../components/FormField'
import type { LearningPlan, PlanHoursInput } from '../types/activity'

export default function PlanHoursEditor({ plan, canAddMilestone, onSave, onCancel }: {
  plan: LearningPlan
  canAddMilestone: boolean
  onSave: (input: PlanHoursInput) => void | Promise<void>
  onCancel: () => void
}) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const values = new FormData(event.currentTarget)
    const total = String(values.get('plannedHours') ?? '').trim()
    const milestoneHours: Record<string, number> = {}
    for (const milestone of plan.milestones) {
      const value = String(values.get(milestone.id) ?? '').trim()
      if (value) milestoneHours[milestone.id] = Number(value)
    }
    const title = String(values.get('newTitle') ?? '').trim()
    const hours = String(values.get('newHours') ?? '').trim()
    if (Boolean(title) !== Boolean(hours)) {
      setError('Enter both a title and planned hours for the new milestone.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        planId: plan.id,
        plannedHours: total ? Number(total) : undefined,
        milestoneHours,
        newMilestone: title ? { title, estimatedHours: Number(hours) } : undefined,
      })
      onCancel()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Planned hours could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="activity-form" onSubmit={submit}>
      <h2>Planned hours: {plan.name}</h2>
      <p>Progress counts each milestone’s planned hours once when a linked activity is completed. Leave the total blank if it is not known.</p>
      <FormField id="plan-hours-total" label="Total planned hours">
        <input id="plan-hours-total" name="plannedHours" type="number" min="0.01" step="any" defaultValue={plan.plannedHours ?? ''} />
      </FormField>
      {plan.milestones.map((milestone, index) => (
        <FormField key={milestone.id} id={`plan-hours-${index}`} label={`${milestone.title} planned hours`}>
          <input id={`plan-hours-${index}`} name={milestone.id} type="number" min="0.01" step="any" defaultValue={milestone.estimatedHours ?? ''} />
        </FormField>
      ))}
      {canAddMilestone && (
        <>
          <FormField id="plan-hours-new-title" label="New planned milestone">
            <input id="plan-hours-new-title" name="newTitle" />
          </FormField>
          <FormField id="plan-hours-new-hours" label="New milestone planned hours">
            <input id="plan-hours-new-hours" name="newHours" type="number" min="0.01" step="any" />
          </FormField>
        </>
      )}
      {error && <p className="form-save-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="secondary-button" disabled={saving} onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving...' : 'Save planned hours'}</button>
      </div>
    </form>
  )
}
