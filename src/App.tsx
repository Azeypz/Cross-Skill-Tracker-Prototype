import { useEffect, useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ActivityLog from './pages/ActivityLog'
import AddActivity from './pages/AddActivity'
import LearningPlans from './pages/LearningPlans'
import AiCoach from './features/ai-coach/AiCoach'
import {
  activityCatalog,
  activityRepository,
  initialActivityData,
  learningPlanStatus,
  resetPrototypeData,
} from './data/activityRepository'
import type {
  Activity,
  ActivityFilterValues,
  ActivityPage,
  NewActivityInput,
  NewLearningPlanInput,
} from './types/activity'

function currentPage(): ActivityPage {
  if (window.location.hash === '#/add-activity') return 'add-activity'
  if (window.location.hash === '#/learning-plans') return 'learning-plans'
  return 'my-log'
}

export default function App() {
  const [page, setPage] = useState<ActivityPage>(currentPage)
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
  const completedLearningPlans = catalog.learningPlans.filter(
    (plan) => learningPlanStatus(plan) === 'Completed',
  )
  const completedPlanIds = new Set(
    completedLearningPlans.map((plan) => plan.id),
  )
  const eligibleLearningPlans = catalog.learningPlans
    .filter((plan) => !completedPlanIds.has(plan.id))
    .map((plan) => ({
      ...plan,
      milestones: plan.milestones.filter(
        (milestone) => milestone.status !== 'Completed',
      ),
    }))
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
    const handleNavigation = () => setPage(currentPage())
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
      <Sidebar page={page} />
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
            learningPlans={catalog.learningPlans}
            categories={catalog.categories}
            onSave={saveActivity}
          />
        ) : (
          <LearningPlans
            learningPlans={catalog.learningPlans}
            onSave={saveLearningPlan}
          />
        )}
      </main>
      <AiCoach
        context={{
          activities,
          learningPlans: catalog.learningPlans,
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
