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
  pointerWithin,
  rectIntersection,
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
  status: { id: string; name: string; type: string }
  project?: { id: string; name: string } | null
  space?: { id: string; name: string } | null
  objective?: { id: string; title: string } | null
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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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
    visibleDays.forEach(({ date }) => { grouped[format(date, 'yyyy-MM-dd')] = [] })
    tasks.forEach((task) => {
      if (task.completedAt) return
      if (task.plannedDate) {
        const dateKey = format(new Date(task.plannedDate), 'yyyy-MM-dd')
        grouped[dateKey] !== undefined ? grouped[dateKey].push(task) : backlog.push(task)
      } else {
        backlog.push(task)
      }
    })
    return { grouped, backlog }
  }, [tasks, visibleDays])

  const getDayCapacity = useCallback((dayTasks: Task[]) => {
    const totalHours = dayTasks.reduce((sum, task) => sum + (task.effortPoints || 1), 0)
    return { totalHours, percent: (totalHours / defaultCapacity) * 100, capacity: defaultCapacity }
  }, [defaultCapacity])

  const goToPrevious = () => setCurrentDayStart(addDays(currentDayStart, isMobile ? -1 : -3))
  const goToNext = () => setCurrentDayStart(addDays(currentDayStart, isMobile ? 1 : 3))
  const goToToday = () => setCurrentDayStart(new Date())

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const taskId = active.id as string
    const targetDate = over.id === 'backlog' ? null : over.id as string
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, plannedDate: targetDate } : t))
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannedDate: targetDate }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setTasks(initialTasks)
    }
  }

  const handleMarkComplete = async (taskId: string) => {
    const now = new Date().toISOString()
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completedAt: now } : t))
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedAt: now }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setTasks(initialTasks)
    }
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  return (
    <div className="h-screen bg-[#F9F9F9] flex flex-col overflow-hidden">
      {/* ── Consistent top bar ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5] px-6 py-3 flex-shrink-0">
        <h1 className="text-[15px] font-semibold text-[#1A1A1A]">Weekly Planner</h1>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Week navigator */}
          <div className="mb-4 flex-shrink-0 px-6 pt-5">
            <WeekNavigator
              currentStart={currentDayStart}
              visibleDays={visibleDays}
              isMobile={isMobile}
              onPrevious={goToPrevious}
              onNext={goToNext}
              onToday={goToToday}
            />
          </div>

          {/* Day columns + backlog — flex-1 + min-h-0 allows inner scroll */}
          <div className="flex flex-1 overflow-hidden min-h-0 h-full px-6 pb-6 gap-4">
            <div className={`flex-1 grid h-full gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
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

            {!isMobile && (
              <div className="w-72 flex-shrink-0 h-full">
                <BacklogSection
                  tasks={tasksByDay.backlog}
                  onMarkComplete={handleMarkComplete}
                  workspaceId={workspaceId}
                />
              </div>
            )}
          </div>

          {isMobile && (
            <div className="mt-5">
              <BacklogSection
                tasks={tasksByDay.backlog}
                onMarkComplete={handleMarkComplete}
                workspaceId={workspaceId}
              />
            </div>
          )}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="opacity-90">
              <PlannerTaskCard task={activeTask} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
