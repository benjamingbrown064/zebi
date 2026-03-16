'use client'

import { useState, useMemo, useCallback } from 'react'
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
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [tasks, setTasks] = useState(initialTasks)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedMobileDay, setSelectedMobileDay] = useState(0) // 0-6 for Mon-Sun

  // Check mobile on mount
  useState(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  })

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Generate week days
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        date: addDays(currentWeekStart, i),
        dayOfWeek: i,
      })),
    [currentWeekStart]
  )

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    const backlog: Task[] = []

    weekDays.forEach(({ date }) => {
      const dateKey = format(date, 'yyyy-MM-dd')
      grouped[dateKey] = []
    })

    tasks.forEach((task) => {
      // Skip completed tasks
      if (task.completedAt) return

      if (task.plannedDate) {
        const dateKey = format(new Date(task.plannedDate), 'yyyy-MM-dd')
        if (grouped[dateKey]) {
          grouped[dateKey].push(task)
        } else {
          backlog.push(task) // Planned for a different week
        }
      } else {
        backlog.push(task)
      }
    })

    return { grouped, backlog }
  }, [tasks, weekDays])

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

  // Handle week navigation
  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7))
  }

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  // Handle mobile day navigation
  const goToPreviousDay = () => {
    setSelectedMobileDay((prev) => Math.max(0, prev - 1))
  }

  const goToNextDay = () => {
    setSelectedMobileDay((prev) => Math.min(6, prev + 1))
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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-6 py-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-semibold text-[#1A1A1A]">
              Weekly Planner
            </h1>
          </div>

          <WeekNavigator
            weekStart={currentWeekStart}
            onPrevious={goToPreviousWeek}
            onNext={goToNextWeek}
            onToday={goToToday}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="h-full max-w-[1400px] mx-auto px-6 py-6">
            {isMobile ? (
              // Mobile: Single day view
              <div className="flex flex-col h-full gap-4">
                {/* Mobile day navigator */}
                <div className="flex items-center justify-between bg-white border border-[#E5E5E5] rounded-[14px] px-4 py-3">
                  <button
                    onClick={goToPreviousDay}
                    disabled={selectedMobileDay === 0}
                    className="px-3 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] disabled:opacity-50"
                  >
                    ← Prev
                  </button>
                  <span className="text-base font-medium text-[#1A1A1A]">
                    {format(weekDays[selectedMobileDay].date, 'EEEE, MMM d')}
                  </span>
                  <button
                    onClick={goToNextDay}
                    disabled={selectedMobileDay === 6}
                    className="px-3 py-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>

                {/* Mobile day content */}
                <DayColumn
                  date={weekDays[selectedMobileDay].date}
                  tasks={
                    tasksByDay.grouped[
                      format(weekDays[selectedMobileDay].date, 'yyyy-MM-dd')
                    ] || []
                  }
                  capacity={getDayCapacity(
                    tasksByDay.grouped[
                      format(weekDays[selectedMobileDay].date, 'yyyy-MM-dd')
                    ] || []
                  )}
                  onMarkComplete={handleMarkComplete}
                />

                {/* Mobile backlog */}
                <BacklogSection
                  tasks={tasksByDay.backlog}
                  onMarkComplete={handleMarkComplete}
                />
              </div>
            ) : (
              // Desktop: 7-column layout with sidebar
              <div className="flex gap-6 h-full">
                {/* Weekly board */}
                <div className="flex-1 grid grid-cols-7 gap-4 overflow-auto">
                  {weekDays.map(({ date }) => {
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

                {/* Backlog sidebar */}
                <div className="w-80 flex-shrink-0">
                  <BacklogSection
                    tasks={tasksByDay.backlog}
                    onMarkComplete={handleMarkComplete}
                  />
                </div>
              </div>
            )}
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
    </div>
  )
}
