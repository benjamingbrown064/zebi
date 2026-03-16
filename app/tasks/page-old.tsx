'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TaskDetailModal from '@/components/TaskDetailModal'
import QuickAddModal from '@/components/QuickAddModal'
import TasksTable from '@/components/TasksTable'
import TasksTableToolbar from '@/components/TasksTableToolbar'
import { FaPlus, FaSearch, FaFilter, FaSpinner } from 'react-icons/fa'
import { getTasks, createTask, updateTask, deleteTask, Task } from '@/app/actions/tasks'
import { getStatuses, Status } from '@/app/actions/statuses'
import { getFilters, SavedFilter } from '@/app/actions/filters'
import { getGoals } from '@/app/actions/goals'
import { useWorkspace } from '@/lib/use-workspace'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'
const PAGE_SIZE = 25 // Load 25 tasks at a time

export default function TasksPage() {
  const router = useRouter()
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [tasks, setTasks] = useState<(Task & { goalTag?: string })[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | undefined>()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  
  const observerTarget = useRef<HTMLDivElement>(null)

  // Table state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPriorities, setSelectedPriorities] = useState<number[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'status' | 'updated' | 'created'>('dueDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Load initial data
  useEffect(() => {
    if (!workspaceId) return
    
    async function loadInitialData() {
      try {
        const [fetchedTasks, fetchedStatuses, fetchedGoals] = await Promise.all([
          getTasks(workspaceId!, { limit: PAGE_SIZE, offset: 0 }),
          getStatuses(workspaceId!),
          getGoals(workspaceId!),
        ])

        // Enrich tasks with goal information
        const goalMap = new Map(fetchedGoals.map(g => [g.id, g]))
        const enrichedTasks = fetchedTasks.map(t => ({
          ...t,
          goal: t.goalId ? goalMap.get(t.goalId) : undefined,
        }))

        setTasks(enrichedTasks)
        setStatuses(fetchedStatuses)
        setHasMore(fetchedTasks.length === PAGE_SIZE)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load data:', err)
        setLoading(false)
      }
    }

    loadInitialData()
  }, [workspaceId])

  // Load more tasks
  const loadMoreTasks = useCallback(async () => {
    if (loadingMore || !hasMore || !workspaceId) return

    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const [fetchedTasks, fetchedGoals] = await Promise.all([
        getTasks(workspaceId, { limit: PAGE_SIZE, offset: nextPage * PAGE_SIZE }),
        getGoals(workspaceId),
      ])

      if (fetchedTasks.length === 0) {
        setHasMore(false)
        setLoadingMore(false)
        return
      }

      // Enrich tasks with goal information
      const goalMap = new Map(fetchedGoals.map(g => [g.id, g]))
      const enrichedTasks = fetchedTasks.map(t => ({
        ...t,
        goal: t.goalId ? goalMap.get(t.goalId) : undefined,
      }))

      setTasks(prev => [...prev, ...enrichedTasks])
      setPage(nextPage)
      setHasMore(fetchedTasks.length === PAGE_SIZE)
    } catch (err) {
      console.error('Failed to load more tasks:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [workspaceId, page, loadingMore, hasMore])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreTasks()
        }
      },
      { threshold: 1.0 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loadingMore, loadMoreTasks])

  const getInboxStatusId = (): string => {
    const inbox = statuses.find(s => s.type === 'inbox')
    return inbox?.id || ''
  }

  const handleAddTask = async (taskInput: { title: string; priority: number; tags?: string[]; goalId?: string }) => {
    if (!workspaceId) return
    const inboxStatusId = getInboxStatusId()
    if (!inboxStatusId) {
      console.error('No inbox status found')
      return
    }

    const newTask = await createTask(workspaceId, PLACEHOLDER_USER_ID, {
      title: taskInput.title,
      priority: taskInput.priority,
      statusId: inboxStatusId,
      tagNames: taskInput.tags,
      goalId: taskInput.goalId,
    })

    if (newTask) {
      setTasks([newTask, ...tasks])
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!workspaceId) return
    const updated = await updateTask(workspaceId, taskId, updates)
    if (updated) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updated } : t))
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!workspaceId) return
    const success = await deleteTask(workspaceId, taskId)
    if (success) {
      setTasks(tasks.filter(t => t.id !== taskId))
    }
  }

  // Apply filters
  let filteredTasks = [...tasks]

  // Search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filteredTasks = filteredTasks.filter(
      t => t.title.toLowerCase().includes(query) || 
           t.description?.toLowerCase().includes(query)
    )
  }

  // Priority filter
  if (selectedPriorities.length > 0) {
    filteredTasks = filteredTasks.filter(t => selectedPriorities.includes(t.priority))
  }

  // Status filter
  if (selectedStatuses.length > 0) {
    filteredTasks = filteredTasks.filter(t => selectedStatuses.includes(t.statusId))
  }

  if (workspaceLoading || loading || !workspaceId) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-[#A3A3A3]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar 
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={sidebarCollapsed ? 'ml-16' : 'ml-64'}>
        <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-10">
          <div className="max-w-[1280px] mx-auto px-12 py-8 flex items-center justify-between">
            <div>
              <h1 className="text-[30px] leading-[36px] font-medium text-[#1A1A1A]">All Tasks</h1>
              <p className="text-[13px] text-[#A3A3A3] mt-1">
                {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
                {(searchQuery || selectedPriorities.length > 0 || selectedStatuses.length > 0) && ' (filtered)'}
                {!hasMore && tasks.length > PAGE_SIZE && ' (all loaded)'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search Icon */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-[#525252] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] rounded-[10px] transition"
                title="Search tasks"
              >
                <FaSearch size={18} />
              </button>
              {/* Filters Button */}
              <button
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`px-4 py-2 rounded-[10px] border transition flex items-center gap-2 text-[15px] font-medium ${
                  isFiltersOpen
                    ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DD3A44]'
                    : 'bg-white border-[#E5E5E5] text-[#525252] hover:bg-[#F5F5F5]'
                }`}
                title="Toggle filters"
              >
                <FaFilter size={14} />
                Filters
              </button>
              {/* Add Task Button */}
              <button
                onClick={() => setIsQuickAddOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white font-medium rounded-[10px] text-[15px] transition-colors"
              >
                <FaPlus /> Add Task
              </button>
            </div>
          </div>

          {/* Filters Panel - integrated in header */}
          {isFiltersOpen && (
            <div className="max-w-[1280px] mx-auto px-12 pb-6 border-t border-[#E5E5E5] bg-[#FAFAFA] space-y-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Priority Filter */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-3">
                    Priority
                  </label>
                  <div className="space-y-2">
                    {[
                      { num: 1, label: 'P1 - Urgent' },
                      { num: 2, label: 'P2 - High' },
                      { num: 3, label: 'P3 - Medium' },
                      { num: 4, label: 'P4 - Low' },
                    ].map((p) => (
                      <label key={p.num} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPriorities.includes(p.num)}
                          onChange={() => {
                            if (selectedPriorities.includes(p.num)) {
                              setSelectedPriorities(selectedPriorities.filter(x => x !== p.num))
                            } else {
                              setSelectedPriorities([...selectedPriorities, p.num])
                            }
                          }}
                          className="rounded border-[#E5E5E5]"
                        />
                        <span className="text-[13px] text-[#525252]">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-3">
                    Status
                  </label>
                  <div className="space-y-2">
                    {statuses.map((status) => (
                      <label key={status.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes(status.id)}
                          onChange={() => {
                            if (selectedStatuses.includes(status.id)) {
                              setSelectedStatuses(selectedStatuses.filter(x => x !== status.id))
                            } else {
                              setSelectedStatuses([...selectedStatuses, status.id])
                            }
                          }}
                          className="rounded border-[#E5E5E5]"
                        />
                        <span className="text-[13px] text-[#525252]">{status.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clear Filters Button */}
              {(searchQuery || selectedPriorities.length > 0 || selectedStatuses.length > 0) && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedPriorities([])
                    setSelectedStatuses([])
                  }}
                  className="px-4 py-2 text-[13px] bg-white text-[#525252] border border-[#E5E5E5] rounded-[10px] hover:bg-[#F5F5F5] transition-colors font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </header>

        <main className="max-w-[1280px] mx-auto px-12 py-12">
          <div>
            {/* Table */}
            <TasksTable
              tasks={filteredTasks}
              onTaskClick={(task) => {
                router.push(`/tasks/${task.id}`)
              }}
              onComplete={async (taskId) => {
                await handleUpdateTask(taskId, { completedAt: new Date().toISOString() } as any)
              }}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(newSortBy, newSortOrder) => {
                setSortBy(newSortBy as any)
                setSortOrder(newSortOrder)
              }}
              statuses={statuses}
            />
            
            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="py-8 flex justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-[#A3A3A3]">
                  <FaSpinner className="animate-spin" />
                  <span className="text-[13px]">Loading more tasks...</span>
                </div>
              )}
              {!loadingMore && !hasMore && tasks.length > 0 && (
                <p className="text-[13px] text-[#A3A3A3]">No more tasks to load</p>
              )}
            </div>
          </div>
        </main>

        {/* Modals */}
        {/* Search Modal */}
        {isSearchOpen && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-20">
            <div className="bg-white w-full max-w-2xl rounded-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-6">
              <div className="flex items-center gap-3 border border-[#E5E5E5] rounded-[10px] px-4 py-3">
                <FaSearch className="text-[#A3A3A3]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks by title or description..."
                  className="flex-1 outline-none bg-transparent text-[#1A1A1A] text-[15px] placeholder-[#A3A3A3]"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[#A3A3A3] hover:text-[#525252]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick filters */}
              <div className="mt-4 flex gap-2 flex-wrap">
                <span className="text-[13px] text-[#A3A3A3] py-1">Quick filters:</span>
                {[
                  { num: 1, label: 'P1 - Urgent' },
                  { num: 2, label: 'P2 - High' },
                  { num: 3, label: 'P3 - Medium' },
                  { num: 4, label: 'P4 - Low' },
                ].map((p) => (
                  <button
                    key={p.num}
                    onClick={() => {
                      if (selectedPriorities.includes(p.num)) {
                        setSelectedPriorities(selectedPriorities.filter(x => x !== p.num))
                      } else {
                        setSelectedPriorities([...selectedPriorities, p.num])
                      }
                    }}
                    className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors ${
                      selectedPriorities.includes(p.num)
                        ? 'bg-[#FEF2F2] text-[#DD3A44] border border-[#FECACA]'
                        : 'bg-white text-[#525252] border border-[#E5E5E5] hover:bg-[#F5F5F5]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Close button */}
              <button
                onClick={() => setIsSearchOpen(false)}
                className="mt-4 w-full py-2 text-[13px] text-[#525252] hover:bg-[#F5F5F5] rounded-[10px] transition-colors"
              >
                Close (ESC)
              </button>
            </div>
          </div>
        )}

        {/* Task Detail Modal */}
        <TaskDetailModal
          isOpen={isTaskDetailOpen}
          onClose={() => {
            setIsTaskDetailOpen(false)
            setSelectedTask(undefined)
          }}
          task={selectedTask}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          workspaceId={workspaceId}
          userId={PLACEHOLDER_USER_ID}
          userName="You"
          statuses={statuses}
        />
        {/* Quick Add Modal */}
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onAdd={handleAddTask}
        />
      </div>
    </div>
  )
}
