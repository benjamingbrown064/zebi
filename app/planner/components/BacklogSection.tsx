'use client'

import { useState, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import PlannerTaskCard from './PlannerTaskCard'
import { FaInbox, FaSearch, FaTimes } from 'react-icons/fa'

interface Task {
  id: string
  title: string
  description?: string | null
  priority: number
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
}

interface BacklogSectionProps {
  tasks: Task[]
  onMarkComplete: (taskId: string) => void
  workspaceId: string
}

type SortOption = 'priority' | 'created' | 'effort'
type PriorityFilter = 'all' | 1 | 2 | 3

export default function BacklogSection({
  tasks,
  onMarkComplete,
  workspaceId,
}: BacklogSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'backlog',
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('priority')

  // Get unique projects from tasks
  const projects = useMemo(() => {
    const projectMap = new Map<string, string>()
    tasks.forEach((task) => {
      if (task.project) {
        projectMap.set(task.project.id, task.project.name)
      }
    })
    return Array.from(projectMap.entries())
      .map(([id, name]) => ({ id, name }))
      .slice(0, 5) // Top 5 projects
  }, [tasks])

  // Get unique statuses
  const statuses = useMemo(() => {
    const statusMap = new Map<string, string>()
    tasks.forEach((task) => {
      if (task.status) {
        statusMap.set(task.status.id, task.status.name)
      }
    })
    return Array.from(statusMap.entries()).map(([id, name]) => ({ id, name }))
  }, [tasks])

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.project?.name.toLowerCase().includes(query) ||
          task.company?.name.toLowerCase().includes(query)
      )
    }

    // Project filter
    if (selectedProject !== 'all') {
      filtered = filtered.filter((task) => task.project?.id === selectedProject)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((task) => task.priority === priorityFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((task) => task.status.id === statusFilter)
    }

    // Sort
    const sorted = [...filtered]
    switch (sortBy) {
      case 'priority':
        sorted.sort((a, b) => a.priority - b.priority) // 1 (High) first
        break
      case 'effort':
        sorted.sort((a, b) => (b.effortPoints || 0) - (a.effortPoints || 0))
        break
      case 'created':
        // Assuming newer tasks are at the top by default
        break
    }

    return sorted
  }, [tasks, searchQuery, selectedProject, priorityFilter, statusFilter, sortBy])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedProject('all')
    setPriorityFilter('all')
    setStatusFilter('all')
    setSortBy('priority')
  }

  const hasActiveFilters =
    searchQuery.trim() ||
    selectedProject !== 'all' ||
    priorityFilter !== 'all' ||
    statusFilter !== 'all' ||
    sortBy !== 'priority'

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full bg-white border rounded-[14px] overflow-hidden transition-all ${
        isOver ? 'border-[#DD3A44] shadow-[0_4px_12px_rgba(28,27,27,0.08)]' : 'border-[#E5E5E5]'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-[#fcf9f8]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FaInbox className="w-4 h-4 text-[#A3A3A3]" />
            <h3 className="text-base font-semibold text-[#1A1A1A]">Backlog</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#DD3A44] hover:text-[#C2323B] font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
        <p className="text-xs text-[#A3A3A3]">
          {filteredTasks.length} of {tasks.length} task
          {tasks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#A3A3A3]" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm  rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#DD3A44]/20 focus:border-[#DD3A44]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#525252]"
            >
              <FaTimes className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 space-y-2">
        {/* Project filter */}
        {projects.length > 0 && (
          <div>
            <label className="text-xs font-medium text-[#A3A3A3] mb-1 block">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-1.5 text-sm  rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#DD3A44]/20 focus:border-[#DD3A44]"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Priority filter */}
        <div>
          <label className="text-xs font-medium text-[#A3A3A3] mb-1 block">
            Priority
          </label>
          <div className="flex gap-1">
            <button
              onClick={() => setPriorityFilter('all')}
              className={`flex-1 px-2 py-1.5 text-xs rounded-[6px] transition-colors ${
                priorityFilter === 'all'
                  ? 'bg-[#DD3A44] text-white'
                  : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#E5E5E5]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPriorityFilter(1)}
              className={`flex-1 px-2 py-1.5 text-xs rounded-[6px] transition-colors ${
                priorityFilter === 1
                  ? 'bg-[#EF4444] text-white'
                  : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#E5E5E5]'
              }`}
            >
              High
            </button>
            <button
              onClick={() => setPriorityFilter(2)}
              className={`flex-1 px-2 py-1.5 text-xs rounded-[6px] transition-colors ${
                priorityFilter === 2
                  ? 'bg-[#F59E0B] text-white'
                  : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#E5E5E5]'
              }`}
            >
              Med
            </button>
            <button
              onClick={() => setPriorityFilter(3)}
              className={`flex-1 px-2 py-1.5 text-xs rounded-[6px] transition-colors ${
                priorityFilter === 3
                  ? 'bg-[#A3A3A3] text-white'
                  : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#E5E5E5]'
              }`}
            >
              Low
            </button>
          </div>
        </div>

        {/* Status filter */}
        {statuses.length > 1 && (
          <div>
            <label className="text-xs font-medium text-[#A3A3A3] mb-1 block">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-sm  rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#DD3A44]/20 focus:border-[#DD3A44]"
            >
              <option value="all">All Statuses</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort */}
        <div>
          <label className="text-xs font-medium text-[#A3A3A3] mb-1 block">
            Sort by
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full px-3 py-1.5 text-sm  rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#DD3A44]/20 focus:border-[#DD3A44]"
          >
            <option value="priority">Priority (High first)</option>
            <option value="effort">Effort (Largest first)</option>
            <option value="created">Recently added</option>
          </select>
        </div>
      </div>

      {/* Tasks list */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <SortableContext
          items={filteredTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <FaInbox className="w-8 h-8 text-[#D4D4D4] mb-2" />
              <p className="text-sm text-[#A3A3A3]">
                {tasks.length === 0
                  ? 'All tasks are planned!'
                  : 'No tasks match your filters'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <PlannerTaskCard
                key={task.id}
                task={task}
                onMarkComplete={onMarkComplete}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}
