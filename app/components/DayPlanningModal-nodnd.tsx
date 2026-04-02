'use client'

import { useState, useEffect } from 'react'
import { FaTimes, FaRobot, FaList, FaClock, FaFolder, FaCheck, FaPlus } from 'react-icons/fa'

interface Task {
  id: string
  title: string
  priority?: number
  dueAt?: string
  project?: { name: string }
  space?: { name: string }
  status?: { name: string; type: string }
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

type TabType = 'suggestions' | 'all' | 'recent' | 'projects'

export default function DayPlanningModal({ onClose, onSave, workspaceId }: DayPlanningModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('suggestions')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Plan slots
  const [primaryTask, setPrimaryTask] = useState<Task | null>(null)
  const [secondaryTasks, setSecondaryTasks] = useState<Task[]>([])
  const [quickWins, setQuickWins] = useState<Task[]>([])
  const [additionalTasks, setAdditionalTasks] = useState<Task[]>([])

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load AI suggestions
      const suggestionsRes = await fetch(`/api/dashboard/suggestions?workspaceId=${workspaceId}`)
      const suggestionsData = await suggestionsRes.json()
      setSuggestions(suggestionsData.suggestions || [])

      // Load all tasks
      const tasksRes = await fetch(`/api/tasks/direct?workspaceId=${workspaceId}&limit=100&includeCompleted=false`)
      const tasksData = await tasksRes.json()
      setAllTasks(tasksData.tasks || [])

      // Load current plan
      const planRes = await fetch(`/api/dashboard/plan?workspaceId=${workspaceId}`)
      const planData = await planRes.json()
      const plannedTasks = planData.tasks || []

      // Populate existing plan
      setPrimaryTask(plannedTasks.find((t: any) => t.todayCategory === 'main') || null)
      setSecondaryTasks(plannedTasks.filter((t: any) => t.todayCategory === 'secondary'))
      setQuickWins(plannedTasks.filter((t: any) => t.todayCategory === 'additional'))
      setAdditionalTasks(plannedTasks.filter((t: any) => t.todayCategory === 'other'))
    } catch (error) {
      console.error('Failed to load planning data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToPlan = async (taskId: string, category: 'main' | 'secondary' | 'additional' | 'other') => {
    try {
      // Find task from suggestions or all tasks
      const suggestion = suggestions.find(s => s.metadata?.id === taskId)
      const task = allTasks.find(t => t.id === taskId)
      
      if (!suggestion && !task) return

      const taskToAdd = task || {
        id: suggestion!.metadata.id,
        title: suggestion!.name,
        priority: suggestion!.metadata.priority,
        dueAt: suggestion!.metadata.dueAt,
        project: suggestion!.metadata.project,
        space: suggestion!.metadata.space,
      }

      // Add to appropriate slot
      if (category === 'main' && !primaryTask) {
        setPrimaryTask(taskToAdd)
      } else if (category === 'secondary' && secondaryTasks.length < 2) {
        setSecondaryTasks([...secondaryTasks, taskToAdd])
      } else if (category === 'additional' && quickWins.length < 3) {
        setQuickWins([...quickWins, taskToAdd])
      } else if (category === 'other') {
        setAdditionalTasks([...additionalTasks, taskToAdd])
      }
    } catch (error) {
      console.error('Failed to add task to plan:', error)
    }
  }

  const handleRemoveFromPlan = (taskId: string, category: 'main' | 'secondary' | 'additional' | 'other') => {
    if (category === 'main') {
      setPrimaryTask(null)
    } else if (category === 'secondary') {
      setSecondaryTasks(secondaryTasks.filter(t => t.id !== taskId))
    } else if (category === 'additional') {
      setQuickWins(quickWins.filter(t => t.id !== taskId))
    } else if (category === 'other') {
      setAdditionalTasks(additionalTasks.filter(t => t.id !== taskId))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Clear existing plan first
      const existingPlanRes = await fetch(`/api/dashboard/plan?workspaceId=${workspaceId}`)
      const existingPlan = await existingPlanRes.json()
      
      for (const task of existingPlan.tasks || []) {
        await fetch(`/api/dashboard/plan?taskId=${task.id}`, { method: 'DELETE' })
      }

      // Add primary task
      if (primaryTask) {
        await fetch('/api/dashboard/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: primaryTask.id,
            category: 'main',
            workspaceId
          })
        })
      }

