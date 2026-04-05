'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/lib/use-workspace'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBolt,
  faListCheck,
  faFolderOpen,
  faBuilding,
  faFlagCheckered,
  faFileLines,
  faLightbulb,
} from '@fortawesome/pro-duotone-svg-icons'

interface CaptureModalProps {
  isOpen: boolean
  onClose: () => void
}

type CaptureType = 'task' | 'note' | 'idea' | 'space' | 'objective' | 'project' | 'any'

const TYPES: { id: CaptureType; label: string; icon: any; placeholder: string; hasForm: boolean }[] = [
  { id: 'any',       label: 'Quick Capture', icon: faBolt,           placeholder: 'Type anything — AI will route it…', hasForm: false },
  { id: 'task',      label: 'Task',          icon: faListCheck,      placeholder: 'What needs to be done?',            hasForm: false },
  { id: 'project',   label: 'Project',       icon: faFolderOpen,     placeholder: 'Project name…',                     hasForm: true  },
  { id: 'space',     label: 'Space',         icon: faBuilding,       placeholder: 'Company or space name…',            hasForm: true  },
  { id: 'objective', label: 'Objective',     icon: faFlagCheckered,  placeholder: 'What do you want to achieve?',      hasForm: true  },
  { id: 'note',      label: 'Note',          icon: faFileLines,      placeholder: 'Jot a note…',                       hasForm: false },
  { id: 'idea',      label: 'Idea',          icon: faLightbulb,      placeholder: 'Capture an idea…',                  hasForm: false },
]

export default function CaptureModal({ isOpen, onClose }: CaptureModalProps) {
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const [type, setType] = useState<CaptureType>('any')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // Objective-specific
  const [targetValue, setTargetValue] = useState('')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setTargetValue('')
      setDeadline('')
      setError(null)
      setSaving(false)
      setType('any')
      setTimeout(() => {
        titleRef.current?.focus()
        titleInputRef.current?.focus()
      }, 60)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleSubmit = useCallback(async () => {
    const text = title.trim()
    if (!text || !workspaceId || saving) return
    setSaving(true)
    setError(null)

    try {
      let newId: string | null = null
      let navigateTo: string | null = null

      if (type === 'space') {
        const res = await fetch('/api/spaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId, name: text, executiveSummary: description || undefined }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create space')
        newId = data.id
        navigateTo = `/spaces/${newId}`

      } else if (type === 'project') {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId, name: text, title: text, description: description || undefined }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create project')
        newId = data.project?.id || data.id
        navigateTo = `/projects/${newId}`

      } else if (type === 'objective') {
        const today = new Date().toISOString().split('T')[0]
        const due = deadline || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
        const res = await fetch('/api/objectives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            title: text,
            description: description || undefined,
            metricType: 'count',
            targetValue: parseFloat(targetValue) || 100,
            startDate: today,
            deadline: due,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create objective')
        newId = data.objective?.id || data.id
        navigateTo = `/objectives/${newId}`

      } else if (type === 'task') {
        const res = await fetch('/api/tasks/direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId, title: text, priority: 3 }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create task')
        newId = data.task?.id || data.id
        navigateTo = newId ? `/tasks/${newId}` : '/tasks'

      } else {
        // any / note / idea — route via inbox AI
        const res = await fetch('/api/inbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId, rawText: text, sourceType: `capture_${type}`, captureType: type }),
        })
        if (!res.ok) {
          // fallback to task
          await fetch('/api/tasks/direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, title: text, priority: 3 }),
          })
        }
        navigateTo = type === 'note' ? '/memory' : '/inbox'
      }

      onClose()
      if (navigateTo) router.push(navigateTo)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }, [title, description, targetValue, deadline, workspaceId, saving, type, onClose, router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!isOpen) return null

  const current = TYPES.find(t => t.id === type)!
  const hasForm = current.hasForm

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded w-full max-w-lg shadow-[0_24px_64px_rgba(0,0,0,0.18)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A3A3A3] mb-1">Create</p>
          <h2 className="text-[18px] font-bold text-[#1A1A1A]">What do you want to capture?</h2>
        </div>

        {/* Type pills */}
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                type === t.id
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-[#F3F3F3] text-[#474747] hover:bg-[#E5E5E5]'
              }`}
            >
              <FontAwesomeIcon icon={t.icon} className="text-[11px]" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-[#F3F3F3]" />

        {/* Form fields */}
        <div className="px-5 py-4 space-y-3">
          {/* Title / main input */}
          {hasForm ? (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1.5 block">
                {type === 'space' ? 'Company / Space Name' : type === 'project' ? 'Project Name' : 'Objective Title'}
              </label>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={current.placeholder}
                className="w-full text-[14px] text-[#1A1A1A] placeholder-[#A3A3A3] border border-[#E5E5E5] rounded px-3 py-2.5 outline-none focus:border-[#1A1A1A] transition-colors"
              />
            </div>
          ) : (
            <textarea
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={current.placeholder}
              rows={3}
              className="w-full text-[14px] text-[#1A1A1A] placeholder-[#A3A3A3] resize-none outline-none leading-relaxed"
            />
          )}

          {/* Description — for space, project, objective */}
          {hasForm && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1.5 block">
                Description <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Brief description…"
                rows={2}
                className="w-full text-[13px] text-[#1A1A1A] placeholder-[#A3A3A3] border border-[#E5E5E5] rounded px-3 py-2 resize-none outline-none focus:border-[#1A1A1A] transition-colors"
              />
            </div>
          )}

          {/* Objective-specific fields */}
          {type === 'objective' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1.5 block">
                  Target Value
                </label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={e => setTargetValue(e.target.value)}
                  placeholder="100"
                  className="w-full text-[13px] border border-[#E5E5E5] rounded px-3 py-2 outline-none focus:border-[#1A1A1A] transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1.5 block">
                  Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full text-[13px] border border-[#E5E5E5] rounded px-3 py-2 outline-none focus:border-[#1A1A1A] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E5E5E5] bg-[#F9F9F9]">
          <span className="text-[11px] text-[#A3A3A3]">⌘↵ to save · Esc to close</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-[12px] font-medium text-[#474747] hover:bg-[#E5E5E5] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || saving}
              className="px-5 py-2 rounded text-[13px] font-semibold bg-[#1A1A1A] hover:bg-[#333] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating…' : `Create ${current.id === 'any' ? '' : current.label}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
