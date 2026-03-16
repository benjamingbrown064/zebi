'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { FaPlus } from 'react-icons/fa'
import { useWorkspace } from '@/lib/use-workspace'

const STATUS_COLORS: Record<string, string> = {
  inbox: 'bg-gray-50',
  planned: 'bg-blue-50',
  doing: 'bg-amber-50',
  blocked: 'bg-red-50',
  done: 'bg-green-50',
}

export default function BoardFixedPage() {
  const router = useRouter()
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [tasks, setTasks] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (!workspaceId) return
    
    // Fetch data client-side with explicit error handling
    ;(async () => {
      try {
        const res = await fetch(`/api/tasks/direct?workspaceId=${workspaceId}`)
        if (res.ok) {
          const data = await res.json()
          setTasks(data.tasks || [])
        }

        const statusRes = await fetch(`/api/statuses?workspaceId=${workspaceId}`)
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setStatuses(statusData.statuses || [])
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [workspaceId])

  // Group tasks by status
  const tasksByStatus: Record<string, any[]> = {}
  statuses.forEach(status => {
    tasksByStatus[status.id] = tasks.filter(t => t.statusId === status.id)
  })

  if (workspaceLoading || loading || !workspaceId) {
    return (
      <div className="min-h-screen bg-bg-cream flex items-center justify-center">
        <div className="text-gray-600">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-cream">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={sidebarCollapsed ? 'ml-16' : 'ml-64'}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <h1 className="text-2xl font-semibold text-gray-900">Board</h1>
            <p className="text-gray-600 text-sm mt-1">{tasks.length} tasks</p>
          </div>
        </header>

        {/* Board */}
        <main className="p-8">
          <div className="grid grid-flow-col gap-6 overflow-x-auto pb-6">
            {statuses.map(status => (
              <div
                key={status.id}
                className={`${STATUS_COLORS[status.type] || 'bg-gray-50'} rounded-lg p-4 min-w-64 max-h-screen overflow-y-auto flex flex-col`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">{status.name}</h2>
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                    {tasksByStatus[status.id]?.length || 0}
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  {!tasksByStatus[status.id] || tasksByStatus[status.id].length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      No tasks
                    </div>
                  ) : (
                    tasksByStatus[status.id].map(task => (
                      <div
                        key={task.id}
                        className="bg-white p-3 rounded border border-gray-200 hover:shadow-sm cursor-pointer transition"
                      >
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          P{task.priority}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <button className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:bg-white rounded transition">
                  <FaPlus size={14} />
                  Add task
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
