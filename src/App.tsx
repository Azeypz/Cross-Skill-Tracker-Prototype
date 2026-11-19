import { useEffect, useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ActivityLog from './pages/ActivityLog'
import AddActivity from './pages/AddActivity'
import LearningPlans from './pages/LearningPlans'
import LearningPlanForm from './pages/LearningPlanForm'
import './pages/planWizard.css'
import AiCoach from './features/ai-coach/AiCoach'
import {
  activityCatalog,
  activityRepository,
  initialActivityData,
  resetPrototypeData,
} from './data/activityRepository'
import type {
  Activity,
  ActivityFilterValues,
  ActivityPage, LearningPlan,
  NewActivityInput,
  NewLearningPlanInput,
  PlanHoursInput,
} from './types/activity'

function currentPage(hash: string): ActivityPage {
  if (hash === '#/add-activity') return 'add-activity'
  if (hash === '#/learning-plans') return 'learning-plans'
  if (hash === '#/learning-plans/new' || hash.startsWith('#/learning-plans/draft/')) return 'plan-wizard'
  return 'my-log'
}

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash)
  const page = currentPage(hash)
  const draftId = hash.startsWith('#/learning-plans/draft/') ? hash.slice('#/learning-plans/draft/'.length) : undefined
  const [planNotice, setPlanNotice] = useState('')
  const [store, setStore] = useState(() => {
    try {
      return { data: activityRepository.load(), error: '' }
    } catch (error) {
      return {
        data: initialActivityData(),
        error:
          error instanceof Error
            ? error.message
            : 'Saved data could not be loaded.',
      }
    }
  })
  const { activities } = store.data
  const catalog = activityCatalog(store.data)
  const draft = catalog.learningPlans.find((p) => p.id === draftId && p.creationState === 'Draft')
  const createdPlans = catalog.learningPlans.filter((p) => p.creationState !== 'Draft')
  // Keep the Coach's strict wire contract independent of private planning notes and resource URLs.
  const coachPlans: LearningPlan[] = createdPlans.map(({ id, name, status, description, targetSkill, targetCompletionDate, category, plannedHours, milestones }) => ({
    id, name, status, description, targetSkill, targetCompletionDate, category, plannedHours,
    milestones: milestones.map(({ id, title, required, status, estimatedHours }) => ({ id, title, required, status, estimatedHours })),
  }))
  const completedLearningPlans = coachPlans.filter(
    (plan) => plan.status === 'Completed',
  )
  const completedPlanIds = new Set(
    completedLearningPlans.map((plan) => plan.id),
  )
  const eligibleLearningPlans = coachPlans
    .filter((plan) => !completedPlanIds.has(plan.id))
  const [notice, setNotice] = useState('')
  const [lastSavedActivityId, setLastSavedActivityId] = useState<string>()
  const [filters, setFilters] = useState<ActivityFilterValues>(() => {
    return {
      from: '',
      to: '',
      category: '',
      status: '',
    }
  })

  useEffect(() => {
    const handleNavigation = () => {
      setHash(window.location.hash)
      if (window.location.hash !== '#/learning-plans') setPlanNotice('')
    }
    window.addEventListener('hashchange', handleNavigation)
    return () => window.removeEventListener('hashchange', handleNavigation)
  }, [])

  function saveActivity(input: NewActivityInput): Activity {
    const data = activityRepository.saveActivity(input)
    const savedActivity = data.activities.find(
      (activity) =>
        activity.id === (input.idempotencyKey ?? data.activities[0]?.id),
    )
    if (!savedActivity)
      throw new Error('The saved activity could not be verified by its ID.')
    setStore({ data, error: '' })
    setLastSavedActivityId(data.activities[0].id)
    setFilters({ from: '', to: '', category: '', status: '' })
    setNotice('Activity saved successfully.')
    window.location.hash = '/my-log'
    return savedActivity
  }

  function deleteActivity(activityId: string) {
    const data = activityRepository.deleteActivity(activityId)
    setStore({ data, error: '' })
  }

  function saveLearningPlan(input: NewLearningPlanInput) {
    const data = activityRepository.saveLearningPlan(input)
    setStore({ data, error: '' })
  }

  function savePlanHours(input: PlanHoursInput) {
    const data = activityRepository.savePlanHours(input)
    setStore({ data, error: '' })
  }

  function resetPrototype() {
    if (
      !window.confirm(
        'Reset Productivity Log prototype data? Activities, custom learning plans, custom categories, and milestone progress will be removed. This cannot be undone.',
      )
    )
      return
    try {
      resetPrototypeData()
      window.location.reload()
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Prototype data could not be reset.',
      )
    }
  }

  return (
    <div className="productivity-shell ai-coach-enabled">
      <a
        className="skip-to-content"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        Skip to content
      </a>
      <Header onResetPrototype={import.meta.env.DEV ? resetPrototype : undefined} />
      <Sidebar page={page === 'plan-wizard' ? 'learning-plans' : page} />
      <main className="activity-main" id="main-content" tabIndex={-1}>
        {store.error && (
          <p className="form-save-error" role="alert">
            {store.error}
          </p>
        )}
        {page === 'my-log' ? (
          <ActivityLog
            activities={activities}
            learningPlans={catalog.learningPlans}
            categories={catalog.categories}
            lastSavedActivityId={lastSavedActivityId}
            onDeleteActivity={deleteActivity}
            filters={filters}
            onFiltersChange={setFilters}
            notice={notice}
            onDismissNotice={() => setNotice('')}
          />
        ) : page === 'add-activity' ? (
          <AddActivity
            learningPlans={createdPlans}
            categories={catalog.categories}
            onSave={saveActivity}
          />
        ) : page === 'plan-wizard' ? (
          draftId !== undefined && !draft ? <p role="alert">Draft not found. <a href="#/learning-plans">Return to Learning Plans</a></p> :
          <LearningPlanForm key={hash} plans={catalog.learningPlans} draft={draft} onSave={(input, state) => {
            const data = activityRepository.saveWizard(input, state, draftId)
            setStore({ data, error: '' })
            setPlanNotice(state === 'Draft' ? 'Draft saved. Choose Edit draft to continue.' : 'Learning plan created successfully.')
            window.location.hash = '/learning-plans'
          }} />
        ) : (
          <LearningPlans
            learningPlans={catalog.learningPlans}
            activities={activities}
            customPlanIds={store.data.customLearningPlans.map((plan) => plan.id)}
            notice={planNotice}
            onSaveHours={savePlanHours}
            onSaveStatus={(id, status) => setStore({ data: activityRepository.savePlanStatus(id, status), error: '' })}
          />
        )}
      </main>
      <AiCoach
        context={{
          activities,
          learningPlans: coachPlans,
          completedLearningPlans,
          eligibleLearningPlans,
          categories: catalog.categories,
          dataUnavailable: Boolean(store.error),
        }}
        onSaveActivity={saveActivity}
        onSaveLearningPlan={saveLearningPlan}
      />
    </div>
  )
}
