import { getTaskByShareSlug } from '@/app/actions/sharing'
import { notFound } from 'next/navigation'

interface SharePageProps {
  params: Promise<{ slug: string }>
}

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
  2: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  3: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  4: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No due date'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default async function SharePage({ params }: SharePageProps) {
  const { slug } = await params
  const task = await getTaskByShareSlug(slug)

  if (!task) {
    notFound()
  }

  const priority = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS[3]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-accent-600">Focus</span>
            <span className="text-sm text-gray-500">Shared Task</span>
          </div>
          <a
            href="/"
            className="text-sm text-accent-600 hover:text-accent-700 font-medium"
          >
            Try Zebi →
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Task Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-gray-900 mb-3">
                  {task.title}
                </h1>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${priority.color}`}>
                    {priority.label}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {task.status}
                  </span>
                  {task.goalName && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      🎯 {task.goalName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Task Details */}
          <div className="p-6 space-y-6">
            {/* Due Date */}
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-1">Due Date</h2>
              <p className="text-gray-900">{formatDate(task.dueAt)}</p>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Description</h2>
                <p className="text-gray-900 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Comments */}
            {task.comments.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3">
                  Comments ({task.comments.length})
                </h2>
                <div className="space-y-3">
                  {task.comments.map((comment, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-900 text-sm whitespace-pre-wrap">
                        {comment.body}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTimeAgo(comment.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Shared via{' '}
            <a href="/" className="text-accent-600 hover:text-accent-700 font-medium">
              Focus
            </a>
            {' '}— The task management app for high performers
          </p>
        </div>
      </main>
    </div>
  )
}
