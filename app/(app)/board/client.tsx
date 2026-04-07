'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TaskBoardTile from '@/components/TaskBoardTile'
import TaskDetailModal from '@/components/TaskDetailModal'
import QuickAddModal from '@/components/QuickAddModal'
import BoardFilters, { BoardFiltersState } from '@/components/BoardFilters'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import { FaPlus } from 'react-icons/fa'
import { getTasks } from '@/app/actions/tasks'
import { getStatuses } from '@/app/actions/statuses'
import { updateTask, deleteTask, createTask } from '@/app/actions/tasks'
import { getGoals, calculateGoalProgress } from '@/app/actions/goals'

// All lanes use the same neutral background — cleaner Monolith style
const STATUS_ORDER: Record<string, number> = {
  inbox: 0, todo: 1, doing: 2, review: 3, check: 4, done: 5,
  // legacy aliases
  planned: 1, 'in_progress': 2, blocked: 2,
}

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

export default function BoardClient({
  initialTasks,
  initialStatuses,
}: {
  initialTasks: any[]
  initialStatuses: any[]
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState(initialTasks)
  const [statuses, setStatuses] = useState(initialStatuses)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [draggedTask, setDraggedTask] = useState<any>(null)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [quickAddStatusId, setQuickAddStatusId] = useState<string>('')
  const [goals, setGoals] = useState<any[]>([])
  const [filters, setFilters] = useState<BoardFiltersState>({
    goals: [],
    priorities: [],
    assignees: [],
    dates: 'all',
  })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Track pending drag updates to prevent rapid successive moves from reverting
  // Use useRef to persist across renders
  const pendingUpdatesRef = useRef(new Map<string, { statusId: string; timestamp: number }>())

  // Refetch on mount, then every 30 seconds — paused when tab is hidden
  useEffect(() => {
    const refetchData = async () => {
      // Don't poll when tab is not visible — saves DB load
      if (document.visibilityState === 'hidden') return
      try {
        const [newTasks, newStatuses, newGoals] = await Promise.all([
          getTasks(DEFAULT_WORKSPACE_ID),
          getStatuses(DEFAULT_WORKSPACE_ID),
          getGoals(DEFAULT_WORKSPACE_ID),
        ])

        // Clean up stale pending updates (older than 10 seconds)
        const now = Date.now()
        for (const [taskId, update] of pendingUpdatesRef.current.entries()) {
          if (now - update.timestamp > 10000) pendingUpdatesRef.current.delete(taskId)
        }

        // Only update tasks that don't have pending local updates
        setTasks(prevTasks =>
          newTasks.map(newTask => {
            if (pendingUpdatesRef.current.has(newTask.id)) {
              return prevTasks.find(t => t.id === newTask.id) || newTask
            }
            return newTask
          })
        )
        setStatuses(newStatuses)
        setGoals(newGoals)
      } catch (err) {
        console.error('Failed to refetch board data:', err)
      }
    }

    refetchData()

    // Poll every 30s instead of 5s — 6x fewer DB hits
    const interval = setInterval(refetchData, 30000)

    // Also refetch immediately when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetchData()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Extract unique assignees from tasks
  const uniqueAssignees = useMemo(() => {
    const assigneeMap = new Map<string, string>()
    tasks.forEach(task => {
      if (task.assigneeId && !assigneeMap.has(task.assigneeId)) {
        assigneeMap.set(task.assigneeId, task.assigneeId)
      }
    })
    
    const result: Array<{ id: string; name: string }> = []
    assigneeMap.forEach((id) => {
      result.push({ id, name: id === 'doug' ? 'Doug' : id === 'ben' ? 'Ben' : id === 'other' ? 'Other' : id })
    })
    return result
  }, [tasks])

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filter by goal
      if (filters.goals.length > 0 && !filters.goals.includes(task.goalId)) {
        return false
      }
      
      // Filter by priority
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
        return false
      }
      
      // Filter by assignee (only check if filters are active)
      if (filters.assignees.length > 0) {
        // Task matches filter if its assigneeId is in the filter list
        // OR if task has no assignee and "unassigned" filter is not checked
        if (!task.assigneeId) {
          // Skip unassigned tasks if there's an assignee filter active
          return false
        }
        if (!filters.assignees.includes(task.assigneeId)) {
          return false
        }
      }
      
      // Filter by date
      if (filters.dates !== 'all' && task.dueAt) {
        const dueDate = new Date(task.dueAt)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        switch (filters.dates) {
          case 'overdue':
            return dueDate < today
          case 'today':
            return dueDate.toDateString() === today.toDateString()
          case 'thisWeek': {
            const weekEnd = new Date(today)
            weekEnd.setDate(weekEnd.getDate() + 7)
            return dueDate >= today && dueDate <= weekEnd
          }
        }
      }
      
      return true
    })
  }, [tasks, filters])

  // Group filtered tasks by status
  const tasksByStatus: Record<string, any[]> = {}
  statuses.forEach(status => {
    tasksByStatus[status.id] = filteredTasks.filter(t => t.statusId === status.id)
  })

  const handleDragStart = (task: any) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (statusId: string) => {
    if (!draggedTask) return

    // Check if there's already a pending update for this task
    // If so, update to the latest statusId but keep the original timestamp
    const pending = pendingUpdatesRef.current.get(draggedTask.id)
    const now = Date.now()

    // Only allow update if no pending update or if last update was > 2 seconds ago
    if (pending && now - pending.timestamp < 2000) {
      console.log(`[Board] Skipping drag - update in flight for task ${draggedTask.id}`)
      setDraggedTask(null)
      return
    }

    // Track this pending update
    pendingUpdatesRef.current.set(draggedTask.id, { statusId, timestamp: now })

    // Optimistic update
    setTasks(
      tasks.map(t =>
        t.id === draggedTask.id ? { ...t, statusId } : t
      )
    )

    // Persist to database
    try {
      await fetch(`/api/tasks/${draggedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusId }),
      })
      console.log(`Task ${draggedTask.id} status updated to ${statusId}`)
      // Clear pending update on success
      pendingUpdatesRef.current.delete(draggedTask.id)
    } catch (err) {
      console.error('Failed to update task status:', err)
      // Revert on error
      setTasks(
        tasks.map(t =>
          t.id === draggedTask.id ? { ...t, statusId: draggedTask.statusId } : t
        )
      )
      // Clear pending update on error
      pendingUpdatesRef.current.delete(draggedTask.id)
    }

    setDraggedTask(null)
  }

  // Handle task completion with proper workflow
  const handleComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const isCompleting = !task.completedAt
    const currentStatus = statuses.find(s => s.id === task.statusId)
    
    const updates: any = {}
    
    // Workflow logic based on current status
    if (isCompleting) {
      const doingStatus = statuses.find(s => s.type === 'doing')
      const checkStatus = statuses.find(s => s.type === 'check')
      
      // If in Planned → move to Doing (start work)
      if (currentStatus?.type === 'planned' && doingStatus) {
        updates.statusId = doingStatus.id
        updates.completedAt = null // Not completed yet, just started
      }
      // If in Doing → move to Check (finish work)
      else if (currentStatus?.type === 'doing' && checkStatus) {
        updates.statusId = checkStatus.id
        updates.completedAt = new Date().toISOString()
      }
      // If in Check → move to Done (approved/tested)
      else if (currentStatus?.type === 'check') {
        const doneStatus = statuses.find(s => s.type === 'done')
        if (doneStatus) {
          updates.statusId = doneStatus.id
          updates.completedAt = new Date().toISOString()
        }
      }
      // For any other status, just mark as complete and move to Check
      else if (checkStatus) {
        updates.statusId = checkStatus.id
        updates.completedAt = new Date().toISOString()
      }
    } else {
      // Uncompleting - just remove completedAt
      updates.completedAt = null
    }
    
    setTasks(
      tasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      )
    )

    // Call API to update
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      
      // Recalculate goal progress if task has a goal
      const completedTask = tasks.find(t => t.id === taskId)
      if (completedTask?.goalId) {
        console.log(`Recalculating progress for goal ${completedTask.goalId}`)
        await calculateGoalProgress(DEFAULT_WORKSPACE_ID, completedTask.goalId)
        
        // Update goals in state to trigger re-render
        const updatedGoals = await getGoals(DEFAULT_WORKSPACE_ID)
        setGoals(updatedGoals)
      }
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  // Handle snooze
  const handleSnooze = async (taskId: string, until: Date) => {
    setTasks(
      tasks.map(t =>
        t.id === taskId ? { ...t, dueAt: until.toISOString() } : t
      )
    )

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueAt: until.toISOString() }),
      })
    } catch (err) {
      console.error('Failed to snooze task:', err)
    }
  }

  // Handle priority change
  const handlePriorityChange = async (taskId: string, priority: number) => {
    setTasks(
      tasks.map(t =>
        t.id === taskId ? { ...t, priority } : t
      )
    )

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      })
    } catch (err) {
      console.error('Failed to update priority:', err)
    }
  }

  // Handle view task - navigate to task URL
  const handleView = (taskId: string) => {
    router.push(`/tasks/${taskId}`)
  }

  // Handle task update
  const handleTaskUpdate = async (taskId: string, updates: any) => {
    // Optimistic update
    const previousTasks = tasks
    setTasks(
      tasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      )
    )

    try {
      const updatedTask = await updateTask(DEFAULT_WORKSPACE_ID, taskId, updates)
      // Use server response to ensure data consistency
      if (updatedTask) {
        setTasks(
          tasks.map(t =>
            t.id === taskId ? updatedTask : t
          )
        )
        console.log(`Task ${taskId} updated successfully with assigneeId: ${updatedTask.assigneeId}`)
      }
    } catch (err) {
      console.error('Failed to update task:', err)
      // Revert on error
      setTasks(previousTasks)
    }
  }

  // Handle task delete
  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(DEFAULT_WORKSPACE_ID, taskId)
      setTasks(tasks.filter(t => t.id !== taskId))
      setIsModalOpen(false)
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  // Handle create task
  const handleCreateTask = async (taskData: any) => {
    try {
      const newTask = await createTask(
        DEFAULT_WORKSPACE_ID,
        '00000000-0000-0000-0000-000000000000',
        {
          title: taskData.title,
          priority: taskData.priority,
          statusId: quickAddStatusId,
          tagNames: taskData.tags,
          goalId: taskData.goalId,
        }
      )

      if (newTask) {
        setTasks([newTask, ...tasks])
        setIsQuickAddOpen(false)
      }
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  // Handle open quick add
  const handleOpenQuickAdd = (statusId: string) => {
    setQuickAddStatusId(statusId)
    setIsQuickAddOpen(true)
  }


  // Skeleton loading state
  const isLoading = tasks.length === 0 && statuses.length === 0

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5] px-6 py-3 flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-[#1A1A1A]">Board</h1>
        <div className="flex items-center gap-3">
          <BoardFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableGoals={goals.map(g => ({ id: g.id, name: g.name }))}
            availableAssignees={uniqueAssignees}
          />
          <span className="text-[12px] text-[#A3A3A3]">
            {filteredTasks.length} of {tasks.length} tasks
          </span>
        </div>
      </div>

      {/* Board */}
      <main className="p-6 overflow-x-auto">
        {isLoading ? (
          /* ── Skeleton ────────────────────────────────────────────── */
          <div className="flex gap-5 min-w-max">
            {[1, 2, 3, 4].map(col => (
              <div key={col} className="w-72 flex-shrink-0">
                {/* Column header skeleton */}
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className="h-2.5 w-16 bg-[#E5E5E5] rounded animate-pulse" />
                  <div className="h-4 w-5 bg-[#E5E5E5] rounded animate-pulse" />
                </div>
                {/* Card skeletons */}
                <div className="space-y-3">
                  {Array.from({ length: col === 1 ? 3 : col === 2 ? 2 : col === 3 ? 4 : 1 }).map((_, i) => (
                    <div key={i} className="bg-white rounded border border-[#E5E5E5] p-4 animate-pulse">
                      <div className="h-2 w-20 bg-[#F3F3F3] rounded mb-3" />
                      <div className="h-3.5 w-full bg-[#F3F3F3] rounded mb-1.5" />
                      <div className="h-3.5 w-3/4 bg-[#F3F3F3] rounded mb-4" />
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-8 bg-[#F3F3F3] rounded" />
                        <div className="h-6 w-6 bg-[#F3F3F3] rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-5 min-w-max pb-6">
            {statuses
              .filter(s => s.type !== 'blocked')
              .sort((a, b) => (STATUS_ORDER[a.type] ?? 999) - (STATUS_ORDER[b.type] ?? 999))
              .map(status => {
                const columnTasks = tasksByStatus[status.id] || []
                return (
                  <div
                    key={status.id}
                    className="w-72 flex-shrink-0 flex flex-col max-h-[calc(100vh-140px)]"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(status.id)}
                  >
                    {/* Column header */}
                    <div className="flex items-center gap-2 mb-4 px-1">
                      <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#A3A3A3]">
                        {status.name}
                      </h2>
                      <span className="text-[11px] font-bold text-[#1A1A1A] bg-white border border-[#E5E5E5] rounded-full w-5 h-5 flex items-center justify-center leading-none">
                        {columnTasks.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {columnTasks.length === 0 ? (
                        <div
                          className="border-2 border-dashed border-[#E5E5E5] rounded h-24 flex items-center justify-center text-[12px] text-[#C6C6C6]"
                        >
                          Drop tasks here
                        </div>
                      ) : (
                        columnTasks.map(task => (
                          <TaskBoardTile
                            key={task.id}
                            task={task}
                            onDragStart={handleDragStart}
                            onComplete={handleComplete}
                            onSnooze={handleSnooze}
                            onPriorityChange={handlePriorityChange}
                            onView={handleView}
                          />
                        ))
                      )}
                    </div>

                    {/* Add task */}
                    <button
                      onClick={() => handleOpenQuickAdd(status.id)}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-medium text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-white rounded border border-dashed border-[#E5E5E5] transition-colors"
                    >
                      <FaPlus size={10} />
                      Add task
                    </button>
                  </div>
                )
              })}
          </div>
        )}
      </main>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        workspaceId={DEFAULT_WORKSPACE_ID}
        userId="00000000-0000-0000-0000-000000000000"
        userName="User"
        statuses={statuses}
      />

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAdd={handleCreateTask}
        workspaceId={DEFAULT_WORKSPACE_ID}
      />
    </div>
  )
}
