'use client'

import { useState, useEffect, useRef } from 'react'
import { FaSearch, FaTimes, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'

interface DependencyTask {
  id: string
  title: string
  statusId: string
  status: string
  isDone: boolean
}

interface SearchTask {
  id: string
  title: string
  status: string
  statusId: string
}

interface TaskDependencyPanelProps {
  workspaceId: string
  taskId: string            // current task — excluded from search results
  dependencyIds: string[]
  dependencies?: DependencyTask[]  // pre-loaded objects if available
  onChange: (ids: string[]) => void
  readOnly?: boolean
}

export default function TaskDependencyPanel({
  workspaceId,
  taskId,
  dependencyIds,
  dependencies: initialDeps,
  onChange,
  readOnly = false,
}: TaskDependencyPanelProps) {
  const [deps, setDeps] = useState<DependencyTask[]>(initialDeps || [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchTask[]>([])
  const [searching, setSearching] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  // Load dep objects when IDs change and we don't have pre-loaded data
  useEffect(() => {
    if (initialDeps && initialDeps.length === dependencyIds.length) {
      setDeps(initialDeps)
      return
    }
    if (dependencyIds.length === 0) { setDeps([]); return }
    // Fetch dep details
    Promise.all(
      dependencyIds.map(id =>
        fetch(`/api/tasks/${id}`)
          .then(r => r.json())
          .then(d => d.task ? {
            id: d.task.id,
            title: d.task.title,
            statusId: d.task.statusId,
            status: d.task.status,
            isDone: d.task.status?.toLowerCase() === 'done',
          } : null)
          .catch(() => null)
      )
    ).then(results => setDeps(results.filter(Boolean) as DependencyTask[]))
  }, [dependencyIds.join(',')])

  // Search tasks as user types
  useEffect(() => {
    if (!pickerOpen || !search.trim()) { setResults([]); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/tasks/direct?workspaceId=${workspaceId}&search=${encodeURIComponent(search)}&limit=20`)
        const data = await res.json()
        const tasks: SearchTask[] = (data.tasks ?? [])
          .filter((t: any) => t.id !== taskId && !dependencyIds.includes(t.id))
          .map((t: any) => ({ id: t.id, title: t.title, status: t.status, statusId: t.statusId }))
        setResults(tasks)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(searchTimeout.current)
  }, [search, pickerOpen])

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
        setSearch('')
      }
    }
    if (pickerOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  const addDep = (task: SearchTask) => {
    const newIds = [...dependencyIds, task.id]
    const newDep: DependencyTask = {
      id: task.id,
      title: task.title,
      statusId: task.statusId,
      status: task.status,
      isDone: task.status?.toLowerCase() === 'done',
    }
    setDeps(prev => [...prev, newDep])
    onChange(newIds)
    setSearch('')
    setResults([])
  }

  const removeDep = (id: string) => {
    const newIds = dependencyIds.filter(d => d !== id)
    setDeps(prev => prev.filter(d => d.id !== id))
    onChange(newIds)
  }

  const blockedCount = deps.filter(d => !d.isDone).length

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">
          Depends On
          {blockedCount > 0 && (
            <span className="ml-2 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded normal-case" style={{ borderRadius: 2 }}>
              {blockedCount} prerequisite{blockedCount > 1 ? 's' : ''} outstanding
            </span>
          )}
        </label>
        {!readOnly && (
          <button
            onClick={() => setPickerOpen(true)}
            className="text-[11px] text-[#474747] hover:text-[#1A1C1C] underline underline-offset-2"
          >
            + Add prerequisite
          </button>
        )}
      </div>

      {/* Picker */}
      {pickerOpen && (
        <div ref={pickerRef} className="relative z-20 mb-2">
          <div className="absolute top-0 left-0 right-0 bg-white border border-[#C6C6C6] rounded shadow-[0_8px_24px_rgba(0,0,0,0.08)] max-h-64 overflow-hidden flex flex-col" style={{ borderRadius: 4 }}>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E8E8E8]">
              <FaSearch className="text-[#A3A3A3] text-[10px] shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="flex-1 text-sm outline-none text-[#1A1C1C] placeholder:text-[#A3A3A3]"
              />
              <button onClick={() => { setPickerOpen(false); setSearch('') }} className="text-[#A3A3A3] hover:text-[#1A1C1C]">
                <FaTimes className="text-[10px]" />
              </button>
            </div>
            <div className="overflow-y-auto">
              {searching && <div className="px-3 py-3 text-sm text-[#A3A3A3]">Searching…</div>}
              {!searching && search && results.length === 0 && (
                <div className="px-3 py-3 text-sm text-[#A3A3A3]">No tasks found</div>
              )}
              {!searching && !search && (
                <div className="px-3 py-3 text-sm text-[#A3A3A3]">Type to search tasks…</div>
              )}
              {results.map(t => (
                <button
                  key={t.id}
                  onClick={() => addDep(t)}
                  className="w-full text-left px-3 py-2 hover:bg-[#F3F3F3] flex items-center justify-between"
                >
                  <span className="text-sm text-[#1A1C1C]">{t.title}</span>
                  <span className={`text-[10px] ml-2 shrink-0 px-1.5 py-0.5 rounded ${t.status?.toLowerCase() === 'done' ? 'bg-[#1A1C1C] text-white' : 'bg-[#F3F3F3] text-[#474747]'}`} style={{ borderRadius: 2 }}>
                    {t.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dependency pills */}
      {deps.length === 0 && (
        <div className="text-sm text-[#A3A3A3] italic">No prerequisites — task can start anytime.</div>
      )}
      {deps.length > 0 && (
        <div className="space-y-1.5">
          {deps.map(dep => (
            <div
              key={dep.id}
              className={`flex items-center justify-between px-3 py-2 rounded border ${
                dep.isDone
                  ? 'border-[#C6C6C6] bg-white'
                  : 'border-amber-200 bg-amber-50'
              }`}
              style={{ borderRadius: 4 }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {dep.isDone
                  ? <FaCheckCircle className="text-green-500 text-[12px] shrink-0" />
                  : <FaExclamationCircle className="text-amber-500 text-[12px] shrink-0" />
                }
                <span className="text-sm text-[#1A1C1C] truncate">{dep.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  dep.isDone
                    ? 'bg-[#1A1C1C] text-white'
                    : 'bg-amber-100 text-amber-700'
                }`} style={{ borderRadius: 2 }}>
                  {dep.status}
                </span>
                {!readOnly && (
                  <button
                    onClick={() => removeDep(dep.id)}
                    className="text-[#C6C6C6] hover:text-[#474747] transition-colors"
                  >
                    <FaTimes className="text-[10px]" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
