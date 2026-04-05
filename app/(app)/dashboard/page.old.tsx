'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FaSearch } from 'react-icons/fa'
import Sidebar from '@/components/Sidebar'
import TaskCard from '@/components/TaskCard'
import GoalCard from '@/components/GoalCard'
import SignalCard from '@/components/SignalCard'
import TaskDetailModal from '@/components/TaskDetailModal'
import QuickAddModal from '@/components/QuickAddModal'
import FilterDropdown from '@/components/FilterDropdown'
// import NotificationBell from '@/components/NotificationBell' // TODO: Re-enable after notifications feature
import { getTasks, createTask, updateTask, Task } from '@/app/actions/tasks'
import { getStatuses, Status } from '@/app/actions/statuses'
import { getFilters, SavedFilter } from '@/app/actions/filters'
import { applyFilter } from '@/lib/filterUtils'

// Default workspace for now (will be user-specific later)
const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
// Placeholder user ID (will come from auth later)
const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

export default function DashboardPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<(Task & { goalTag?: string })[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [filters, setFilters] = useState<SavedFilter[]>([])
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | undefined>()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load tasks, statuses, and filters on mount
  useEffect(() => {
    async function loadData() {
      try {
        console.log('[Dashboard] Starting data load...')
        
        // Use API endpoints instead of server actions (which hang)
        const taskRes = await fetch(`/api/tasks/direct?workspaceId=${DEFAULT_WORKSPACE_ID}`)
        if (!taskRes.ok) throw new Error('Failed to fetch tasks')
        const taskData = await taskRes.json()
        
        const statusRes = await fetch(`/api/statuses?workspaceId=${DEFAULT_WORKSPACE_ID}`)
        const statusData = statusRes.ok ? await statusRes.json() : { statuses: [] }
        
        const filterRes = await fetch(`/api/filters?workspaceId=${DEFAULT_WORKSPACE_ID}`)
        const filterData = filterRes.ok ? await filterRes.json() : { filters: [] }

        console.log('[Dashboard] Data loaded:', { 
          tasks: taskData.count || 0, 
          statuses: statusData.statuses?.length || 0, 
          filters: filterData.filters?.length || 0 
        })
        
        setTasks(taskData.tasks || [])
        setStatuses(statusData.statuses || [])
        setFilters(filterData.filters || [])
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error('[Dashboard] Failed to load data:', errorMsg)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Helper to get status name from ID
  const getStatusName = (statusId: string): string => {
    const status = statuses.find(s => s.id === statusId)
    return status?.name || 'Unknown'
  }

  // Helper to get inbox status ID
  const getInboxStatusId = (): string => {
    const inbox = statuses.find(s => s.type === 'inbox')
    return inbox?.id || ''
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  // Apply filter to tasks
  const filteredTasks = activeFilterId
    ? applyFilter(tasks, filters.find(f => f.id === activeFilterId)!)
    : tasks

  const todayTasks = filteredTasks.slice(0, 5)
  const overflowCount = Math.max(0, filteredTasks.length - 5)

  // Handle creating a new task
  const handleAddTask = async (taskInput: { title: string; priority: number; tags?: string[]; goalId?: string }) => {
    const inboxStatusId = getInboxStatusId()
    if (!inboxStatusId) {
      console.error('No inbox status found')
      return
    }

    const newTask = await createTask(DEFAULT_WORKSPACE_ID, PLACEHOLDER_USER_ID, {
      title: taskInput.title,
      priority: taskInput.priority,
      statusId: inboxStatusId,
      tagNames: taskInput.tags,
      goalId: taskInput.goalId,
    })

    if (newTask) {
      setTasks([newTask, ...tasks])
    } else {
      // Fallback: add to local state only
      const fallbackTask: Task = {
        id: Date.now().toString(),
        title: taskInput.title,
        priority: taskInput.priority,
        statusId: inboxStatusId,
        workspaceId: DEFAULT_WORKSPACE_ID,
        tags: taskInput.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setTasks([fallbackTask, ...tasks])
    }
  }

  // Handle updating a task
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const updated = await updateTask(DEFAULT_WORKSPACE_ID, taskId, updates)
    if (updated) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updated } : t))
    }
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{today}</h1>
            <p className="text-gray-600 text-sm mt-1">
              You have {todayTasks.length} of {filteredTasks.length} tasks pinned
              {activeFilterId && filters.find(f => f.id === activeFilterId) && (
                <span className="text-accent-600"> (filtered)</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Filter Dropdown */}
            <FilterDropdown
              filters={filters}
              activeFilterId={activeFilterId}
              onFilterSelect={setActiveFilterId}
              onManageClick={() => router.push('/filters')}
            />
            <button className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
              <FaSearch />
            </button>
            {/* TODO: Re-enable NotificationBell after notifications feature is complete
            <NotificationBell
              userId={PLACEHOLDER_USER_ID}
              workspaceId={DEFAULT_WORKSPACE_ID}
              onNotificationClick={(taskId) => {
                const task = tasks.find(t => t.id === taskId)
                if (task) {
                  setSelectedTask(task)
                  setIsTaskDetailOpen(true)
                }
              }}
            />
            */}
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

      {/* 3-Panel Dashboard */}
      <main className="flex-1 p-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Panel 1: Today */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Today</h2>
              <p className="text-xs text-gray-500">{todayTasks.length} of 5</p>
            </div>
            <div className="space-y-3">
              {todayTasks.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-500 text-sm">No tasks match this filter</p>
                </div>
              ) : (
                todayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    title={task.title}
                    priority={task.priority}
                    goalTag={task.goalTag}
                    onClick={() => {
                      setSelectedTask(task)
                      setIsTaskDetailOpen(true)
                    }}
                  />
                ))
              )}
            </div>
            {overflowCount > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <button className="text-sm text-accent-500 hover:text-accent-600 font-medium">
                  +{overflowCount} more tasks
                </button>
              </div>
            )}
            <div className="pt-2">
              <input
                type="text"
                placeholder="Add task..."
                onClick={() => setIsQuickAddOpen(true)}
                className="w-full px-4 py-3 bg-white rounded-lg border border-gray-200 text-gray-900 placeholder-gray-500 focus:focus-ring cursor-pointer"
                readOnly
              />
            </div>
          </div>

          {/* Panel 2: Attention */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Attention</h2>
              <p className="text-xs text-gray-500">No signals</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">No attention signals at this time</p>
            </div>
          </div>

          {/* Panel 3: Goals */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Goals</h2>
              <p className="text-xs text-gray-500">0 active</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">No goals yet. Create one to get started.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <TaskDetailModal
        isOpen={isTaskDetailOpen}
        onClose={() => {
          setIsTaskDetailOpen(false)
          setSelectedTask(undefined)
        }}
        task={selectedTask}
        onUpdate={handleUpdateTask}
        workspaceId={DEFAULT_WORKSPACE_ID}
        userId={PLACEHOLDER_USER_ID}
        userName="You"
        statuses={statuses}
      />
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAdd={handleAddTask}
      />
      </div>
    </div>
  )
}
