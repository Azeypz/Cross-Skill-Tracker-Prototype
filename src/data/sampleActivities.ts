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
    name: 'Azure Fundamentals',
    category: 'Cloud',
    milestones: [
      { id: 'azure-study', title: 'Azure Fundamentals Study', required: true },
      { id: 'azure-vm', title: 'Azure VM Lab', required: true },
      { id: 'azure-review', title: 'Azure Knowledge Review', required: true },
    ],
  },
  {
    id: 'power-apps',
    name: 'Power Apps',
    category: 'App Development',
    milestones: [
      {
        id: 'canvas-app',
        title: 'Power Apps Canvas App Practice',
        required: true,
      },
      { id: 'power-forms', title: 'Power Apps Form Practice', required: true },
    ],
  },
  {
    id: 'oracle',
    name: 'Oracle Database Administration',
    category: 'Database Administration',
    milestones: [
      {
        id: 'oracle-architecture',
        title: 'Oracle Database Architecture',
        required: true,
      },
      {
        id: 'oracle-backup',
        title: 'Oracle Backup and Recovery Lab',
        required: true,
      },
    ],
  },
  {
    id: 'google-cloud',
    name: 'Google Cloud',
    category: 'Cloud',
    milestones: [
      {
        id: 'gcp-core',
        title: 'Google Cloud Core Services Study',
        required: true,
      },
      { id: 'gcp-compute', title: 'Compute Engine Lab', required: true },
    ],
  },
  {
    id: 'sql',
    name: 'SQL for DBA',
    category: 'Database Administration',
    milestones: [
      { id: 'sql-joins', title: 'SQL Joins and Subqueries', required: true },
      { id: 'sql-procedures', title: 'Stored Procedures Lab', required: true },
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

export function formatActivityDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}
