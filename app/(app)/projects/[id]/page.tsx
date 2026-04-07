'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  FaArrowLeft,
  FaEdit,
  FaProjectDiagram,
  FaTasks,
  FaBuilding,
  FaBullseye,
  FaPlus,
  FaMicrophone,
} from 'react-icons/fa'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import QuickAddModal from '@/components/QuickAddModal'
import { useWorkspace } from '@/lib/use-workspace'
import { cachedFetch } from '@/lib/client-cache'
import { VoiceToTaskModal } from '@/components/voice-to-task-simple/VoiceToTaskModal'

interface Project {
  id: string
  name: string
  description: string | null
  companyId: string | null
  objectiveId: string | null
  priority: number | null
  company: {
    id: string
    name: string
  } | null
  objective: {
    id: string
    title: string
    status: string
    progressPercent: number
  } | null
  tasks: Array<{
    id: string
    title: string
    statusId: string
    priority: number
    completedAt: string | null
    dueAt: string | null
    status: {
      name: string
      type: string
    }
  }>
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { workspaceId } = useWorkspace()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [isVoiceToTaskOpen, setIsVoiceToTaskOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadProject()
  }, [projectId])

  async function loadProject() {
    try {
      const response = await cachedFetch<any>(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      } else if (response.status === 404) {
        router.push('/board')
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTask() {
    // Reload project to show new task
    await loadProject()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <div className="text-[#474747]">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return null
  }

  const completedTasks = project.tasks.filter((t) => t.completedAt).length
  const totalTasks = project.tasks.length
  const completionPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const priorityColors: Record<number, string> = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-[#F3F3F3] text-[#474747]',
  }

  const mainPaddingClass = ''

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <div className={mainPaddingClass}>
        {/* Header */}
        <header className="bg-white sticky top-0 z-10">
          <div className="px-4 md:px-8 py-4 md:py-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs md:text-sm text-[#A3A3A3] mb-3 md:mb-4 overflow-x-auto scrollbar-hide">
              {project.company && (
                <>
                  <Link
                    href="/spaces"
                    className="hover:text-accent-600 transition"
                  >
                    Spaces
                  </Link>
                  <span>/</span>
                  <Link
                    href={`/spaces/${project.company.id}`}
                    className="hover:text-accent-600 transition"
                  >
                    {project.company.name}
                  </Link>
                  <span>/</span>
                </>
              )}
              <Link href="/board" className="hover:text-accent-600 transition">
                Projects
              </Link>
              <span>/</span>
              <span className="text-[#1A1C1C]">{project.name}</span>
            </div>

            {/* Project Header */}
            <div className="flex flex-col md:flex-row items-start gap-4 md:justify-between">
              <div className="flex items-start gap-3 md:gap-4 flex-1">
                {/* Icon */}
                <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FEF2F2] rounded flex items-center justify-center flex-shrink-0">
                  <FaProjectDiagram className="text-[#1A1C1C] text-xl md:text-2xl" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg md:text-2xl font-semibold text-[#1A1A1A]">
                    {project.name}
                  </h1>

                  {/* Metadata */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {/* Space Badge */}
                    {project.company && (
                      <Link
                        href={`/spaces/${project.company.id}`}
                        className="flex items-center gap-1 px-3 py-1 bg-[#F3F3F3] text-[#474747] rounded hover:bg-[#E5E5E5] transition text-sm"
                      >
                        <FaBuilding />
                        {project.company.name}
                      </Link>
                    )}

                    {/* Objective Badge */}
                    {project.objective && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-accent-100 text-accent-700 rounded text-sm">
                        <FaBullseye />
                        <span>🎯 {project.objective.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            project.objective.status === 'active'
                              ? 'bg-[#F3F3F3] text-[#474747]'
                              : project.objective.status === 'blocked'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-[#F3F3F3] text-[#474747]'
                          }`}
                        >
                          {project.objective.status}
                        </span>
                        <span className="text-xs">
                          ({Math.round(Number(project.objective.progressPercent))}%)
                        </span>
                      </div>
                    )}

                    {/* Priority Badge */}
                    {project.priority && (
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          priorityColors[project.priority]
                        }`}
                      >
                        P{project.priority}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-[#474747] mt-3 max-w-2xl">
                      {project.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => {
                    /* TODO: Implement edit */
                  }}
                  className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-[#F3F3F3] text-[#474747] rounded hover:bg-[#E5E5E5] transition flex items-center justify-center gap-2 min-h-[44px] text-sm md:text-base"
                >
                  <FaEdit />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => setIsVoiceToTaskOpen(true)}
                  className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-[#006766] text-white rounded hover:bg-[#005555] transition flex items-center justify-center gap-2 min-h-[44px] text-sm md:text-base"
                >
                  <FaMicrophone />
                  <span className="hidden sm:inline">Dictate Tasks</span>
                </button>
                <button
                  onClick={() => setIsQuickAddOpen(true)}
                  className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-[#000000] text-white rounded hover:bg-[#1A1C1C] transition flex items-center justify-center gap-2 min-h-[44px] text-sm md:text-base"
                >
                  <FaPlus />
                  <span className="hidden sm:inline">Add Task</span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 max-w-3xl">
              <div className="flex items-center justify-between text-sm text-[#474747] mb-2">
                <span className="flex items-center gap-2">
                  <FaTasks />
                  {completedTasks} / {totalTasks} tasks completed
                </span>
                <span className="font-medium">
                  {Math.round(completionPercent)}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-500 transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Tasks List */}
        <ResponsivePageContainer>
          <main className="py-6 md:py-8">
            <div className="max-w-5xl">
            <h2 className="text-lg font-semibold text-[#1A1C1C] mb-4">Tasks</h2>

            {project.tasks.length === 0 ? (
              <div className="bg-white rounded p-8 text-center">
                <FaTasks className="mx-auto text-4xl text-[#E5E5E5] mb-4" />
                <p className="text-[#737373] mb-4">No tasks yet in this project.</p>
                <button 
                  onClick={() => setIsQuickAddOpen(true)}
                  className="px-4 py-2 bg-[#000000] text-white rounded hover:bg-[#1A1C1C] transition inline-flex items-center gap-2"
                >
                  <FaPlus /> Add First Task
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {project.tasks.map((task) => {
                  const isCompleted = !!task.completedAt
                  const isOverdue =
                    task.dueAt && !isCompleted && new Date(task.dueAt) < new Date()

                  return (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="block group"
                    >
                      <div className="bg-white  hover:border-[#1A1C1C] rounded p-4 transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center gap-3">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          readOnly
                          className="w-4 h-4 rounded border-[#E5E5E5] cursor-pointer flex-shrink-0"
                          style={{ accentColor: '#1A1C1C' }}
                          onClick={(e) => e.preventDefault()}
                        />

                        {/* Task Info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[15px] font-medium truncate ${
                              isCompleted ? 'line-through text-[#A3A3A3]' : 'text-[#1A1A1A] group-hover:text-[#1A1C1C]'
                            }`}
                          >
                            {task.title}
                          </p>

                          {/* Metadata */}
                          <div className="flex items-center gap-2 mt-1">
                            {/* Status */}
                            <span
                              className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${
                                task.status.type === 'done'
                                  ? 'bg-[#F3F3F3] text-[#047857]'
                                  : task.status.type === 'in_progress'
                                  ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                                  : 'bg-[#F3F3F3] text-[#474747]'
                              }`}
                            >
                              {task.status.name}
                            </span>

                            {/* Priority */}
                            <span
                              className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${
                                task.priority === 1 ? 'bg-[#FEF2F2] text-[#B91C1C]' :
                                task.priority === 2 ? 'bg-[#FFF7ED] text-[#C2410C]' :
                                task.priority === 3 ? 'bg-[#FFFBEB] text-[#B45309]' :
                                'bg-[#F3F3F3] text-[#474747]'
                              }`}
                            >
                              P{task.priority}
                            </span>

                            {/* Due Date */}
                            {task.dueAt && (
                              <span
                                className={`text-[11px] ${
                                  isOverdue
                                    ? 'text-[#DC2626] font-medium'
                                    : 'text-[#737373]'
                                }`}
                              >
                                Due {new Date(task.dueAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
              )}
            </div>
          </main>
        </ResponsivePageContainer>
      </div>

      {/* Quick Add Task Modal */}
      {workspaceId && (
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onAdd={handleAddTask}
          workspaceId={workspaceId}
          isMobile={isMobile}
        />
      )}

      {/* Voice to Task Modal */}
      <VoiceToTaskModal
        isOpen={isVoiceToTaskOpen}
        onClose={() => setIsVoiceToTaskOpen(false)}
        contextType="project"
        contextId={projectId}
        onComplete={() => {
          setIsVoiceToTaskOpen(false);
          loadProject();
        }}
      />
    </div>
  )
}
