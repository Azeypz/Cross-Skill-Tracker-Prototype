import { useId, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import FormField from '../components/FormField'
import { learningPlanStatuses, type LearningPlan } from '../types/activity'
import { customNameError } from '../data/activityRepository'
import { planCategories, proficiencies, formats, evidenceOptions, needsRemarks, newCheckpoint,
  newProposal, startWizard, wizardError, type CreationState, type PlanWizard, type WizardMilestone } from '../data/planWizard'

type Step = 1 | 2 | 3
const steps = ['Learning plan', 'Milestones', 'Activities & review']
const headings = ['Define the learning plan', 'Designate milestones', 'Assign activities and review']
const subtitles = [
  'Start with the capability the learner should gain, not merely a course to complete.',
  'Add meaningful, measurable checkpoints that demonstrate progress toward the objective.',
  'Connect practical learning activities to each milestone, then review the complete plan before creation.',
]

function Field({ label, multiline, onValue, value, ...props }: {
  label: string; multiline?: boolean; onValue: (v: string) => void; value: string | number
} & Pick<InputHTMLAttributes<HTMLInputElement>, 'required' | 'type' | 'min' | 'max' | 'step' | 'placeholder'>) {
  const id = useId()
  return <FormField id={id} label={label} required={props.required}>
    {multiline
      ? <textarea id={id} rows={2} placeholder={props.placeholder} required={props.required} value={value} onChange={(e) => onValue(e.target.value)} />
      : <input {...props} id={id} value={value} onChange={(e) => onValue(e.target.value)} />}
  </FormField>
}

function Choice<T extends string>({ label, value, options, onValue, required }: {
  label: string; value: string; options: readonly T[]; onValue: (v: T) => void; required?: boolean
}) {
  const id = useId()
  return <FormField id={id} label={label} required={required}>
    <select id={id} value={value} required={required} onChange={(e) => {
      const option = options.find((opt) => opt === e.target.value)
      if (option) onValue(option)
    }}>
      {!value && <option value="" disabled>Select {label.toLowerCase()}</option>}
      {options.map((opt) => <option key={opt}>{opt}</option>)}
    </select>
  </FormField>
}

function Review({ plan }: { plan: PlanWizard }) {
  const rows = [
    ['Plan title', plan.name], ['Category', plan.category === 'Other' ? plan.customCategory : plan.category],
    ['Learning objective', plan.description], ['Skill or competency', plan.targetSkill],
    ['Target proficiency', plan.targetProficiency], ['Start date', plan.startDate], ['Target completion', plan.targetCompletionDate],
    ['Status', plan.status], ['Total planned hours', plan.plannedHours], ['Resource URL', plan.resourceUrl], ['Remarks', plan.remarks],
  ]
  return <section className="wizard-review"><h3>Review your learning plan</h3>
    <dl>{rows.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {plan.milestones.map((m, i) => <section key={m.id}><h4>Milestone {i + 1}: {m.title}</h4>
      <p>Due: {m.dueDate} · {m.required ? 'Required' : 'Optional'} · {m.initialStatus}</p>
      <p>Completion criteria: {m.completionCriteria}</p>
      {m.proposedActivities.length ? <ul>{m.proposedActivities.map((a) => <li key={a.id}>
        <strong>{a.title || 'Untitled activity'}</strong> · {a.format}
        {a.estimatedHours !== undefined && ` · ${a.estimatedHours} hrs`}
        {a.evidenceExpected !== 'None' && ` · Evidence: ${a.evidenceExpected}`}
        {a.description && <p>{a.description}</p>}{a.resourceUrl && <p>Resource URL: {a.resourceUrl}</p>}
      </li>)}</ul> : <p>No proposed activities.</p>}
    </section>)}
  </section>
}

export default function LearningPlanForm({ draft, plans, onSave }: {
  draft?: LearningPlan; plans: LearningPlan[]; onSave: (plan: PlanWizard, state: CreationState) => void
}) {
  const [plan, setPlan] = useState(() => startWizard(draft))
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  function update(patch: Partial<PlanWizard>) { setPlan((p) => ({ ...p, ...patch })) }
  function editMilestone(id: string, patch: Partial<WizardMilestone>) {
    setPlan((p) => ({ ...p, milestones: p.milestones.map((m) => m.id === id ? { ...m, ...patch } : m) }))
  }
  function go(next: Step) {
    setError('')
    setStep(next)
    requestAnimationFrame(() => heading.current?.focus())
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const button = (e.nativeEvent as SubmitEvent).submitter
    const state = button instanceof HTMLButtonElement && button.value === 'Draft' ? 'Draft' : 'Created'
    const invalid = wizardError(plan, step, state) || (step === 1 && customNameError(plan.name, plans.filter((p) => p.id !== draft?.id).map((p) => p.name), 'learning plan'))
    if (invalid) { setError(invalid); return }
    if (step < 3) { go(step === 1 ? 2 : 3); return }
    try { onSave(plan, state) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Learning plan could not be saved.') }
  }
  return <div className="activity-page plan-wizard">
    <a className="back-to-log" href="#/learning-plans">Back to Learning Plans</a>
    <header className="activity-page-heading"><div><h1>Create a learning plan</h1>
      <p>Define the capability, set measurable checkpoints, then assign practical learning activities.</p></div></header>
    <nav aria-label="Plan creation steps" className="wizard-steps">{([1, 2, 3] as const).map((s) =>
      <button key={s} type="button" disabled={s > step} aria-current={s === step ? 'step' : undefined} onClick={() => go(s)}>{s} &nbsp;{steps[s - 1]}</button>)}</nav>
    <form className="activity-form wizard-card" onSubmit={submit}>
      <header><h2 tabIndex={-1} ref={heading}>{headings[step - 1]}</h2><p>{subtitles[step - 1]}</p></header>
      {step === 1 && <>
        <Field label="Plan title" required value={plan.name} onValue={(name) => update({ name })} placeholder="e.g., Azure application troubleshooting" />
        <Choice label="Category" required value={plan.category} options={planCategories} onValue={(category) => update({ category })} />
        {plan.category === 'Other' && <Field label="Custom Category" required value={plan.customCategory} onValue={(customCategory) => update({ customCategory })} />}
        <Field label="Learning objective" multiline required value={plan.description} onValue={(description) => update({ description })} placeholder="What should the learner be able to do after completing this plan?" />
        <div className="wizard-grid">
          <Field label="Skill or competency" required value={plan.targetSkill} onValue={(targetSkill) => update({ targetSkill })} placeholder="e.g., Azure monitoring and KQL" />
          <Choice label="Target proficiency" required value={plan.targetProficiency} options={proficiencies} onValue={(targetProficiency) => update({ targetProficiency })} />
          <Field label="Start date" required type="date" value={plan.startDate} onValue={(startDate) => update({ startDate })} />
          <Field label="Target completion" required type="date" min={plan.startDate} value={plan.targetCompletionDate} onValue={(targetCompletionDate) => update({ targetCompletionDate })} />
          <Choice label="Learning plan status" required value={plan.status} options={learningPlanStatuses} onValue={(status) => update({ status })} />
          <Field label="Total planned hours" type="number" step="any" min="0.01" value={plan.plannedHours ?? ''} onValue={(v) => update({ plannedHours: v ? Number(v) : undefined })} />
        </div>
        <Field label="Resource URL" type="url" value={plan.resourceUrl} onValue={(resourceUrl) => update({ resourceUrl })} />
        <Field label="Remarks" multiline required={needsRemarks(plan.category)} value={plan.remarks} onValue={(remarks) => update({ remarks })} />
        <p>Enter the title or details of the completed or planned training.</p>
      </>}
      {step === 2 && <>
        {plan.milestones.map((m, i) => <fieldset key={m.id}><legend>Milestone {i + 1}</legend>
          <div className="wizard-grid">
            <Field label="Milestone title" required value={m.title} onValue={(title) => editMilestone(m.id, { title })} placeholder="e.g., Demonstrate Azure monitoring fundamentals" />
            <Field label="Due date" required type="date" min={plan.startDate} max={plan.targetCompletionDate} value={m.dueDate} onValue={(dueDate) => editMilestone(m.id, { dueDate })} />
          </div>
          <Field label="Completion criteria" multiline required value={m.completionCriteria} onValue={(completionCriteria) => editMilestone(m.id, { completionCriteria })} placeholder="What measurable result will confirm this milestone?" />
          <Choice label="Initial status" value={m.initialStatus} options={learningPlanStatuses} onValue={(initialStatus) => editMilestone(m.id, { initialStatus })} />
          <label><input type="checkbox" checked={m.required} onChange={(e) => editMilestone(m.id, { required: e.target.checked })} /> Required for plan completion</label>
          <button type="button" className="secondary-button" disabled={plan.milestones.length === 1} onClick={() => update({ milestones: plan.milestones.filter((item) => item.id !== m.id) })}>Remove milestone</button>
        </fieldset>)}
        <button type="button" className="secondary-button" onClick={() => update({ milestones: [...plan.milestones, newCheckpoint()] })}>+ Add milestone</button>
      </>}
      {step === 3 && <>
        {plan.milestones.map((m, i) => <fieldset key={m.id}><legend>Milestone {i + 1}: {m.title}</legend>
          {m.proposedActivities.map((a, j) => {
            const change = (patch: Partial<typeof a>) => editMilestone(m.id, { proposedActivities: m.proposedActivities.map((item) => item.id === a.id ? { ...item, ...patch } : item) })
            return <section className="wizard-proposal" key={a.id}><h3>Activity {j + 1}</h3>
              <Field label="Activity title" required value={a.title} onValue={(title) => change({ title })} placeholder="e.g., Complete Azure Monitor hands-on lab" />
              <Field label="Activity description" multiline value={a.description} onValue={(description) => change({ description })} placeholder="Describe the learning task or expected work." />
              <div className="wizard-grid">
                <Choice label="Activity format" required value={a.format} options={formats} onValue={(format) => change({ format })} />
                <Field label="Estimated hours" type="number" min={0.25} max={24} step={0.25} value={a.estimatedHours ?? ''} onValue={(v) => change({ estimatedHours: v ? Number(v) : undefined })} />
                <Field label="Resource URL" type="url" value={a.resourceUrl} onValue={(resourceUrl) => change({ resourceUrl })} />
                <Choice label="Evidence expected" value={a.evidenceExpected} options={evidenceOptions} onValue={(evidenceExpected) => change({ evidenceExpected })} />
              </div>
              <button type="button" className="secondary-button" onClick={() => editMilestone(m.id, { proposedActivities: m.proposedActivities.filter((item) => item.id !== a.id) })}>Remove activity</button>
            </section>
          })}
          <button type="button" className="secondary-button" onClick={() => editMilestone(m.id, { proposedActivities: [...m.proposedActivities, newProposal()] })}>+ Add activity</button>
        </fieldset>)}
        <Review plan={plan} />
      </>}
      {error && <p className="form-save-error" role="alert">{error}</p>}
      <footer className="form-actions">
        {step > 1 && <button className="secondary-button" type="button" onClick={() => go(step === 3 ? 2 : 1)}>Back</button>}
        {step === 3 && <button className="secondary-button" type="submit" value="Draft" formNoValidate>Save as Draft</button>}
        <button className="primary-button" type="submit">{step === 3 ? 'Create Learning Plan' : 'Continue'}</button>
      </footer>
    </form>
  </div>
}