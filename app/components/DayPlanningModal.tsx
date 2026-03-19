'use client'

import { useState, useEffect } from 'react'
import { FaTimes, FaRobot, FaList, FaClock, FaFolder, FaCheck, FaPlus, FaGripVertical, FaExclamationTriangle } from 'react-icons/fa'
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
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Task {
  id: string
  title: string
  priority?: number
  dueAt?: string
  project?: { name: string } | null
  company?: { name: string } | null
  status?: { name: string; type: string } | null
}

interface Suggestion {
  id: string
  name: string
  type: 'task' | 'project' | 'objective'
  score: number
  reasons: string[]
  metadata: any
}

interface DayPlanningModalProps {
  onClose: () => void
  onSave: () => void
  workspaceId: string
}

type TabType = 'suggestions' | 'all' | 'recent'
type CategoryType = 'main' | 'secondary' | 'additional' | 'other'

export default function DayPlanningModal({ onClose, onSave, workspaceId }: DayPlanningModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('suggestions')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Plan slots
  const [primaryTask, setPrimaryTask] = useState<Task | null>(null)
  const [secondaryTasks, setSecondaryTasks] = useState<Task[]>([])
  const [quickWins, setQuickWins] = useState<Task[]>([])
  const [additionalTasks, setAdditionalTasks] = useState<Task[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      // Load tasks and suggestions in parallel
      const [tasksRes, suggestionsRes, planRes] = await Promise.all([
        fetch(`/api/tasks/direct?workspaceId=${workspaceId}&includeCompleted=false&includeArchived=false`),
        fetch(`/api/dashboard/suggestions?workspaceId=${workspaceId}`).catch(() => null),
        fetch(`/api/dashboard/plan?workspaceId=${workspaceId}`).catch(() => null),
      ])

      // Tasks — required
      if (!tasksRes.ok) {
        const err = await tasksRes.text()
        throw new Error(`Failed to load tasks (${tasksRes.status}): ${err}`)
      }
      const tasksData = await tasksRes.json()
      const tasks: Task[] = (tasksData.tasks || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueAt: t.dueAt,
        project: t.projectId ? { name: t.projectId } : null, // minimal until we enrich
        company: null,
        status: null,
      }))
      setAllTasks(tasks)

      // Suggestions — best-effort
      if (suggestionsRes?.ok) {
        const suggestionsData = await suggestionsRes.json()
        setSuggestions(suggestionsData.suggestions || [])
      }

      // Existing plan — best-effort
      if (planRes?.ok) {
        const planData = await planRes.json()
        const plannedTasks = planData.tasks || []
        setPrimaryTask(plannedTasks.find((t: any) => t.todayCategory === 'main') || null)
        setSecondaryTasks(plannedTasks.filter((t: any) => t.todayCategory === 'secondary'))
        setQuickWins(plannedTasks.filter((t: any) => t.todayCategory === 'additional'))
        setAdditionalTasks(plannedTasks.filter((t: any) => t.todayCategory === 'other'))
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('DayPlanningModal: Failed to load data:', msg)
      setLoadError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToPlan = (taskId: string, category: CategoryType) => {
    // Find from tasks or suggestions
    const task = allTasks.find(t => t.id === taskId)
    const suggestion = suggestions.find(s => (s.metadata?.id || s.id) === taskId)

    const taskToAdd: Task = task || {
      id: suggestion?.metadata?.id || taskId,
      title: suggestion?.name || taskId,
      priority: suggestion?.metadata?.priority,
      dueAt: suggestion?.metadata?.dueAt,
      project: suggestion?.metadata?.project ? { name: suggestion.metadata.project } : null,
      company: suggestion?.metadata?.company ? { name: suggestion.metadata.company } : null,
    }

    if (category === 'main' && !primaryTask) {
      setPrimaryTask(taskToAdd)
    } else if (category === 'secondary' && secondaryTasks.length < 2) {
      setSecondaryTasks(prev => [...prev, taskToAdd])
    } else if (category === 'additional' && quickWins.length < 3) {
      setQuickWins(prev => [...prev, taskToAdd])
    } else if (category === 'other') {
      setAdditionalTasks(prev => [...prev, taskToAdd])
    }
  }

  const handleRemoveFromPlan = (taskId: string, category: CategoryType) => {
    if (category === 'main') setPrimaryTask(null)
    else if (category === 'secondary') setSecondaryTasks(prev => prev.filter(t => t.id !== taskId))
    else if (category === 'additional') setQuickWins(prev => prev.filter(t => t.id !== taskId))
    else if (category === 'other') setAdditionalTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const findTaskById = (id: string): { task: Task; category: CategoryType } | null => {
    if (primaryTask?.id === id) return { task: primaryTask, category: 'main' }
    const sec = secondaryTasks.find(t => t.id === id)
    if (sec) return { task: sec, category: 'secondary' }
    const qw = quickWins.find(t => t.id === id)
    if (qw) return { task: qw, category: 'additional' }
    const add = additionalTasks.find(t => t.id === id)
    if (add) return { task: add, category: 'other' }
    return null
  }

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeTaskData = findTaskById(active.id as string)
    if (!activeTaskData) return

    const { task: activeTask, category: fromCategory } = activeTaskData
    const overId = over.id as string

    let toCategory: CategoryType | null = null
    if (overId === 'primary-drop') toCategory = 'main'
    else if (overId === 'secondary-drop') toCategory = 'secondary'
    else if (overId === 'quickwin-drop') toCategory = 'additional'
    else if (overId === 'additional-drop') toCategory = 'other'
    else {
      const overTaskData = findTaskById(overId)
      if (overTaskData) toCategory = overTaskData.category
    }

    if (!toCategory || toCategory === fromCategory) return

    handleRemoveFromPlan(activeTask.id, fromCategory)
    handleAddToPlan(activeTask.id, toCategory)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const existingPlanRes = await fetch(`/api/dashboard/plan?workspaceId=${workspaceId}`)
      const existingPlan = await existingPlanRes.json()
      for (const task of existingPlan.tasks || []) {
        await fetch(`/api/dashboard/plan?taskId=${task.id}`, { method: 'DELETE' })
      }

      const planEntries = [
        ...(primaryTask ? [{ task: primaryTask, category: 'main' }] : []),
        ...secondaryTasks.map(t => ({ task: t, category: 'secondary' })),
        ...quickWins.map(t => ({ task: t, category: 'additional' })),
        ...additionalTasks.map(t => ({ task: t, category: 'other' })),
      ]

      for (const { task, category } of planEntries) {
        await fetch('/api/dashboard/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id, category, workspaceId }),
        })
      }

      onSave()
    } catch (error) {
      console.error('Failed to save plan:', error)
    } finally {
      setSaving(false)
    }
  }

  const isTaskInPlan = (taskId: string) =>
    primaryTask?.id === taskId ||
    secondaryTasks.some(t => t.id === taskId) ||
    quickWins.some(t => t.id === taskId) ||
    additionalTasks.some(t => t.id === taskId)

  const activeTask = activeId ? findTaskById(activeId)?.task : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-[14px] shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <div>
            <h3 className="text-[20px] font-medium text-[#1A1A1A]">Plan Your Day</h3>
            <p className="text-[13px] text-[#A3A3A3] mt-0.5">
              Drag tasks to reorder or move between categories
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[6px] hover:bg-[#F5F5F5] flex items-center justify-center transition-colors"
          >
            <FaTimes className="text-[#A3A3A3]" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Task Selection */}
          <div className="flex-1 flex flex-col border-r border-[#E5E5E5]">
            {/* Tabs */}
            <div className="flex border-b border-[#E5E5E5]">
              {(['suggestions', 'all', 'recent'] as TabType[]).map((tab) => {
                const labels: Record<TabType, { label: string; icon: React.ReactNode }> = {
                  suggestions: { label: 'AI Suggestions', icon: <FaRobot /> },
                  all: { label: 'All Tasks', icon: <FaList /> },
                  recent: { label: 'Recent', icon: <FaClock /> },
                }
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-3 text-[13px] font-medium transition-colors ${
                      activeTab === tab
                        ? 'text-[#DD3A44] border-b-2 border-[#DD3A44]'
                        : 'text-[#737373] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {labels[tab].icon}
                      {labels[tab].label}
                      {tab === 'all' && !loading && allTasks.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-[#F5F5F5] rounded-[4px] text-[11px] text-[#737373]">
                          {allTasks.length}
                        </span>
                      )}
                      {tab === 'suggestions' && !loading && suggestions.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-[#FEF2F2] rounded-[4px] text-[11px] text-[#DD3A44]">
                          {suggestions.length}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-5 h-5 border-2 border-[#DD3A44] border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-[13px] text-[#A3A3A3]">Loading tasks...</p>
                </div>
              ) : loadError ? (
                <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-[10px]">
                  <div className="flex items-start gap-3">
                    <FaExclamationTriangle className="text-[#DD3A44] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[13px] font-medium text-[#1A1A1A] mb-1">Failed to load tasks</p>
                      <p className="text-[12px] text-[#737373] mb-3">{loadError}</p>
                      <button
                        onClick={loadData}
                        className="text-[12px] px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-[6px] hover:bg-[#F5F5F5] transition-colors"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              ) : activeTab === 'suggestions' ? (
                <SuggestionsTab
                  suggestions={suggestions}
                  onAdd={handleAddToPlan}
                  isTaskInPlan={isTaskInPlan}
                />
              ) : activeTab === 'all' ? (
                <AllTasksTab
                  tasks={allTasks}
                  onAdd={handleAddToPlan}
                  isTaskInPlan={isTaskInPlan}
                />
              ) : (
                <AllTasksTab
                  tasks={allTasks.slice(0, 20)}
                  onAdd={handleAddToPlan}
                  isTaskInPlan={isTaskInPlan}
                />
              )}
            </div>
          </div>

          {/* Right: Plan Preview */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="w-96 bg-[#FAFAFA] p-6 overflow-y-auto">
              <h4 className="text-[15px] font-medium text-[#1A1A1A] mb-4">Your Plan</h4>

              <DroppableZone id="primary-drop" label="Primary (1)">
                {primaryTask ? (
                  <DraggableTask
                    task={primaryTask}
                    onRemove={() => handleRemoveFromPlan(primaryTask.id, 'main')}
                    color="red"
                  />
                ) : (
                  <EmptySlot text="No primary task selected" />
                )}
              </DroppableZone>

              <DroppableZone id="secondary-drop" label="Secondary (2)">
                <SortableContext items={secondaryTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {secondaryTasks.map((task) => (
                    <DraggableTask
                      key={task.id}
                      task={task}
                      onRemove={() => handleRemoveFromPlan(task.id, 'secondary')}
                      color="yellow"
                    />
                  ))}
                  {secondaryTasks.length < 2 && <EmptySlot text="Empty slot" />}
                </SortableContext>
              </DroppableZone>

              <DroppableZone id="quickwin-drop" label="Quick Wins (3)">
                <SortableContext items={quickWins.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {quickWins.map((task) => (
                    <DraggableTask
                      key={task.id}
                      task={task}
                      onRemove={() => handleRemoveFromPlan(task.id, 'additional')}
                      color="blue"
                    />
                  ))}
                  {quickWins.length < 3 && <EmptySlot text="Empty slot" />}
                </SortableContext>
              </DroppableZone>

              {additionalTasks.length > 0 && (
                <DroppableZone id="additional-drop" label={`Additional (${additionalTasks.length})`}>
                  {additionalTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-2 bg-white border border-[#E5E5E5] rounded-[6px] flex items-start justify-between gap-2 mb-2"
                    >
                      <p className="text-[12px] text-[#525252] flex-1">{task.title}</p>
                      <button
                        onClick={() => handleRemoveFromPlan(task.id, 'other')}
                        className="text-[#A3A3A3] hover:text-[#737373] transition-colors"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  ))}
                </DroppableZone>
              )}
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="p-3 bg-white border-2 border-[#DD3A44] rounded-[10px] shadow-lg opacity-90">
                  <p className="text-[13px] text-[#1A1A1A]">{activeTask.title}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E5E5]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[6px] border border-[#E5E5E5] text-[13px] font-medium text-[#525252] hover:bg-[#F5F5F5] transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setPrimaryTask(null)
                setSecondaryTasks([])
                setQuickWins([])
                setAdditionalTasks([])
              }}
              className="px-4 py-2 rounded-[6px] border border-[#E5E5E5] text-[13px] font-medium text-[#525252] hover:bg-[#F5F5F5] transition-colors"
            >
              Clear Plan
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[13px] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DroppableZone({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide mb-2 block">
        {label}
      </label>
      <div id={id} className="space-y-2">
        {children}
      </div>
    </div>
  )
}

function DraggableTask({ task, onRemove, color }: { task: Task; onRemove: () => void; color: 'red' | 'yellow' | 'blue' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const colorClasses = {
    red: 'bg-[#FEF2F2] border-[#FECACA]',
    yellow: 'bg-[#FFFBEB] border-[#FDE68A]',
    blue: 'bg-[#EFF6FF] border-[#BFDBFE]',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 ${colorClasses[color]} border rounded-[10px] flex items-start justify-between gap-2 cursor-move mb-2`}
    >
      <div className="flex items-start gap-2 flex-1" {...attributes} {...listeners}>
        <FaGripVertical className="text-[#A3A3A3] text-xs mt-1 flex-shrink-0" />
        <p className="text-[13px] text-[#1A1A1A] flex-1">{task.title}</p>
      </div>
      <button onClick={onRemove} className="text-[#A3A3A3] hover:text-[#737373] transition-colors">
        <FaTimes className="text-xs" />
      </button>
    </div>
  )
}

function EmptySlot({ text }: { text: string }) {
  return (
    <div className="p-3 border-2 border-dashed border-[#E5E5E5] rounded-[10px] text-center mb-2">
      <p className="text-[12px] text-[#A3A3A3]">{text}</p>
    </div>
  )
}

function SuggestionsTab({ suggestions, onAdd, isTaskInPlan }: {
  suggestions: Suggestion[]
  onAdd: (taskId: string, category: CategoryType) => void
  isTaskInPlan: (taskId: string) => boolean
}) {
  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <FaRobot className="text-[#A3A3A3] text-2xl mx-auto mb-3" />
        <p className="text-[13px] font-medium text-[#525252] mb-1">No AI suggestions yet</p>
        <p className="text-[12px] text-[#A3A3A3]">Try the All Tasks tab to pick manually</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion, index) => {
        const taskId = suggestion.metadata?.id || suggestion.id
        const inPlan = isTaskInPlan(taskId)

        return (
          <div key={taskId} className="p-4 bg-[#F5F5F5] rounded-[10px]">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-6 h-6 rounded-full bg-[#DD3A44] text-white flex items-center justify-center flex-shrink-0 text-[12px] font-medium">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#1A1A1A] mb-1">{suggestion.name}</p>
                {suggestion.reasons[0] && (
                  <p className="text-[12px] text-[#737373]">{suggestion.reasons[0]}</p>
                )}
                <span className="inline-block text-[10px] px-2 py-0.5 bg-white border border-[#E5E5E5] rounded-[4px] text-[#737373] uppercase tracking-wide mt-2">
                  {suggestion.type}
                </span>
              </div>
            </div>

            {inPlan ? (
              <div className="flex items-center gap-2 text-[12px] text-[#10B981] mt-3">
                <FaCheck />
                <span>Added to plan</span>
              </div>
            ) : (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => onAdd(taskId, 'main')}
                  className="text-[11px] px-3 py-1.5 bg-white hover:bg-[#E5E5E5] border border-[#E5E5E5] rounded-[6px] transition-colors"
                >
                  → Primary
                </button>
                <button
                  onClick={() => onAdd(taskId, 'secondary')}
                  className="text-[11px] px-3 py-1.5 bg-white hover:bg-[#E5E5E5] border border-[#E5E5E5] rounded-[6px] transition-colors"
                >
                  → Secondary
                </button>
                <button
                  onClick={() => onAdd(taskId, 'additional')}
                  className="text-[11px] px-3 py-1.5 bg-white hover:bg-[#E5E5E5] border border-[#E5E5E5] rounded-[6px] transition-colors"
                >
                  → Quick Win
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AllTasksTab({ tasks, onAdd, isTaskInPlan }: {
  tasks: Task[]
  onAdd: (taskId: string, category: CategoryType) => void
  isTaskInPlan: (taskId: string) => boolean
}) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <FaList className="text-[#A3A3A3] text-2xl mx-auto mb-3" />
        <p className="text-[13px] font-medium text-[#525252] mb-1">No tasks found</p>
        <p className="text-[12px] text-[#A3A3A3]">All tasks may be completed or archived</p>
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-[13px] border border-[#E5E5E5] rounded-[8px] bg-white focus:outline-none focus:border-[#DD3A44] transition-colors"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center py-6 text-[13px] text-[#A3A3A3]">No tasks match your search</p>
        ) : (
          filtered.map((task) => {
            const inPlan = isTaskInPlan(task.id)
            return (
              <div key={task.id} className="p-3 bg-white border border-[#E5E5E5] rounded-[10px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1A1A1A] mb-0.5">{task.title}</p>
                    {(task.project || task.company) && (
                      <p className="text-[11px] text-[#A3A3A3]">
                        {[task.company?.name, task.project?.name].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {inPlan ? (
                    <FaCheck className="text-[#10B981] text-xs mt-1 flex-shrink-0" />
                  ) : (
                    <button
                      onClick={() => onAdd(task.id, 'other')}
                      className="text-[#DD3A44] hover:text-[#C7333D] transition-colors flex-shrink-0"
                      title="Add to plan"
                    >
                      <FaPlus className="text-xs" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
