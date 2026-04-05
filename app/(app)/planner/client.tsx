'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { addDays, format } from 'date-fns'
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
  space?: {
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
  const [currentDayStart, setCurrentDayStart] = useState(() => new Date())
  const [tasks, setTasks] = useState(initialTasks)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const visibleDays = useMemo(() => {
    const count = isMobile ? 1 : 3
    return Array.from({ length: count }, (_, i) => ({
      date: addDays(currentDayStart, i),
      dayIndex: i,
    }))
  }, [currentDayStart, isMobile])

  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    const backlog: Task[] = []

    visibleDays.forEach(({ date }) => {
      grouped[format(date, 'yyyy-MM-dd')] = []
    })

    tasks.forEach((task) => {
      if (task.completedAt) return

      if (task.plannedDate) {
        const dateKey = format(new Date(task.plannedDate), 'yyyy-MM-dd')
        if (grouped[dateKey] !== undefined) {
          grouped[dateKey].push(task)
        } else {
          backlog.push(task)
        }
      } else {
        backlog.push(task)
      }
    })

    return { grouped, backlog }
  }, [tasks, visibleDays])

  const getDayCapacity = useCallback(
    (tasks: Task[]) => {
      const totalHours = tasks.reduce((sum, task) => sum + (task.effortPoints || 1), 0)
      const percent = (totalHours / defaultCapacity) * 100
      return { totalHours, percent, capacity: defaultCapacity }
    },
    [defaultCapacity]
  )

  const goToPrevious = () => setCurrentDayStart(addDays(currentDayStart, isMobile ? -1 : -3))
  const goToNext = () => setCurrentDayStart(addDays(currentDayStart, isMobile ? 1 : 3))
  const goToToday = () => setCurrentDayStart(new Date())

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const taskId = active.id as string
    const targetDayKey = over.id as string
    const targetDate = targetDayKey === 'backlog' ? null : targetDayKey

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, plannedDate: targetDate } : t))
    )

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannedDate: targetDate }),
      })
      if (!response.ok) throw new Error('Failed to update task')
    } catch (error) {
      console.error('[Planner] Error updating task:', error)
      setTasks(initialTasks)
      alert('Failed to update task. Please try again.')
    }
  }

  const handleMarkComplete = async (taskId: string) => {
    const now = new Date().toISOString()
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completedAt: now } : t))
    )
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedAt: now }),
      })
      if (!response.ok) throw new Error('Failed to complete task')
    } catch (error) {
      console.error('[Planner] Error completing task:', error)
      setTasks(initialTasks)
      alert('Failed to complete task. Please try again.')
    }
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  // Match the dashboard layout pattern: fixed sidebar + offset main content
  const mainPaddingClass = isMobile
    ? ''
    : sidebarCollapsed
    ? 'ml-20'
    : 'ml-64'

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar
        workspaceName="Zebi"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className={`${mainPaddingClass} flex flex-col h-screen transition-all duration-300`}>
        {/* Header — minimal, let WeekNavigator own the date display */}
        <header className="bg-white sticky top-0 z-10 flex-shrink-0 border-b border-[#E5E5E5]">
          <div className="px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">Zebi · Weekly Planner</p>
          </div>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col px-6 py-6">
              {/* Week Navigator */}
              <div className="mb-6 flex-shrink-0">
                <WeekNavigator
                  currentStart={currentDayStart}
                  visibleDays={visibleDays}
                  isMobile={isMobile}
                  onPrevious={goToPrevious}
                  onNext={goToNext}
                  onToday={goToToday}
                />
              </div>

              {/* Main content area */}
              <div className="flex gap-6 flex-1 overflow-hidden min-h-0">
                {/* Day columns */}
                <div
                  className={`flex-1 grid gap-4 overflow-auto ${
                    isMobile ? 'grid-cols-1' : 'grid-cols-3'
                  }`}
                >
                  {visibleDays.map(({ date }) => {
                    const dateKey = format(date, 'yyyy-MM-dd')
                    return (
                      <DayColumn
                        key={dateKey}
                        date={date}
                        tasks={tasksByDay.grouped[dateKey] || []}
                        capacity={getDayCapacity(tasksByDay.grouped[dateKey] || [])}
                        onMarkComplete={handleMarkComplete}
                      />
                    )
                  })}
                </div>

                {/* Backlog — desktop only, beside day columns */}
                {!isMobile && (
                  <div className="w-80 flex-shrink-0 overflow-auto">
                    <BacklogSection
                      tasks={tasksByDay.backlog}
                      onMarkComplete={handleMarkComplete}
                      workspaceId={workspaceId}
                    />
                  </div>
                )}
              </div>

              {/* Backlog — mobile, below day columns */}
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
