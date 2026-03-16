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

const STATUS_COLORS: Record<string, string> = {
  inbox: 'bg-gray-50',
  planned: 'bg-blue-50',
  doing: 'bg-amber-50',
  review: 'bg-cyan-50',
  blocked: 'bg-red-50',
  done: 'bg-green-50',
  check: 'bg-purple-50', // Match lane color in board
}

const STATUS_PILL_COLORS: Record<string, string> = {
  inbox: 'bg-gray-100 text-gray-700',
  planned: 'bg-blue-100 text-blue-700',
  doing: 'bg-amber-100 text-amber-700',
  review: 'bg-cyan-100 text-cyan-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
  check: 'bg-purple-100 text-purple-700', // Match lane background
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

  // Refetch tasks on mount and every 5 seconds to show newly created tasks
  useEffect(() => {
    const refetchData = async () => {
      try {
        const [newTasks, newStatuses, newGoals] = await Promise.all([
          getTasks(DEFAULT_WORKSPACE_ID),
          getStatuses(DEFAULT_WORKSPACE_ID),
          getGoals(DEFAULT_WORKSPACE_ID),
        ])
        console.log('[Board] Refetch complete:', {
          taskCount: newTasks.length,
          statusCount: newStatuses.length,
          goalCount: newGoals.length,
          pendingCount: pendingUpdatesRef.current.size,
          tasks: newTasks.slice(0, 3).map(t => ({ id: t.id, title: t.title, statusId: t.statusId }))
        })
        
        // Clean up stale pending updates (older than 10 seconds)
        const now = Date.now()
        for (const [taskId, update] of pendingUpdatesRef.current.entries()) {
          if (now - update.timestamp > 10000) {
            console.log(`[Board] Clearing stale pending update for task ${taskId}`)
            pendingUpdatesRef.current.delete(taskId)
          }
        }
        
        // Only update tasks that don't have pending updates
        // This prevents the refetch from overwriting recent drags/actions
        setTasks(prevTasks => {
          return newTasks.map(newTask => {
            // If task has a pending update, keep the local version
            if (pendingUpdatesRef.current.has(newTask.id)) {
              const localTask = prevTasks.find(t => t.id === newTask.id)
              console.log(`[Board] Skipping refetch for task ${newTask.id} - has pending update`)
              return localTask || newTask
            }
            return newTask
          })
        })
        
        setStatuses(newStatuses)
        setGoals(newGoals)
      } catch (err) {
        console.error('Failed to refetch board data:', err)
      }
    }

    // Refetch immediately on mount
    console.log('[Board] Initial mount - fetching tasks...')
    refetchData()

    // Then refetch every 5 seconds
    const interval = setInterval(refetchData, 5000)

    return () => clearInterval(interval)
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

  const mainPaddingClass = isMobile ? 'pt-[64px]' : sidebarCollapsed ? 'ml-16' : 'ml-64'

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={mainPaddingClass}>
        <ResponsiveHeader
          title="Board"
          secondaryActions={[
            {
              label: 'Filters',
              onClick: () => {},
            }
          ]}
        >
          <div className="flex items-center gap-4 mt-3">
            <BoardFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableGoals={goals.map(g => ({ id: g.id, name: g.name }))}
              availableAssignees={uniqueAssignees}
            />
            <p className="text-[13px] text-[#A3A3A3]">
              {filteredTasks.length} of {tasks.length} tasks
            </p>
          </div>
        </ResponsiveHeader>

        {/* Board */}
        <main className="p-4 md:p-8">
          <div className="grid grid-flow-col gap-6 overflow-x-auto pb-6 auto-cols-max">
            {statuses
              .filter(status => status.type !== 'blocked')
              .sort((a, b) => {
                // Define the desired order
                const order: Record<string, number> = {
                  inbox: 0,
                  planned: 1,
                  doing: 2,
                  review: 3,
                  check: 4,
                  done: 5,
                }
                return (order[a.type] ?? 999) - (order[b.type] ?? 999)
              })
              .map(status => (
              <div
                key={status.id}
                className={`${STATUS_COLORS[status.type] || 'bg-gray-50'} rounded-lg w-72 md:w-80 max-h-[calc(100vh-200px)] flex flex-col overflow-hidden`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(status.id)}
              >
                {/* Sticky Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 pt-4 pb-4 bg-inherit border-b border-[#E5E5E5]">
                  <h2 className="font-medium text-[#1A1A1A]">{status.name}</h2>
                  <span className="text-[12px] text-[#A3A3A3] bg-white px-2 py-1 rounded">
                    {tasksByStatus[status.id]?.length || 0}
                  </span>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 px-4 py-3">
                  <div className="space-y-3">
                    {!tasksByStatus[status.id] || tasksByStatus[status.id].length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        No tasks
                      </div>
                    ) : (
                      tasksByStatus[status.id].map(task => (
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
                </div>

                {/* Sticky Footer */}
                <div className="sticky bottom-0 z-10 px-4 py-3 bg-inherit border-t border-[#E5E5E5]">
                  <button 
                    onClick={() => handleOpenQuickAdd(status.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:bg-white/50 rounded transition"
                  >
                    <FaPlus size={14} />
                    Add task
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

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
