import type {
  Activity,
  ActivityCategory,
  LearningPlan,
} from '../types/activity'

export const categories: ActivityCategory[] = [
  'Cloud',
  'Database Administration',
  'App Development',
  'Networking',
  'Security',
  'Containers / Kubernetes',
  'Infrastructure as Code',
  'AI / Generative AI',
]

export const learningPlans: LearningPlan[] = [
  {
    id: 'azure',
    status: 'Not Started',
    name: 'Azure',
    category: 'Cloud',
    milestones: [
      { id: 'azure-certification', title: 'Azure Certification', required: true, status: 'Not Started' },
      { id: 'azure-upskilling', title: 'Azure Upskilling', required: true, status: 'Not Started' },
    ],
  },
  {
    id: 'oracle',
    status: 'Not Started',
    name: 'Oracle Database',
    category: 'Database Administration',
    milestones: [
      { id: 'oracle-certification', title: 'Oracle Database Certification', required: true, status: 'Not Started' },
      { id: 'oracle-upskilling', title: 'Oracle Database Upskilling', required: true, status: 'Not Started' },
    ],
  },
  {
    id: 'google-cloud',
    status: 'Not Started',
    name: 'Google Cloud Platform',
    category: 'Cloud',
    milestones: [
      { id: 'gcp-certification', title: 'Google Cloud Platform Certification', required: true, status: 'Not Started' },
      { id: 'gcp-upskilling', title: 'Google Cloud Platform Upskilling', required: true, status: 'Not Started' },
    ],
  },
  {
    id: 'sql',
    status: 'Not Started',
    name: 'SQL DBA',
    category: 'Database Administration',
    milestones: [
      { id: 'sql-certification', title: 'SQL DBA Certification', required: true, status: 'Not Started' },
      { id: 'sql-upskilling', title: 'SQL DBA Upskilling', required: true, status: 'Not Started' },
    ],
  },
  {
    id: 'claude',
    status: 'Not Started',
    name: 'Claude',
    category: 'AI / Generative AI',
    milestones: [
      { id: 'claude-certification', title: 'Claude Certification', required: true, status: 'Not Started' },
      { id: 'claude-upskilling', title: 'Claude Upskilling', required: true, status: 'Not Started' },
    ],
  },
  {
    id: 'aws',
    status: 'Not Started',
    name: 'AWS',
    category: 'Cloud',
    milestones: [
      { id: 'aws-certification', title: 'AWS Certification', required: true, status: 'Not Started' },
      { id: 'aws-upskilling', title: 'AWS Upskilling', required: true, status: 'Not Started' },
    ],
  },
]

export const sampleActivities: Activity[] = [
  {
    id: 'activity-1',
    date: '2024-10-15',
    title: 'Azure Fundamentals Study',
    learningPlanId: 'azure',
    milestoneId: 'azure-study',
    category: 'Cloud',
    hours: 2,
    status: 'Completed',
    reflection: {
      learning: 'Compared Azure compute, storage, and networking services.',
      blockers: '',
      nextStep: 'Put the concepts into practice in an Azure VM lab.',
    },
  },
  {
    id: 'activity-2',
    date: '2024-10-14',
    title: 'Power Apps Canvas App Practice',
    learningPlanId: 'power-apps',
    milestoneId: 'canvas-app',
    category: 'App Development',
    hours: 1.5,
    status: 'In Progress',
    reflection: {
      learning: 'Built a canvas app with a gallery and detail screen.',
      blockers: 'Still working through delegation warnings.',
      nextStep: 'Connect the app to a filtered data source.',
    },
  },
  {
    id: 'activity-3',
    date: '2024-10-14',
    title: 'SQL Joins and Subqueries',
    learningPlanId: 'sql',
    milestoneId: 'sql-joins',
    category: 'Database Administration',
    hours: 1,
    status: 'Completed',
    reflection: {
      learning: 'Used joins and subqueries to query related tables.',
      blockers: '',
      nextStep: 'Review query execution plans.',
    },
  },
  {
    id: 'activity-4',
    date: '2024-10-13',
    title: 'Azure VM Lab',
    learningPlanId: 'azure',
    milestoneId: 'azure-vm',
    category: 'Cloud',
    hours: 2,
    status: 'Completed',
    reflection: {
      learning:
        'Deployed a virtual machine and configured a network security group.',
      blockers: '',
      nextStep: 'Review access rules and clean up lab resources.',
    },
  },
  {
    id: 'activity-5',
    date: '2024-10-12',
    title: 'Stored Procedures Lab',
    learningPlanId: 'sql',
    milestoneId: 'sql-procedures',
    category: 'Database Administration',
    hours: 2,
    status: 'In Progress',
    reflection: {
      learning: 'Created parameterized stored procedures.',
      blockers: 'Need to add transaction error handling.',
      nextStep: 'Test rollback behavior.',
    },
  },
  {
    id: 'activity-6',
    date: '2024-10-11',
    title: 'Power Apps Form Practice',
    learningPlanId: 'power-apps',
    milestoneId: 'power-forms',
    category: 'App Development',
    hours: 1,
    status: 'Completed',
    reflection: {
      learning: 'Configured form validation and submit behavior.',
      blockers: '',
      nextStep: 'Add a confirmation screen.',
    },
  },
]

export function activityLearningPlanName(
  planId: string,
  plans: readonly LearningPlan[],
) {
  return plans.find((plan) => plan.id === planId)?.name ??
    (planId === 'power-apps' ? 'Power Apps' : 'Learning plan unavailable')
}

export function formatActivityDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}
