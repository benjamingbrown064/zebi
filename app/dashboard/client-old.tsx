'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FaCheck, FaCalendarDay, FaChartLine, FaRobot } from 'react-icons/fa'
import Sidebar from '@/components/Sidebar'
import DashboardRecommendations from '@/app/components/DashboardRecommendations'
import AIActivityFeed from '@/app/components/AIActivityFeed'

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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

  const totalPlanned = (keyTask ? 1 : 0) + subTasks.length + hopeToComplete.length + additionalTasks.length
  const completedCount = completedToday.length

  const mainPaddingClass = isMobile ? 'pt-[64px]' : sidebarCollapsed ? 'ml-16' : 'ml-64'

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar 
        workspaceName="Zebi"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      
      <div className={mainPaddingClass}>
        {/* Header */}
        <header className="bg-white border-b border-[#E5E5E5]">
          <div className="max-w-[1280px] mx-auto px-12 py-8">
            <div className="flex items-baseline justify-between">
              <div>
                <h1 className="text-[30px] leading-[36px] font-medium text-[#1A1A1A]">{today}</h1>
                <p className="text-[13px] text-[#A3A3A3] mt-1">
                  {completedCount} / {totalPlanned} tasks complete
                </p>
              </div>
              <button
                onClick={() => router.push('/tasks')}
                className="px-5 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[15px] transition-colors"
              >
                Plan Day
              </button>
            </div>
          </div>
        </header>

        {isMobile ? (
          /* Mobile: Vertical Stack */
          <div className="px-4 py-6 space-y-8">
            <DashboardRecommendations />
            <AIActivityFeed workspaceId={DEFAULT_WORKSPACE_ID} limit={10} />
            
            <Section title="Today Plan" icon={<FaCalendarDay />}>
              <DailyPlan
                keyTask={keyTask}
                subTasks={subTasks}
                hopeToComplete={hopeToComplete}
                additionalTasks={additionalTasks}
                onTaskClick={(id) => router.push(`/tasks/${id}`)}
              />
            </Section>

            <Section title="Projects" icon={<FaChartLine />}>
              <ProjectsList projects={projects} onProjectClick={(id) => router.push(`/projects/${id}`)} />
            </Section>

            <Section title="Objectives" icon={<FaChartLine />}>
              <ObjectivesList objectives={objectives} onObjectiveClick={(id) => router.push(`/objectives/${id}`)} />
            </Section>

            <Section title="Bot Activity" icon={<FaRobot />}>
              <BotActivityList activity={botActivity} />
            </Section>

            <Section title="Recently Completed" icon={<FaCheck />}>
              <CompletedList completed={completedToday} />
            </Section>
          </div>
        ) : (
          /* Desktop: Clean Layout */
          <div className="max-w-[1280px] mx-auto px-12 py-12">
            {/* AI Recommendations */}
            <div className="mb-8">
              <DashboardRecommendations />
            </div>
            
            {/* AI Activity Feed */}
            <div className="mb-8">
              <AIActivityFeed workspaceId={DEFAULT_WORKSPACE_ID} limit={10} />
            </div>
            
            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-8">
                <Section title="Today Plan" icon={<FaCalendarDay />}>
                  <DailyPlan
                    keyTask={keyTask}
                    subTasks={subTasks}
                    hopeToComplete={hopeToComplete}
                    additionalTasks={additionalTasks}
                    onTaskClick={(id) => router.push(`/tasks/${id}`)}
                  />
                </Section>

                <Section title="Projects" icon={<FaChartLine />}>
                  <ProjectsList projects={projects} onProjectClick={(id) => router.push(`/projects/${id}`)} />
                </Section>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                <Section title="Objectives" icon={<FaChartLine />}>
                  <ObjectivesList objectives={objectives} onObjectiveClick={(id) => router.push(`/objectives/${id}`)} />
                </Section>

                <Section title="Bot Activity" icon={<FaRobot />}>
                  <BotActivityList activity={botActivity} />
                </Section>

                <Section title="Recently Completed" icon={<FaCheck />}>
                  <CompletedList completed={completedToday} />
                </Section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Section component
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[#A3A3A3]">{icon}</div>
        <h2 className="text-[20px] leading-[28px] font-medium text-[#1A1A1A]">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  )
}

// Daily Plan Component
function DailyPlan({ keyTask, subTasks, hopeToComplete, additionalTasks, onTaskClick }: {
  keyTask?: Task
  subTasks: Task[]
  hopeToComplete: Task[]
  additionalTasks: Task[]
  onTaskClick: (id: string) => void
}) {
  if (!keyTask && subTasks.length === 0 && hopeToComplete.length === 0 && additionalTasks.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-[14px] border border-[#E5E5E5]">
        <p className="text-[15px] text-[#A3A3A3] mb-6">Plan your day to get started</p>
        <button
          onClick={() => onTaskClick('plan')}
          className="px-5 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[15px] transition-colors"
        >
          Select Tasks
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Task */}
      {keyTask && (
        <div>
          <p className="text-[12px] font-medium text-[#A3A3A3] uppercase mb-2">Must Complete</p>
          <div
            onClick={() => onTaskClick(keyTask.id)}
            className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] cursor-pointer hover:bg-[#FEE2E2] transition-colors"
          >
            <p className="text-[15px] font-medium text-[#1A1A1A]">{keyTask.title}</p>
          </div>
        </div>
      )}

      {/* Sub Tasks */}
      {subTasks.length > 0 && (
        <div>
          <p className="text-[12px] font-medium text-[#A3A3A3] uppercase mb-2">Need to Complete</p>
          <div className="space-y-2">
            {subTasks.map(task => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] cursor-pointer hover:bg-[#FEF3C7] transition-colors"
              >
                <p className="text-[13px] text-[#1A1A1A]">{task.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hope To Complete */}
      {hopeToComplete.length > 0 && (
        <div>
          <p className="text-[12px] font-medium text-[#A3A3A3] uppercase mb-2">Nice to Complete</p>
          <div className="space-y-2">
            {hopeToComplete.map(task => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px] cursor-pointer hover:bg-[#DBEAFE] transition-colors"
              >
                <p className="text-[13px] text-[#1A1A1A]">{task.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional */}
      {additionalTasks.length > 0 && (
        <div>
          <p className="text-[12px] font-medium text-[#A3A3A3] uppercase mb-2">Additional</p>
          <div className="space-y-2">
            {additionalTasks.map(task => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className="p-2 bg-white border border-[#E5E5E5] rounded-[10px] cursor-pointer hover:bg-[#F5F5F5] transition-colors"
              >
                <p className="text-[13px] text-[#525252]">{task.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Projects List
function ProjectsList({ projects, onProjectClick }: { projects: Project[]; onProjectClick: (id: string) => void }) {
  if (projects.length === 0) {
    return <div className="text-[13px] text-[#A3A3A3]">No active projects</div>
  }

  return (
    <div className="space-y-3">
      {projects.slice(0, 5).map(project => (
        <div
          key={project.id}
          onClick={() => onProjectClick(project.id)}
          className="p-4 bg-white rounded-[14px] border border-[#E5E5E5] cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow"
        >
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[15px] font-medium text-[#1A1A1A] truncate">{project.name}</p>
            <p className="text-[13px] text-[#525252] ml-2">{project.progressPercent}%</p>
          </div>
          <div className="w-full bg-[#F5F5F5] rounded-full h-1.5 mb-2">
            <div
              className="bg-[#10B981] h-1.5 rounded-full transition-all"
              style={{ width: `${project.progressPercent}%` }}
            />
          </div>
          <p className="text-[12px] text-[#A3A3A3]">
            {project.tasksCompleted} / {project.tasksTotal} tasks
          </p>
        </div>
      ))}
    </div>
  )
}

// Objectives List
function ObjectivesList({ objectives, onObjectiveClick }: { objectives: Objective[]; onObjectiveClick: (id: string) => void }) {
  if (objectives.length === 0) {
    return <div className="text-[13px] text-[#A3A3A3]">No active objectives</div>
  }

  return (
    <div className="space-y-3">
      {objectives.slice(0, 3).map(obj => (
        <div
          key={obj.id}
          onClick={() => onObjectiveClick(obj.id)}
          className="p-4 bg-white rounded-[14px] border border-[#E5E5E5] cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow"
        >
          <p className="text-[15px] font-medium text-[#1A1A1A] mb-1">{obj.title}</p>
          {obj.spaceName && (
            <p className="text-[12px] text-[#A3A3A3] mb-2">{obj.spaceName}</p>
          )}
          <p className="text-[13px] text-[#525252]">
            {obj.currentValue} / {obj.targetValue} {obj.unit}
          </p>
          {obj.nextMilestone && (
            <p className="text-[12px] text-[#DD3A44] mt-2">
              {obj.nextMilestone.title} • {obj.nextMilestone.daysUntil} days
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// Bot Activity List
function BotActivityList({ activity }: { activity: BotActivity[] }) {
  if (activity.length === 0) {
    return <div className="text-[13px] text-[#A3A3A3]">No bot activity today</div>
  }

  return (
    <div className="space-y-2">
      {activity.map(item => (
        <div key={item.id} className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[10px]">
          <p className="text-[13px] text-[#1A1A1A]">Created task</p>
          <p className="text-[12px] text-[#525252] mt-1 truncate">{item.title}</p>
          {item.aiAgent && (
            <p className="text-[12px] text-[#059669] mt-1">by {item.aiAgent}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// Completed List
function CompletedList({ completed }: { completed: { id: string; title: string; completedAt?: string }[] }) {
  if (completed.length === 0) {
    return <div className="text-[13px] text-[#A3A3A3]">No tasks completed today</div>
  }

  return (
    <div className="space-y-2">
      {completed.map(task => (
        <div key={task.id} className="p-3 bg-white border border-[#E5E5E5] rounded-[10px]">
          <div className="flex items-start gap-2">
            <FaCheck className="text-[#10B981] text-xs mt-0.5 flex-shrink-0" />
            <p className="text-[13px] text-[#525252]">{task.title}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
