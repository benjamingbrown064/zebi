'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TaskCard from '@/components/TaskCard'
import QuickAddModal from '@/components/QuickAddModal'
import FilterDropdown from '@/components/FilterDropdown'
import { FaPlus } from 'react-icons/fa'
import { getTasks, createTask, updateTask, Task } from '@/app/actions/tasks'
import { getStatuses, Status } from '@/app/actions/statuses'
import { getFilters, SavedFilter } from '@/app/actions/filters'
import { applyFilter } from '@/lib/filterUtils'

// Fallback mock data
const STATUS_COLORS: Record<string, string> = {
  inbox: 'bg-gray-50',
  planned: 'bg-blue-50',
  doing: 'bg-amber-50',
  blocked: 'bg-red-50',
  done: 'bg-green-50',
}

// Default workspace for now
const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

export default function BoardPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [filters, setFilters] = useState<SavedFilter[]>([])
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        console.log('Board: loading data...')
        
        // Use direct API instead of server actions (which hang on client)
        const taskRes = await fetch(`/api/tasks/direct?workspaceId=${DEFAULT_WORKSPACE_ID}`)
        if (!taskRes.ok) throw new Error('Failed to fetch tasks')
        const taskData = await taskRes.json()
        
        const statusRes = await fetch(`/api/statuses?workspaceId=${DEFAULT_WORKSPACE_ID}`)
        const statusData = statusRes.ok ? await statusRes.json() : { statuses: [] }
        
        const filterRes = await fetch(`/api/filters?workspaceId=${DEFAULT_WORKSPACE_ID}`)
        const filterData = filterRes.ok ? await filterRes.json() : { filters: [] }

        console.log('Board: loaded', {
          tasks: taskData.count || 0,
          statuses: statusData.statuses?.length || 0,
          filters: filterData.filters?.length || 0,
        })

        setTasks(taskData.tasks || [])
        setStatuses(statusData.statuses || [])
        setFilters(filterData.filters || [])
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error('Board: Failed to load data:', errorMsg)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (statusId: string) => {
    if (!draggedTask) return

    // Optimistic update
    setTasks(tasks.map((t) => (t.id === draggedTask.id ? { ...t, statusId } : t)))

    // Persist to database
    const updated = await updateTask(DEFAULT_WORKSPACE_ID, draggedTask.id, { statusId })
    if (!updated) {
      // Rollback on failure
      setTasks(tasks)
      console.error('Failed to update task status')
    }

    setDraggedTask(null)
  }

  const handleAddTask = async (taskInput: { title: string; priority: number; tags?: string[] }) => {
    const inboxStatus = statuses.find(s => s.type === 'inbox')
    if (!inboxStatus) return

    const newTask = await createTask(DEFAULT_WORKSPACE_ID, PLACEHOLDER_USER_ID, {
      title: taskInput.title,
      priority: taskInput.priority,
      statusId: inboxStatus.id,
      tagNames: taskInput.tags,
    })

    if (newTask) {
      setTasks([newTask, ...tasks])
    }
  }

  // Apply filter to tasks
  const filteredTasks = activeFilterId
    ? applyFilter(tasks, filters.find(f => f.id === activeFilterId)!)
    : tasks

  const getTasksByStatus = (statusId: string) => {
    return filteredTasks.filter((t) => t.statusId === statusId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-cream flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
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
      <div className="ml-64">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Board View</h1>
            <p className="text-gray-600 text-sm mt-1">
              Organize tasks by status
              {activeFilterId && <span className="text-accent-600"> (filtered)</span>}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <FilterDropdown
              filters={filters}
              activeFilterId={activeFilterId}
              onFilterSelect={setActiveFilterId}
              onManageClick={() => router.push('/filters')}
            />
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition flex items-center gap-2"
            >
              <FaPlus /> Add task
            </button>
          </div>
        </div>
      </header>

      {/* Active Filter Badge */}
      {activeFilterId && filters.find(f => f.id === activeFilterId) && (
        <div className="px-8 py-2 bg-accent-50 border-b border-accent-100">
          <div className="flex items-center gap-2 text-sm text-accent-700">
            <span>📋 Showing:</span>
            <span className="font-medium">{filters.find(f => f.id === activeFilterId)?.name}</span>
            <button
              onClick={() => setActiveFilterId(null)}
              className="ml-2 px-2 py-0.5 bg-accent-100 hover:bg-accent-200 rounded text-xs"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 p-8 overflow-x-auto">
        {statuses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No statuses found. Please refresh the page.</p>
          </div>
        ) : (
        <div className="flex gap-6 min-w-min">
          {statuses.map((status) => {
            const statusTasks = getTasksByStatus(status.id)
            const color = STATUS_COLORS[status.type] || 'bg-gray-50'
            return (
              <div
                key={status.id}
                className="w-80 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <div className={`${color} px-4 py-4 border-b border-gray-200`}>
                  <h2 className="font-semibold text-gray-900">{status.name}</h2>
                  <p className="text-xs text-gray-500 mt-1">{statusTasks.length} tasks</p>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(status.id)}
                  className="flex-1 p-4 space-y-3 min-h-96"
                >
                  {statusTasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-sm">No tasks</div>
                  ) : (
                    statusTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task)}
                        className="cursor-move"
                      >
                        <TaskCard title={task.title} priority={task.priority} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
        )}
      </main>

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAdd={handleAddTask}
      />
      </div>
    </div>
  )
}
