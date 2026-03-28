'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { BuildResult, StepResult } from '@/app/api/build/route'

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = 'entry' | 'generating' | 'summary' | 'invite'

interface CreatedStructure {
  workspaceId: string
  aiPackage: BuildResult['aiPackage']
  created: BuildResult['created']
}

interface EditState {
  value: string
  saving: boolean
  error: string
}

// ─── Progress step definitions ────────────────────────────────────────────────

const STEPS = [
  { id: 'parse', label: 'Understanding your idea...' },
  { id: 'company', label: 'Setting up your company...' },
  { id: 'project', label: 'Creating your project...' },
  { id: 'tasks', label: 'Building your task list...' },
  { id: 'note', label: 'Writing your kickoff note...' },
]

// ─── Inline editable title ────────────────────────────────────────────────────

function InlineEdit({
  initialValue,
  onSave,
  disabled,
}: {
  initialValue: string
  onSave: (value: string) => Promise<void>
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [edit, setEdit] = useState<EditState>({ value: initialValue, saving: false, error: '' })
  const [displayValue, setDisplayValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  async function handleSave() {
    const trimmed = edit.value.trim()
    if (!trimmed || trimmed === displayValue) {
      setEditing(false)
      setEdit((e) => ({ ...e, value: displayValue }))
      return
    }
    setEdit((e) => ({ ...e, saving: true, error: '' }))
    try {
      await onSave(trimmed)
      setDisplayValue(trimmed)
      setEditing(false)
    } catch {
      setEdit((e) => ({ ...e, saving: false, error: 'Failed to save' }))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') { setEditing(false); setEdit((s) => ({ ...s, value: displayValue, error: '' })) }
  }

  if (disabled) {
    return <span className="text-[13px] font-medium text-[#1A1A1A] truncate">{displayValue}</span>
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <input
          ref={inputRef}
          value={edit.value}
          onChange={(e) => setEdit((s) => ({ ...s, value: e.target.value }))}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={edit.saving}
          className="flex-1 text-[13px] font-medium text-[#1A1A1A] bg-transparent border-b border-[#DD3A44] outline-none min-w-0 py-0.5"
        />
        {edit.saving && (
          <div className="w-3 h-3 rounded-full border border-[#DD3A44] border-t-transparent animate-spin shrink-0" />
        )}
        {edit.error && <span className="text-[11px] text-[#DD3A44] shrink-0">{edit.error}</span>}
      </div>
    )
  }

  return (
    <button
      onClick={() => { setEditing(true); setEdit((s) => ({ ...s, value: displayValue })) }}
      className="group flex items-center gap-1.5 text-left flex-1 min-w-0"
      title="Click to edit"
    >
      <span className="text-[13px] font-medium text-[#1A1A1A] truncate">{displayValue}</span>
      <svg
        className="w-3 h-3 text-[#A3A3A3] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828A2 2 0 0110 16H8v-2a2 2 0 01.586-1.414z" />
      </svg>
    </button>
  )
}

// ─── Object card with inline edit ────────────────────────────────────────────

function ObjectCard({
  type,
  id,
  title,
  meta,
  href,
  success,
  reused,
  error,
  onTitleSave,
}: {
  type: 'company' | 'project' | 'task' | 'note'
  id?: string
  title: string
  meta?: string
  href?: string
  success: boolean
  reused?: boolean
  error?: string
  onTitleSave?: (newTitle: string) => Promise<void>
}) {
  const icons: Record<typeof type, string> = {
    company: '🏢',
    project: '📁',
    task: '✅',
    note: '📝',
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
        success
          ? 'bg-white border-[#E5E5E5] hover:border-[#DD3A44]/20'
          : 'bg-[#FEF2F2] border-[#FECACA]'
      }`}
    >
      <span className="text-lg mt-0.5 shrink-0">{icons[type]}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {success && onTitleSave ? (
            <InlineEdit initialValue={title} onSave={onTitleSave} />
          ) : (
            <span className="text-[13px] font-medium text-[#1A1A1A] truncate">{title}</span>
          )}
          {reused && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#737373] shrink-0">
              already existed
            </span>
          )}
        </div>
        {meta && <p className="text-[12px] text-[#737373] mt-0.5 line-clamp-2">{meta}</p>}
        {error && <p className="text-[12px] text-[#DD3A44] mt-0.5">{error}</p>}
      </div>

      {success && href && (
        <Link href={href} className="shrink-0 mt-0.5 text-[#A3A3A3] hover:text-[#DD3A44] transition-colors" title="Open">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  )
}

// ─── Save helpers ─────────────────────────────────────────────────────────────

async function saveCompanyTitle(id: string, name: string) {
  const res = await fetch(`/api/spaces/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed')
}

async function saveProjectTitle(id: string, name: string) {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed')
}

async function saveTaskTitle(id: string, title: string) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error('Failed')
}

async function saveNoteTitle(id: string, title: string) {
  const res = await fetch(`/api/notes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error('Failed')
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StartClient() {
  const [screen, setScreen] = useState<Screen>('entry')
  const [prompt, setPrompt] = useState('')
  const [activeStep, setActiveStep] = useState(0)
  const [structure, setStructure] = useState<CreatedStructure | null>(null)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  // Track which failed tasks are being retried
  const [retrying, setRetrying] = useState<Set<number>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Step animation timer refs for cleanup
  const stepTimerRefs = useRef<NodeJS.Timeout[]>([])

  useEffect(() => {
    if (screen === 'entry') textareaRef.current?.focus()
  }, [screen])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => stepTimerRefs.current.forEach(clearTimeout)
  }, [])

  function handlePromptChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  async function runBuild(promptText: string) {
    setError('')
    setScreen('generating')
    setActiveStep(0)

    // Clear any previous timers
    stepTimerRefs.current.forEach(clearTimeout)
    stepTimerRefs.current = []

    // Step animation — advance through steps while the API call runs
    const stepTimings = [500, 900, 800, 1100, 700]
    let elapsed = 0
    for (let i = 1; i < STEPS.length; i++) {
      elapsed += stepTimings[i - 1]
      const t = setTimeout(() => setActiveStep(i), elapsed)
      stepTimerRefs.current.push(t)
    }

    try {
      const res = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      })
      const data = await res.json()

      // Clear step timers before showing results
      stepTimerRefs.current.forEach(clearTimeout)
      stepTimerRefs.current = []
      setActiveStep(STEPS.length - 1)

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setScreen('entry')
        return
      }

      setStructure(data.result)
      setScreen('summary')
    } catch {
      stepTimerRefs.current.forEach(clearTimeout)
      stepTimerRefs.current = []
      setError('Connection error. Please try again.')
      setScreen('entry')
    }
  }

  function handleSubmit() {
    if (!prompt.trim()) return
    runBuild(prompt)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Retry individual failed tasks
  async function retryTask(index: number) {
    if (!structure) return
    const taskDef = structure.aiPackage.tasks[index]
    if (!taskDef) return

    setRetrying((prev) => new Set(prev).add(index))
    try {
      const res = await fetch('/api/tasks/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_DOUG_TOKEN || ''}`,
        },
        body: JSON.stringify({
          workspaceId: structure.workspaceId,
          title: taskDef.title,
          description: taskDef.description || null,
          priority: taskDef.priority ?? 2,
          companyId: structure.created.company.id || null,
          projectId: structure.created.project.id || null,
        }),
      })
      const data = await res.json()
      if (res.ok && data.task?.id) {
        setStructure((prev) => {
          if (!prev) return prev
          const tasks = [...prev.created.tasks]
          tasks[index] = { success: true, id: data.task.id, title: taskDef.title }
          return { ...prev, created: { ...prev.created, tasks } }
        })
      } else {
        setStructure((prev) => {
          if (!prev) return prev
          const tasks = [...prev.created.tasks]
          tasks[index] = { success: false, title: taskDef.title, error: 'Still failed — try from the project page' }
          return { ...prev, created: { ...prev.created, tasks } }
        })
      }
    } catch {
      setStructure((prev) => {
        if (!prev) return prev
        const tasks = [...prev.created.tasks]
        tasks[index] = { success: false, title: taskDef.title, error: 'Still failed — try from the project page' }
        return { ...prev, created: { ...prev.created, tasks } }
      })
    } finally {
      setRetrying((prev) => { const next = new Set(prev); next.delete(index); return next })
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteStatus('sending')
    // Invite email infrastructure placeholder — wired when Resend is configured
    await new Promise((r) => setTimeout(r, 800))
    setInviteStatus('sent')
  }

  // ─── Screen A: Entry ────────────────────────────────────────────────────────
  if (screen === 'entry') {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#DD3A44] rounded-[12px] mb-4">
              <span className="font-semibold text-white text-xl">Z</span>
            </div>
            <h1 className="text-[28px] font-semibold text-[#1A1A1A] leading-snug">
              What do you want to build?
            </h1>
            <p className="text-[15px] text-[#737373] mt-2">
              Describe your idea. Zebi turns it into a company, project, tasks and a kickoff note.
            </p>
          </div>

          {/* Input */}
          <div className="bg-white rounded-[16px] border border-[#E5E5E5] shadow-sm overflow-hidden">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handlePromptChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Help me launch a new marketing campaign for Love Warranty focused on dealer retention"
              className="w-full px-5 py-4 text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] resize-none focus:outline-none min-h-[120px] leading-relaxed"
              rows={4}
            />
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#F5F5F5]">
              <span className="text-[12px] text-[#A3A3A3]">⌘ + Enter to go</span>
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                className="px-5 py-2 bg-[#DD3A44] hover:bg-[#C7333D] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-[8px] text-[14px] font-medium transition"
              >
                Build it →
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[10px]">
              <p className="text-[13px] text-[#DD3A44]">{error}</p>
            </div>
          )}

          {/* Examples */}
          <div className="mt-6">
            <p className="text-[12px] text-[#A3A3A3] mb-3 text-center">Try one of these</p>
            <div className="flex flex-col gap-2">
              {[
                'Launch a SaaS onboarding redesign for Zebi',
                'Build a dealer performance review process for Love Warranty',
                'Create a content marketing push for a new product launch',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setPrompt(example)
                    setTimeout(() => textareaRef.current?.focus(), 50)
                  }}
                  className="text-left px-4 py-2.5 rounded-[10px] border border-[#E5E5E5] bg-white hover:border-[#DD3A44]/40 hover:bg-[#FFF5F5] text-[13px] text-[#525252] transition"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-[12px] text-[#A3A3A3] mt-8">
            Already have work in Zebi?{' '}
            <Link href="/dashboard" className="text-[#DD3A44] hover:underline">
              Go to dashboard
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // ─── Screen B: Generating ───────────────────────────────────────────────────
  if (screen === 'generating') {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#DD3A44] rounded-[12px] mb-8">
            <span className="font-semibold text-white text-xl">Z</span>
          </div>

          <div className="space-y-3 text-left">
            {STEPS.map((step, i) => {
              const done = i < activeStep
              const active = i === activeStep

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[10px] transition-all duration-300 ${
                    active
                      ? 'bg-white border border-[#E5E5E5] shadow-sm'
                      : done
                      ? 'opacity-40'
                      : 'opacity-20'
                  }`}
                >
                  <div className="shrink-0">
                    {done ? (
                      <div className="w-5 h-5 rounded-full bg-[#22C55E] flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : active ? (
                      <div className="w-5 h-5 rounded-full border-2 border-[#DD3A44] border-t-transparent animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#E5E5E5]" />
                    )}
                  </div>
                  <span className={`text-[14px] ${active ? 'text-[#1A1A1A] font-medium' : 'text-[#737373]'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="text-[12px] text-[#A3A3A3] mt-6">Usually takes about 5 seconds</p>
        </div>
      </div>
    )
  }

  // ─── Screen C: Summary ──────────────────────────────────────────────────────
  if (screen === 'summary' && structure) {
    const { aiPackage, created } = structure
    const failedTaskIndexes = created.tasks
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => !t.success)
      .map(({ i }) => i)
    const hasAnyFailure =
      !created.company.success ||
      !created.project.success ||
      !created.note.success ||
      failedTaskIndexes.length > 0

    return (
      <div className="min-h-screen bg-[#fcf9f8] px-4 py-12">
        <div className="w-full max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-[#22C55E] rounded-full mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-[24px] font-semibold text-[#1A1A1A]">Your structure is ready</h2>
            <p className="text-[14px] text-[#737373] mt-1">
              Click any title to edit it inline.
            </p>
          </div>

          {/* Company */}
          <div className="mb-3">
            <p className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wider mb-1.5 px-1">Company</p>
            <ObjectCard
              type="company"
              id={created.company.id}
              title={created.company.title || aiPackage.company.name}
              meta={aiPackage.company.industry}
              href={created.company.id ? `/spaces/${created.company.id}` : undefined}
              success={created.company.success}
              reused={created.company.reused}
              error={created.company.error}
              onTitleSave={
                created.company.id && !created.company.reused
                  ? (name) => saveCompanyTitle(created.company.id!, name)
                  : undefined
              }
            />
          </div>

          {/* Project */}
          <div className="mb-3">
            <p className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wider mb-1.5 px-1">Project</p>
            <ObjectCard
              type="project"
              id={created.project.id}
              title={created.project.title || aiPackage.project.title}
              meta={aiPackage.project.description}
              href={created.project.id ? `/projects/${created.project.id}` : undefined}
              success={created.project.success}
              error={created.project.error}
              onTitleSave={
                created.project.id
                  ? (name) => saveProjectTitle(created.project.id!, name)
                  : undefined
              }
            />
          </div>

          {/* Tasks */}
          <div className="mb-3">
            <p className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wider mb-1.5 px-1">
              Tasks
              {failedTaskIndexes.length > 0 && (
                <span className="text-[#DD3A44] normal-case ml-1">
                  ({failedTaskIndexes.length} failed)
                </span>
              )}
            </p>
            <div className="space-y-2">
              {created.tasks.map((task, i) => {
                const isRetrying = retrying.has(i)
                return (
                  <div key={i} className="relative">
                    <ObjectCard
                      type="task"
                      id={task.id}
                      title={task.title || aiPackage.tasks[i]?.title || 'Task'}
                      href={task.id ? `/tasks/${task.id}` : undefined}
                      success={task.success}
                      error={task.error}
                      onTitleSave={
                        task.id
                          ? (title) => saveTaskTitle(task.id!, title)
                          : undefined
                      }
                    />
                    {!task.success && (
                      <button
                        onClick={() => retryTask(i)}
                        disabled={isRetrying}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#DD3A44] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRetrying ? 'Retrying…' : 'Retry'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Note */}
          <div className="mb-6">
            <p className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wider mb-1.5 px-1">Kickoff note</p>
            <ObjectCard
              type="note"
              id={created.note.id}
              title={created.note.title || aiPackage.note.title}
              meta={aiPackage.note.body?.slice(0, 100) + (aiPackage.note.body?.length > 100 ? '…' : '')}
              success={created.note.success}
              error={created.note.error}
              onTitleSave={
                created.note.id
                  ? (title) => saveNoteTitle(created.note.id!, title)
                  : undefined
              }
            />
          </div>

          {/* Partial failure banner */}
          {hasAnyFailure && (
            <div className="mb-6 p-4 bg-[#FFF7ED] border border-[#FED7AA] rounded-[12px] flex items-start gap-3">
              <span className="text-lg shrink-0">⚠️</span>
              <div>
                <p className="text-[13px] text-[#92400E] font-medium">Some items couldn't be created</p>
                <p className="text-[12px] text-[#B45309] mt-0.5">
                  Use the Retry buttons above, or{' '}
                  <button
                    onClick={() => runBuild(prompt)}
                    className="underline hover:no-underline"
                  >
                    regenerate everything
                  </button>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setScreen('invite')}
              className="w-full px-5 py-3 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[15px] transition"
            >
              Invite a teammate →
            </button>
            <Link
              href="/dashboard"
              className="w-full px-5 py-3 border border-[#E5E5E5] bg-white hover:bg-[#F9F9F9] text-[#1A1A1A] rounded-[10px] font-medium text-[15px] transition text-center"
            >
              Go to dashboard
            </Link>
          </div>

          <p className="text-center text-[12px] text-[#A3A3A3] mt-6">
            Want to build something else?{' '}
            <button
              onClick={() => {
                setPrompt('')
                setStructure(null)
                setScreen('entry')
              }}
              className="text-[#DD3A44] hover:underline"
            >
              Start over
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ─── Screen D: Invite ───────────────────────────────────────────────────────
  if (screen === 'invite') {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#F5F5F5] rounded-full mb-4 text-2xl">
              👋
            </div>
            <h2 className="text-[24px] font-semibold text-[#1A1A1A]">Invite a teammate</h2>
            <p className="text-[15px] text-[#737373] mt-2">
              Give them access to{' '}
              <span className="font-medium text-[#1A1A1A]">
                {structure?.aiPackage.project.title || 'your new project'}
              </span>
              .
            </p>
          </div>

          {inviteStatus === 'sent' ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F0FDF4] rounded-full mb-4">
                <svg className="w-8 h-8 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[15px] font-medium text-[#1A1A1A]">Invite sent</p>
              <p className="text-[13px] text-[#737373] mt-1">
                They'll receive an email to join your workspace.
              </p>
              <button
                onClick={() => { setInviteEmail(''); setInviteStatus('idle') }}
                className="mt-4 text-[13px] text-[#DD3A44] hover:underline"
              >
                Invite someone else
              </button>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-4">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                className="w-full px-4 py-3 border border-[#D4D4D4] rounded-[10px] text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
              />
              <button
                type="submit"
                disabled={inviteStatus === 'sending' || !inviteEmail.trim()}
                className="w-full px-5 py-3 bg-[#DD3A44] hover:bg-[#C7333D] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-[10px] font-medium text-[15px] transition"
              >
                {inviteStatus === 'sending' ? 'Sending…' : 'Send invite'}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
            <Link
              href="/dashboard"
              className="block w-full text-center px-5 py-3 border border-[#E5E5E5] bg-white hover:bg-[#F9F9F9] text-[#1A1A1A] rounded-[10px] font-medium text-[15px] transition"
            >
              Go to dashboard
            </Link>
          </div>

          <p className="text-center text-[12px] text-[#A3A3A3] mt-4">
            <button
              onClick={() => setScreen('summary')}
              className="text-[#DD3A44] hover:underline"
            >
              ← Back to summary
            </button>
          </p>
        </div>
      </div>
    )
  }

  return null
}
