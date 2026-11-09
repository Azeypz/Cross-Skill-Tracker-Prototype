import { useEffect, useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ActivityLog from './pages/ActivityLog'
import AddActivity from './pages/AddActivity'
import LearningPlans from './pages/LearningPlans'
import AiCoach from './features/ai-coach/AiCoach'
import { sampleActivities } from './data/sampleActivities'
import {
  activityCatalog,
  activityRepository,
  initialActivityData,
} from './data/activityRepository'
import type {
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
  const [notice, setNotice] = useState('')
  const [lastSavedActivityId, setLastSavedActivityId] = useState<string>()
  const [filters, setFilters] = useState<ActivityFilterValues>(() => {
    const hasSavedActivities = activities.some(
      (activity) =>
        !sampleActivities.some((sample) => sample.id === activity.id),
    )
    return {
      from: hasSavedActivities ? '' : '2024-10-01',
      to: hasSavedActivities ? '' : '2024-10-31',
      category: '',
      status: '',
    }
  })

  useEffect(() => {
    const handleNavigation = () => setPage(currentPage())
    window.addEventListener('hashchange', handleNavigation)
    return () => window.removeEventListener('hashchange', handleNavigation)
  }, [])

  function saveActivity(input: NewActivityInput) {
    const data = activityRepository.saveActivity(input)
    setStore({ data, error: '' })
    setLastSavedActivityId(data.activities[0].id)
    setFilters({ from: '', to: '', category: '', status: '' })
    setNotice('Activity saved successfully.')
    window.location.hash = '/my-log'
  }

  function saveLearningPlan(input: NewLearningPlanInput) {
    const data = activityRepository.saveLearningPlan(input)
    setStore({ data, error: '' })
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
      <Header />
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
          categories: catalog.categories,
          dataUnavailable: Boolean(store.error),
        }}
        onSaveActivity={saveActivity}
      />
    </div>
  )
}