      // Add secondary tasks
      for (const task of secondaryTasks) {
        await fetch('/api/dashboard/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            category: 'secondary',
            workspaceId
          })
        })
      }

      // Add quick wins
      for (const task of quickWins) {
        await fetch('/api/dashboard/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            category: 'additional',
            workspaceId
          })
        })
      }

      // Add additional tasks
      for (const task of additionalTasks) {
        await fetch('/api/dashboard/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            category: 'other',
            workspaceId
          })
        })
      }

      onSave()
    } catch (error) {
      console.error('Failed to save plan:', error)
    } finally {
      setSaving(false)
    }
  }

  const isTaskInPlan = (taskId: string) => {
    return (
      primaryTask?.id === taskId ||
      secondaryTasks.some(t => t.id === taskId) ||
      quickWins.some(t => t.id === taskId) ||
      additionalTasks.some(t => t.id === taskId)
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <div>
            <h3 className="text-[20px] font-medium text-[#1A1A1A]">Plan Your Day</h3>
            <p className="text-[13px] text-[#A3A3A3] mt-0.5">
              Select tasks for today's structured plan
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-[#F5F5F5] flex items-center justify-center transition-colors"
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
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`flex-1 px-4 py-3 text-[13px] font-medium transition-colors ${
                  activeTab === 'suggestions'
                    ? 'text-[#DD3A44] border-b-2 border-[#DD3A44]'
                    : 'text-[#737373] hover:text-[#1A1A1A]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FaRobot />
                  AI Suggestions
                </div>
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 px-4 py-3 text-[13px] font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'text-[#DD3A44] border-b-2 border-[#DD3A44]'
                    : 'text-[#737373] hover:text-[#1A1A1A]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FaList />
                  All Tasks
                </div>
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`flex-1 px-4 py-3 text-[13px] font-medium transition-colors ${
                  activeTab === 'recent'
                    ? 'text-[#DD3A44] border-b-2 border-[#DD3A44]'
                    : 'text-[#737373] hover:text-[#1A1A1A]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FaClock />
                  Recent
                </div>
              </button>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-[13px] text-[#A3A3A3]">Loading...</p>
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
              ) : activeTab === 'recent' ? (
                <RecentTab 
                  tasks={allTasks.filter(t => t.dueAt)}
                  onAdd={handleAddToPlan}
                  isTaskInPlan={isTaskInPlan}
                />
              ) : null}
            </div>
          </div>

          {/* Right: Plan Preview */}
          <div className="w-96 bg-[#FAFAFA] p-6 overflow-y-auto">
            <h4 className="text-[15px] font-medium text-[#1A1A1A] mb-4">Your Plan</h4>

            {/* Primary Task */}
            <div className="mb-5">
              <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide mb-2 block">
                Primary (1)
              </label>
              {primaryTask ? (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded flex items-start justify-between gap-2">
                  <p className="text-[13px] text-[#1A1A1A] flex-1">{primaryTask.title}</p>
                  <button
                    onClick={() => handleRemoveFromPlan(primaryTask.id, 'main')}
                    className="text-[#EF4444] hover:text-[#DC2626] transition-colors"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                </div>
              ) : (
                <div className="p-3 border-2 border-dashed border-[#E5E5E5] rounded text-center">
                  <p className="text-[12px] text-[#A3A3A3]">No primary task selected</p>
                </div>
              )}
            </div>

            {/* Secondary Tasks */}
            <div className="mb-5">
              <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide mb-2 block">
                Secondary (2)
              </label>
              <div className="space-y-2">
                {secondaryTasks.map((task, index) => (
                  <div key={task.id} className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded flex items-start justify-between gap-2">
                    <p className="text-[13px] text-[#1A1A1A] flex-1">{task.title}</p>
                    <button
                      onClick={() => handleRemoveFromPlan(task.id, 'secondary')}
                      className="text-[#F59E0B] hover:text-[#D97706] transition-colors"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                ))}
                {secondaryTasks.length < 2 && (
                  <div className="p-3 border-2 border-dashed border-[#E5E5E5] rounded text-center">
                    <p className="text-[12px] text-[#A3A3A3]">Empty slot</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Wins */}
            <div className="mb-5">
              <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide mb-2 block">
                Quick Wins (3)
              </label>
              <div className="space-y-2">
                {quickWins.map((task, index) => (
                  <div key={task.id} className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded flex items-start justify-between gap-2">
                    <p className="text-[13px] text-[#1A1A1A] flex-1">{task.title}</p>
                    <button
                      onClick={() => handleRemoveFromPlan(task.id, 'additional')}
                      className="text-[#3B82F6] hover:text-[#2563EB] transition-colors"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                ))}
                {quickWins.length < 3 && (
                  <div className="p-3 border-2 border-dashed border-[#E5E5E5] rounded text-center">
                    <p className="text-[12px] text-[#A3A3A3]">Empty slot</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional */}
            {additionalTasks.length > 0 && (
              <div className="mb-5">
                <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide mb-2 block">
                  Additional ({additionalTasks.length})
                </label>
                <div className="space-y-2">
                  {additionalTasks.map((task) => (
                    <div key={task.id} className="p-2 bg-white border border-[#E5E5E5] rounded-md flex items-start justify-between gap-2">
                      <p className="text-[12px] text-[#525252] flex-1">{task.title}</p>
                      <button
                        onClick={() => handleRemoveFromPlan(task.id, 'other')}
                        className="text-[#A3A3A3] hover:text-[#737373] transition-colors"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E5E5]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-[#E5E5E5] text-[13px] font-medium text-[#525252] hover:bg-[#F5F5F5] transition-colors"
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
              className="px-4 py-2 rounded-md border border-[#E5E5E5] text-[13px] font-medium text-[#525252] hover:bg-[#F5F5F5] transition-colors"
            >
              Clear Plan
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded font-medium text-[13px] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// AI Suggestions Tab
function SuggestionsTab({ suggestions, onAdd, isTaskInPlan }: {
  suggestions: Suggestion[]
  onAdd: (taskId: string, category: 'main' | 'secondary' | 'additional' | 'other') => void
  isTaskInPlan: (taskId: string) => boolean
}) {
  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[13px] text-[#A3A3A3]">No AI suggestions available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion, index) => {
        const taskId = suggestion.metadata?.id || suggestion.id
        const inPlan = isTaskInPlan(taskId)
        
        return (
          <div key={taskId} className="p-4 bg-[#F5F5F5] rounded">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-6 h-6 rounded-full bg-[#DD3A44] text-white flex items-center justify-center flex-shrink-0 text-[12px] font-medium">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#1A1A1A] mb-1">{suggestion.name}</p>
                <p className="text-[12px] text-[#737373]">{suggestion.reasons[0]}</p>
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
                  className="text-[11px] px-3 py-1.5 bg-white hover:bg-[#E5E5E5] border border-[#E5E5E5] rounded-md transition-colors"
                >
                  → Primary
                </button>
                <button
                  onClick={() => onAdd(taskId, 'secondary')}
                  className="text-[11px] px-3 py-1.5 bg-white hover:bg-[#E5E5E5] border border-[#E5E5E5] rounded-md transition-colors"
                >
                  → Secondary
                </button>
                <button
                  onClick={() => onAdd(taskId, 'additional')}
                  className="text-[11px] px-3 py-1.5 bg-white hover:bg-[#E5E5E5] border border-[#E5E5E5] rounded-md transition-colors"
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

// All Tasks Tab
function AllTasksTab({ tasks, onAdd, isTaskInPlan }: {
  tasks: Task[]
  onAdd: (taskId: string, category: 'main' | 'secondary' | 'additional' | 'other') => void
  isTaskInPlan: (taskId: string) => boolean
}) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[13px] text-[#A3A3A3]">No tasks available</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const inPlan = isTaskInPlan(task.id)
        
        return (
          <div key={task.id} className="p-3 bg-white border border-[#E5E5E5] rounded">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1A1A1A] mb-1">{task.title}</p>
                {(task.project || task.space) && (
                  <p className="text-[11px] text-[#A3A3A3]">
                    {task.space?.name && <span>{task.space.name}</span>}
                    {task.space?.name && task.project?.name && <span> · </span>}
                    {task.project?.name && <span>{task.project.name}</span>}
                  </p>
                )}
              </div>
              
              {inPlan ? (
                <div className="text-[11px] text-[#10B981] flex items-center gap-1">
                  <FaCheck className="text-xs" />
                </div>
              ) : (
                <button
                  onClick={() => onAdd(task.id, 'other')}
                  className="text-[#DD3A44] hover:text-[#C7333D] transition-colors"
                >
                  <FaPlus className="text-xs" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Recent Tab (simplified - same as All Tasks for now)
function RecentTab({ tasks, onAdd, isTaskInPlan }: {
  tasks: Task[]
  onAdd: (taskId: string, category: 'main' | 'secondary' | 'additional' | 'other') => void
  isTaskInPlan: (taskId: string) => boolean
}) {
  return <AllTasksTab tasks={tasks.slice(0, 20)} onAdd={onAdd} isTaskInPlan={isTaskInPlan} />
}
