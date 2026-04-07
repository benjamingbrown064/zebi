'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FaCalendarDay,
  FaFlag,
  FaClipboardList,
  FaCheck,
  FaRobot,
  FaTimes,
  FaBuilding,
  FaChartLine,
  FaMicrophone
} from 'react-icons/fa'
import DayPlanningModal from '@/app/components/DayPlanningModal'
import { useWorkspace } from '@/lib/use-workspace'
import ManagersNote from '@/components/ManagersNote'
import OperatingModeCard from '@/components/OperatingModeCard'

interface Task {
  id: string
  title: string
  completedAt: string | null
}

interface Project {
  id: string
  name: string
  progressPercent: number
  tasksCompleted: number
  tasksTotal: number
}

interface Objective {
  id: string
  title: string
  spaceName?: string
  currentValue: number
  targetValue: number
  unit: string
  nextMilestone: {
    title: string
    daysUntil: number
  } | null
}

interface BotActivity {
  id: string
  title: string
  createdAt: string
  aiAgent?: string | null
}

export default function DashboardClient({
  keyTask,
  subTasks,
  hopeToComplete,
  additionalTasks,
  completedToday,
  projects,
  objectives,
  botActivity,
}: {
  keyTask?: Task
  subTasks: Task[]
  hopeToComplete: Task[]
  additionalTasks: Task[]
  completedToday: { id: string; title: string; completedAt?: string }[]
  projects: Project[]
  objectives: Objective[]
  botActivity: BotActivity[]
}) {
  const router = useRouter()
  const { workspaceId } = useWorkspace()
  const [isMobile, setIsMobile] = useState(false)
  const [showCompletedModal, setShowCompletedModal] = useState(false)
  const [showBotActivityModal, setShowBotActivityModal] = useState(false)
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false)
  const [showPlanningModal, setShowPlanningModal] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionsMode, setSuggestionsMode] = useState<string>('momentum')
  const [suggestionsFocus, setSuggestionsFocus] = useState<string | null>(null)
  const [suggestionsIgnore, setSuggestionsIgnore] = useState<string | null>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })


  // Load AI suggestions
  useEffect(() => {
    loadAiSuggestions()
  }, [])

  const loadAiSuggestions = async () => {
    if (!workspaceId) return
    
    setLoadingSuggestions(true)
    try {
      const res = await fetch(`/api/dashboard/suggestions?workspaceId=${workspaceId}`)
      const data = await res.json()
      setAiSuggestions(data.suggestions || [])
      if (data.mode) setSuggestionsMode(data.mode)
      if (data.focusMessage) setSuggestionsFocus(data.focusMessage)
      if (data.ignoreMessage) setSuggestionsIgnore(data.ignoreMessage)
    } catch (error) {
      console.error('Failed to load AI suggestions:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const aiSuggestionsCount = aiSuggestions.length

  const handlePlanSaved = () => {
    setShowPlanningModal(false)
    router.refresh() // Reload page data
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      
        {/* Header */}
        <header className="bg-white sticky top-0 z-10">
          <div className="max-w-[1280px] mx-auto px-4 md:px-12 py-4 md:py-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-0 md:justify-between">
              <div>
                <h1 className="text-[20px] md:text-[30px] leading-[28px] md:leading-[36px] font-medium text-[#1A1A1A]">{today}</h1>
                <p className="text-[12px] md:text-[13px] text-[#A3A3A3] mt-1">Your command centre for today</p>
              </div>
              
              {/* Header Actions */}
              <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowCompletedModal(true)}
                  className="flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md text-[12px] md:text-[13px] font-medium text-[#474747] hover:bg-[#F3F3F3] transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <FaCheck className="text-[#10B981]" />
                  <span className="hidden sm:inline">Recently Completed</span>
                  <span className="sm:hidden">Completed</span>
                </button>
                
                <button
                  onClick={() => setShowBotActivityModal(true)}
                  className="flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md text-[12px] md:text-[13px] font-medium text-[#474747] hover:bg-[#F3F3F3] transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <FaRobot className="text-[#DD3A44]" />
                  <span className="hidden sm:inline">Bot Activity</span>
                  <span className="sm:hidden">Activity</span>
                </button>
                
                <button
                  onClick={() => router.push('/brain-dump')}
                  className="flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md bg-[#000000] hover:bg-[#1A1C1C] text-white text-[12px] md:text-[13px] font-medium transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <FaMicrophone />
                  <span className="hidden sm:inline">Brain Dump</span>
                  <span className="sm:hidden">Dump</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {isMobile ? (
          /* Mobile: Vertical Stack */
          <div className="px-4 py-6 space-y-6">
            <ManagersNote />
            <OperatingModeCard />
            <TodaysPlanCard
              keyTask={keyTask}
              subTasks={subTasks}
              hopeToComplete={hopeToComplete}
              additionalTasks={additionalTasks}
              aiSuggestionsCount={aiSuggestionsCount}
              onTaskClick={(id) => router.push(`/tasks/${id}`)}
              onPlanDay={() => setShowPlanningModal(true)}
              onShowSuggestions={() => setShowSuggestionsModal(true)}
            />
            
            <ObjectivesCard 
              objectives={objectives}
              onObjectiveClick={(id) => router.push(`/objectives/${id}`)}
              onViewAll={() => router.push('/objectives')}
            />
            
            <ProjectsCard
              projects={projects}
              onProjectClick={(id) => router.push(`/projects/${id}`)}
              onViewAll={() => router.push('/projects')}
            />
          </div>
        ) : (
          /* Desktop: Two-Column Layout (60/40 split) */
          <div className="max-w-[1280px] mx-auto px-12 py-12">
            {/* Full-width top row: Manager's Note + Mode */}
            <div className="mb-6">
              <ManagersNote />
              <OperatingModeCard />
            </div>
            
            <div className="grid grid-cols-[1.5fr_1fr] gap-6">
              {/* Left Column - Today's Plan (wider) */}
              <div>
                <TodaysPlanCard
                  keyTask={keyTask}
                  subTasks={subTasks}
                  hopeToComplete={hopeToComplete}
                  additionalTasks={additionalTasks}
                  aiSuggestionsCount={aiSuggestionsCount}
                  onTaskClick={(id) => router.push(`/tasks/${id}`)}
                  onPlanDay={() => setShowPlanningModal(true)}
                  onShowSuggestions={() => setShowSuggestionsModal(true)}
                />
              </div>

              {/* Right Column - Objectives & Projects (narrower) */}
              <div className="space-y-6">
                <ObjectivesCard 
                  objectives={objectives}
                  onObjectiveClick={(id) => router.push(`/objectives/${id}`)}
                  onViewAll={() => router.push('/objectives')}
                />
                
                <ProjectsCard
                  projects={projects}
                  onProjectClick={(id) => router.push(`/projects/${id}`)}
                  onViewAll={() => router.push('/projects')}
                />
              </div>
            </div>
          </div>
        )}

      {/* Modals */}
      {showCompletedModal && (
        <Modal onClose={() => setShowCompletedModal(false)} title="Recently Completed">
          <CompletedModalContent completed={completedToday} />
        </Modal>
      )}

      {showBotActivityModal && (
        <Modal onClose={() => setShowBotActivityModal(false)} title="Bot Activity">
          <BotActivityModalContent activity={botActivity} />
        </Modal>
      )}

      {showSuggestionsModal && (
        <Modal onClose={() => setShowSuggestionsModal(false)} title="AI Suggested Work">
          <SuggestionsModalContent 
            suggestions={aiSuggestions}
            workspaceId={workspaceId!}
            onRefresh={handlePlanSaved}
            mode={suggestionsMode}
            focusMessage={suggestionsFocus}
            ignoreMessage={suggestionsIgnore}
          />
        </Modal>
      )}

      {showPlanningModal && (
        <DayPlanningModal
          onClose={() => setShowPlanningModal(false)}
          onSave={handlePlanSaved}
          workspaceId={workspaceId!}
        />
      )}
    </div>
  )
}

// Today's Plan Card
function TodaysPlanCard({
  keyTask,
  subTasks,
  hopeToComplete,
  additionalTasks,
  aiSuggestionsCount,
  onTaskClick,
  onPlanDay,
  onShowSuggestions,
}: {
  keyTask?: Task
  subTasks: Task[]
  hopeToComplete: Task[]
  additionalTasks: Task[]
  aiSuggestionsCount: number
  onTaskClick: (id: string) => void
  onPlanDay: () => void
  onShowSuggestions: () => void
}) {
  const isEmpty = !keyTask && subTasks.length === 0 && hopeToComplete.length === 0 && additionalTasks.length === 0

  return (
    <div className="bg-white rounded p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[24px] leading-[32px] font-medium text-[#1A1A1A]">Today's Plan</h2>
          <p className="text-[13px] text-[#A3A3A3] mt-1">Your priority work for today</p>
        </div>
        
        {!isEmpty && (
          <button
            onClick={onPlanDay}
            className="px-4 py-2 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium text-[13px] transition-colors"
          >
            Edit Plan
          </button>
        )}
      </div>

      {/* AI Suggestions Summary */}
      {aiSuggestionsCount > 0 && (
        <button
          onClick={onShowSuggestions}
          className="w-full mb-6 p-4 bg-[#F3F3F3] hover:bg-[#E5E5E5]  rounded transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center">
                <FaRobot className="text-[#DD3A44] text-sm" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#1A1A1A]">AI suggested {aiSuggestionsCount} items</p>
                <p className="text-[12px] text-[#737373]">Click to review and add to your plan</p>
              </div>
            </div>
            <div className="text-[#DD3A44] text-sm">→</div>
          </div>
        </button>
      )}

      {isEmpty ? (
        /* Empty State */
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-[#F3F3F3] flex items-center justify-center mx-auto mb-4">
            <FaCalendarDay className="text-[#A3A3A3] text-2xl" />
          </div>
          <p className="text-[15px] text-[#474747] mb-6">Plan your day to get started</p>
          <button
            onClick={onPlanDay}
            className="px-5 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium text-[15px] transition-colors"
          >
            Select Tasks
          </button>
        </div>
      ) : (
        /* Structured Plan */
        <div className="space-y-6">
          {/* Primary Task */}
          {keyTask && (
            <div>
              <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide mb-2 block">
                Primary
              </label>
              <div
                onClick={() => onTaskClick(keyTask.id)}
                className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded cursor-pointer hover:bg-[#FEE2E2] transition-colors"
              >
                <p className="text-[15px] font-medium text-[#1A1A1A]">{keyTask.title}</p>
              </div>
            </div>
          )}

          {/* Secondary Tasks (2 slots) */}
          {subTasks.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide mb-2 block">
                Secondary
              </label>
              <div className="space-y-2">
                {subTasks.slice(0, 2).map(task => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task.id)}
                    className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded cursor-pointer hover:bg-[#FEF3C7] transition-colors"
                  >
                    <p className="text-[14px] text-[#1A1A1A]">{task.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Wins (3 slots) */}
          {hopeToComplete.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide mb-2 block">
                Quick Wins
              </label>
              <div className="space-y-2">
                {hopeToComplete.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task.id)}
                    className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded cursor-pointer hover:bg-[#DBEAFE] transition-colors"
                  >
                    <p className="text-[13px] text-[#1A1A1A]">{task.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Tasks (collapsible, lower emphasis) */}
          {additionalTasks.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wide mb-2 flex items-center gap-2 hover:text-[#474747] transition-colors">
                <span className="transform group-open:rotate-90 transition-transform">▶</span>
                Additional ({additionalTasks.length})
              </summary>
              <div className="space-y-2 mt-2">
                {additionalTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task.id)}
                    className="p-2.5 bg-white  rounded-md cursor-pointer hover:bg-[#F3F3F3] transition-colors"
                  >
                    <p className="text-[13px] text-[#474747]">{task.title}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

// Objectives Card
function ObjectivesCard({
  objectives,
  onObjectiveClick,
  onViewAll,
}: {
  objectives: Objective[]
  onObjectiveClick: (id: string) => void
  onViewAll: () => void
}) {
  const displayObjectives = objectives.slice(0, 3)

  return (
    <div className="bg-white rounded p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[18px] leading-[28px] font-medium text-[#1A1A1A]">Objectives</h3>
        {objectives.length > 3 && (
          <button
            onClick={onViewAll}
            className="text-[13px] font-medium text-[#DD3A44] hover:text-[#C7333D] transition-colors"
          >
            View all →
          </button>
        )}
      </div>

      {/* Objectives List */}
      {displayObjectives.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13px] text-[#A3A3A3]">No active objectives</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayObjectives.map(obj => (
            <div
              key={obj.id}
              onClick={() => onObjectiveClick(obj.id)}
              className="p-4  rounded cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow"
            >
              {/* Space */}
              {obj.spaceName && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-[4px] bg-[#F3F3F3] flex items-center justify-center flex-shrink-0">
                    <FaBuilding className="text-[#737373] text-[10px]" />
                  </div>
                  <span className="text-[12px] font-medium text-[#737373]">{obj.spaceName}</span>
                </div>
              )}

              {/* Title */}
              <h4 className="text-[15px] font-medium text-[#1A1A1A] mb-2">{obj.title}</h4>

              {/* Progress */}
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[13px] text-[#474747]">
                  {obj.currentValue} / {obj.targetValue} {obj.unit}
                </span>
              </div>

              {/* Next Milestone */}
              {obj.nextMilestone && (
                <p className="text-[12px] text-[#DD3A44] mt-2">
                  {obj.nextMilestone.title} · {obj.nextMilestone.daysUntil} days
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Projects Card
function ProjectsCard({
  projects,
  onProjectClick,
  onViewAll,
}: {
  projects: Project[]
  onProjectClick: (id: string) => void
  onViewAll: () => void
}) {
  const displayProjects = projects.slice(0, 3)

  return (
    <div className="bg-white rounded p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[18px] leading-[28px] font-medium text-[#1A1A1A]">Projects</h3>
        {projects.length > 3 && (
          <button
            onClick={onViewAll}
            className="text-[13px] font-medium text-[#DD3A44] hover:text-[#C7333D] transition-colors"
          >
            View all →
          </button>
        )}
      </div>

      {/* Projects List */}
      {displayProjects.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13px] text-[#A3A3A3]">No active projects</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayProjects.map(project => (
            <div
              key={project.id}
              onClick={() => onProjectClick(project.id)}
              className="p-4  rounded cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow"
            >
              {/* Title & Progress */}
              <div className="flex items-baseline justify-between mb-2">
                <h4 className="text-[15px] font-medium text-[#1A1A1A] truncate flex-1">
                  {project.name}
                </h4>
                <span className="text-[13px] text-[#474747] ml-3">{project.progressPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#F3F3F3] rounded-full h-1.5 mb-2">
                <div
                  className="bg-[#10B981] h-1.5 rounded-full transition-all"
                  style={{ width: `${project.progressPercent}%` }}
                />
              </div>

              {/* Task Count */}
              <p className="text-[12px] text-[#A3A3A3]">
                {project.tasksCompleted} / {project.tasksTotal} tasks
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Modal Component
function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-[18px] font-medium text-[#1A1A1A]">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-[#F3F3F3] flex items-center justify-center transition-colors"
          >
            <FaTimes className="text-[#A3A3A3]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-64px)]">
          {children}
        </div>
      </div>
    </div>
  )
}

// Completed Modal Content
function CompletedModalContent({ completed }: { completed: { id: string; title: string; completedAt?: string }[] }) {
  if (completed.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[15px] text-[#A3A3A3]">No tasks completed today</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {completed.map(task => (
        <div key={task.id} className="p-4 bg-[#F3F3F3] rounded">
          <div className="flex items-start gap-3">
            <FaCheck className="text-[#10B981] text-sm mt-1 flex-shrink-0" />
            <p className="text-[14px] text-[#1A1A1A]">{task.title}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Bot Activity Modal Content
function BotActivityModalContent({ activity }: { activity: BotActivity[] }) {
  if (activity.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[15px] text-[#A3A3A3]">No bot activity today</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activity.map(item => (
        <div key={item.id} className="p-4 bg-[#F3F3F3] border border-[#C6C6C6] rounded">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center flex-shrink-0">
              <FaRobot className="text-[#10B981] text-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#1A1A1A] mb-1">Created task</p>
              <p className="text-[13px] text-[#474747]">{item.title}</p>
              {item.aiAgent && (
                <p className="text-[12px] text-[#059669] mt-2">by {item.aiAgent}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// AI Suggestions Modal Content (connected to real prioritization engine)
function SuggestionsModalContent({ suggestions, workspaceId, onRefresh, mode, focusMessage, ignoreMessage }: {
  suggestions: any[]
  workspaceId: string
  onRefresh: () => void
  mode?: string
  focusMessage?: string | null
  ignoreMessage?: string | null
}) {
  const [adding, setAdding] = useState<string | null>(null)

  const handleAddToPlan = async (suggestion: any, category: 'main' | 'secondary' | 'additional') => {
    const taskId = suggestion.metadata?.id || suggestion.id
    setAdding(taskId)
    
    try {
      await fetch('/api/dashboard/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          category,
          workspaceId
        })
      })
      
      // Refresh dashboard
      onRefresh()
    } catch (error) {
      console.error('Failed to add to plan:', error)
    } finally {
      setAdding(null)
    }
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[15px] text-[#A3A3A3]">No AI suggestions available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-[#474747] mb-6">
        Based on your workspace, here's what to focus on today:
      </p>

      {mode && focusMessage && (
        <div className="rounded p-3 mb-4 text-[12px]" style={{ 
          backgroundColor: mode === 'pressure' ? '#FEF2F2' : mode === 'plateau' ? '#FFFBEB' : mode === 'drift' ? '#F5F3FF' : '#ECFDF5',
          border: `1px solid ${mode === 'pressure' ? '#FECACA' : mode === 'plateau' ? '#FDE68A' : mode === 'drift' ? '#DDD6FE' : '#A7F3D0'}`,
          color: mode === 'pressure' ? '#DC2626' : mode === 'plateau' ? '#D97706' : mode === 'drift' ? '#7C3AED' : '#059669',
        }}>
          <span className="font-semibold">{mode.charAt(0).toUpperCase() + mode.slice(1)} mode · </span>
          {focusMessage}
          {ignoreMessage && <p className="mt-1 opacity-70">{ignoreMessage}</p>}
        </div>
      )}

      {suggestions.slice(0, 6).map((suggestion, index) => {
        const taskId = suggestion.metadata?.id || suggestion.id
        const isAdding = adding === taskId
        
        return (
          <div key={taskId} className="p-4 bg-[#F3F3F3] rounded">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[12px] font-medium text-[#DD3A44]">{index + 1}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-[14px] font-medium text-[#1A1A1A]">{suggestion.name}</p>
                  <span className="text-[11px] px-2 py-0.5 rounded-[4px] bg-white text-[#737373] uppercase tracking-wide flex-shrink-0">
                    {suggestion.type}
                  </span>
                </div>
                <p className="text-[13px] text-[#737373]">{suggestion.reasons[0]}</p>
                
                {isAdding ? (
                  <div className="text-[12px] text-[#10B981] mt-3 flex items-center gap-2">
                    <FaCheck />
                    <span>Adding...</span>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => handleAddToPlan(suggestion, 'main')}
                      className="text-[12px] px-3 py-1.5 bg-white hover:bg-[#E5E5E5]  rounded-md transition-colors"
                    >
                      Add to Primary
                    </button>
                    <button 
                      onClick={() => handleAddToPlan(suggestion, 'secondary')}
                      className="text-[12px] px-3 py-1.5 bg-white hover:bg-[#E5E5E5]  rounded-md transition-colors"
                    >
                      Add to Secondary
                    </button>
                    <button 
                      onClick={() => handleAddToPlan(suggestion, 'additional')}
                      className="text-[12px] px-3 py-1.5 bg-white hover:bg-[#E5E5E5]  rounded-md transition-colors"
                    >
                      Add to Quick Win
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
