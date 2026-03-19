'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { startOfWeek, addDays, format, isToday, isSameDay } from 'date-fns'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import Sidebar from '@/components/Sidebar'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import WeekNavigator from './components/WeekNavigator'
import DayColumn from './components/DayColumn'
import PlannerTaskCard from './components/PlannerTaskCard'
import BacklogSection from './components/BacklogSection'

interface Task {
  id: string
  title: string
  description?: string | null
  priority: number
  dueAt?: Date | string | null
  completedAt?: Date | string | null
  plannedDate?: Date | string | null
  effortPoints?: number | null
  status: {
    id: string
    name: string
    type: string
  }
  project?: {
    id: string
    name: string
  } | null
  company?: {
    id: string
    name: string
  } | null
  objective?: {
    id: string
    title: string
  } | null
}

interface WeeklyPlannerClientProps {
  initialTasks: Task[]
  workspaceId: string
  defaultCapacity: number
}

export default function WeeklyPlannerClient({
  initialTasks,
  workspaceId,
  defaultCapacity,
}: WeeklyPlannerClientProps) {
  // Start with today as the first day in the 3-day view
  const [currentDayStart, setCurrentDayStart] = useState(() => new Date())
  const [tasks, setTasks] = useState(initialTasks)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Check mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Generate 3 consecutive days for desktop, 1 day for mobile
  const visibleDays = useMemo(() => {
    const count = isMobile ? 1 : 3
    return Array.from({ length: count }, (_, i) => ({
      date: addDays(currentDayStart, i),
      dayIndex: i,
    }))
  }, [currentDayStart, isMobile])

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    const backlog: Task[] = []

    // Initialize visible days
    visibleDays.forEach(({ date }) => {
      const dateKey = format(date, 'yyyy-MM-dd')
      grouped[dateKey] = []
    })

    tasks.forEach((task) => {
      // Skip completed tasks
      if (task.completedAt) return

      if (task.plannedDate) {
        const dateKey = format(new Date(task.plannedDate), 'yyyy-MM-dd')
        // Only add to grouped if it's in the visible days, otherwise backlog
        if (grouped[dateKey] !== undefined) {
          grouped[dateKey].push(task)
        } else {
          backlog.push(task) // Planned for a different day
        }
      } else {
        backlog.push(task)
      }
    })

    return { grouped, backlog }
  }, [tasks, visibleDays])

  // Calculate day capacity
  const getDayCapacity = useCallback(
    (tasks: Task[]) => {
      const totalHours = tasks.reduce((sum, task) => {
        const hours = task.effortPoints || 1 // Default 1 hour if no estimate
        return sum + hours
      }, 0)
      const percent = (totalHours / defaultCapacity) * 100
      return { totalHours, percent, capacity: defaultCapacity }
    },
    [defaultCapacity]
  )

  // Handle 3-day navigation (desktop) or single-day (mobile)
  const goToPrevious = () => {
    const daysToMove = isMobile ? 1 : 3
    setCurrentDayStart(addDays(currentDayStart, -daysToMove))
  }

  const goToNext = () => {
    const daysToMove = isMobile ? 1 : 3
    setCurrentDayStart(addDays(currentDayStart, daysToMove))
  }

  const goToToday = () => {
    setCurrentDayStart(new Date())
  }

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const taskId = active.id as string
    const targetDayKey = over.id as string

    // Parse target date or set to null for backlog
    const targetDate = targetDayKey === 'backlog' ? null : targetDayKey

    // Optimistic update
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, plannedDate: targetDate }
          : task
      )
    )

    // Save to API
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plannedDate: targetDate,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const data = await response.json()
      console.log('[Planner] Task updated:', data)
    } catch (error) {
      console.error('[Planner] Error updating task:', error)
      // Revert optimistic update
      setTasks(initialTasks)
      alert('Failed to update task. Please try again.')
    }
  }

  // Handle task completion
  const handleMarkComplete = async (taskId: string) => {
    const now = new Date().toISOString()

    // Optimistic update
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completedAt: now } : task
      )
    )

    // Save to API
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedAt: now,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete task')
      }
    } catch (error) {
      console.error('[Planner] Error completing task:', error)
      // Revert optimistic update
      setTasks(initialTasks)
      alert('Failed to complete task. Please try again.')
    }
  }

  // Get active task for drag overlay
  const activeTask = activeId
    ? tasks.find((t) => t.id === activeId)
    : null

  return (
    <ResponsivePageContainer>
      <Sidebar
        workspaceName="Zebi"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ResponsiveHeader
          title="Weekly Planner"
          subtitle="Zebi / Planner"
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-hidden bg-[#FAFAFA]">
            <div className="h-full max-w-[1400px] mx-auto px-6 py-6">
              {/* Navigation */}
              <div className="mb-6">
                <WeekNavigator
                  currentStart={currentDayStart}
                  visibleDays={visibleDays}
                  isMobile={isMobile}
                  onPrevious={goToPrevious}
                  onNext={goToNext}
                  onToday={goToToday}
                />
              </div>

              {/* Content */}
              <div className="flex gap-6 h-[calc(100%-5rem)]">
                {/* Days grid (3 columns on desktop, 1 on mobile) */}
                <div className={`flex-1 grid gap-4 overflow-auto ${
                  isMobile ? 'grid-cols-1' : 'grid-cols-3'
                }`}>
                  {visibleDays.map(({ date }) => {
                    const dateKey = format(date, 'yyyy-MM-dd')
                    return (
                      <DayColumn
                        key={dateKey}
                        date={date}
                        tasks={tasksByDay.grouped[dateKey] || []}
                        capacity={getDayCapacity(
                          tasksByDay.grouped[dateKey] || []
                        )}
                        onMarkComplete={handleMarkComplete}
                      />
                    )
                  })}
                </div>

                {/* Backlog sidebar (only on desktop) */}
                {!isMobile && (
                  <div className="w-80 flex-shrink-0">
                    <BacklogSection
                      tasks={tasksByDay.backlog}
                      onMarkComplete={handleMarkComplete}
                      workspaceId={workspaceId}
                    />
                  </div>
                )}
              </div>

              {/* Mobile backlog (below days) */}
              {isMobile && (
                <div className="mt-6">
                  <BacklogSection
                    tasks={tasksByDay.backlog}
                    onMarkComplete={handleMarkComplete}
                    workspaceId={workspaceId}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeTask ? (
              <div className="opacity-90">
                <PlannerTaskCard task={activeTask} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </ResponsivePageContainer>
  )
}
