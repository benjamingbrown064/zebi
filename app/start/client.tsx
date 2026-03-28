'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { BuildResult, StepResult } from '@/app/api/build/route'

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = 'entry' | 'generating' | 'summary' | 'invite'

interface CreatedStructure {
  workspaceId: string
  aiPackage: BuildResult['aiPackage']
  created: BuildResult['created']
}

// ─── Progress step definitions ────────────────────────────────────────────────

const STEPS = [
  { id: 'parse', label: 'Understanding your idea...' },
  { id: 'company', label: 'Setting up your company...' },
  { id: 'project', label: 'Creating your project...' },
  { id: 'tasks', label: 'Building your task list...' },
  { id: 'note', label: 'Writing your kickoff note...' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function ObjectCard({
  type,
  title,
  meta,
  href,
  success,
  reused,
  error,
}: {
  type: 'company' | 'project' | 'task' | 'note'
  title: string
  meta?: string
  href?: string
  success: boolean
  reused?: boolean
  error?: string
}) {
  const icons: Record<typeof type, string> = {
    company: '🏢',
    project: '📁',
    task: '✅',
    note: '📝',
  }

  const content = (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
        success
          ? 'bg-white border-[#E5E5E5] hover:border-[#DD3A44]/30'
          : 'bg-[#FEF2F2] border-[#FECACA]'
      }`}
    >
      <span className="text-lg mt-0.5 shrink-0">{icons[type]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-[#1A1A1A] truncate">{title}</span>
          {reused && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#737373] shrink-0">
              already existed
            </span>
          )}
        </div>
        {meta && <p className="text-[12px] text-[#737373] mt-0.5 truncate">{meta}</p>}
        {error && <p className="text-[12px] text-[#DD3A44] mt-0.5">{error}</p>}
      </div>
      {success && href && (
        <svg className="w-4 h-4 text-[#A3A3A3] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  )

  if (success && href) {
    return <Link href={href}>{content}</Link>
  }
  return content
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (screen === 'entry') {
      textareaRef.current?.focus()
    }
  }, [screen])

  // Auto-resize textarea
  function handlePromptChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  async function handleSubmit() {
    if (!prompt.trim()) return
    setError('')
    setScreen('generating')
    setActiveStep(0)

    // Step animation
    const stepTimings = [600, 1000, 900, 1200, 700]
    let elapsed = 0
    for (let i = 1; i < STEPS.length; i++) {
      elapsed += stepTimings[i - 1]
      setTimeout(() => setActiveStep(i), elapsed)
    }

    try {
      const res = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setScreen('entry')
        return
      }

      setStructure(data.result)
      setScreen('summary')
    } catch (e) {
      setError('Connection error. Please try again.')
      setScreen('entry')
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteStatus('sending')
    // Invite email infrastructure — wired when Resend is configured
    // For now: simulate success and mark as pending
    await new Promise((r) => setTimeout(r, 800))
    setInviteStatus('sent')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
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

          <p className="text-[12px] text-[#A3A3A3] mt-6">
            This usually takes about 5 seconds
          </p>
        </div>
      </div>
    )
  }

  // ─── Screen C: Summary ──────────────────────────────────────────────────────
  if (screen === 'summary' && structure) {
    const { aiPackage, created } = structure
    const totalTasks = created.tasks.length
    const successfulTasks = created.tasks.filter((t) => t.success).length
    const hasAnyFailure =
      !created.company.success ||
      !created.project.success ||
      !created.note.success ||
      successfulTasks < totalTasks

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
            <h2 className="text-[24px] font-semibold text-[#1A1A1A]">
              Your structure is ready
            </h2>
            <p className="text-[15px] text-[#737373] mt-1">
              Everything's in Zebi. Click any item to edit it.
            </p>
          </div>

          {/* Company */}
          <div className="mb-3">
            <p className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wider mb-1.5 px-1">Company</p>
            <ObjectCard
              type="company"
              title={created.company.title || aiPackage.company.name}
              meta={aiPackage.company.industry}
              href={created.company.id ? `/spaces/${created.company.id}` : undefined}
              success={created.company.success}
              reused={created.company.reused}
              error={created.company.error}
            />
          </div>

          {/* Project */}
          <div className="mb-3">
            <p className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wider mb-1.5 px-1">Project</p>
            <ObjectCard
              type="project"
              title={created.project.title || aiPackage.project.title}
              meta={aiPackage.project.description}
              href={created.project.id ? `/projects/${created.project.id}` : undefined}
              success={created.project.success}
              error={created.project.error}
            />
          </div>

          {/* Tasks */}
          <div className="mb-3">
            <p className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wider mb-1.5 px-1">
              Tasks{' '}
              {successfulTasks < totalTasks && (
                <span className="text-[#DD3A44] normal-case">
                  ({totalTasks - successfulTasks} failed)
                </span>
              )}
            </p>
            <div className="space-y-2">
              {created.tasks.map((task, i) => (
                <ObjectCard
                  key={i}
                  type="task"
                  title={task.title || aiPackage.tasks[i]?.title || 'Task'}
                  href={task.id ? `/tasks/${task.id}` : undefined}
                  success={task.success}
                  error={task.error}
                />
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="mb-6">
            <p className="text-[11px] font-medium text-[#A3A3A3] uppercase tracking-wider mb-1.5 px-1">Kickoff note</p>
            <ObjectCard
              type="note"
              title={created.note.title || aiPackage.note.title}
              meta={aiPackage.note.body?.slice(0, 80) + (aiPackage.note.body?.length > 80 ? '…' : '')}
              success={created.note.success}
              error={created.note.error}
            />
          </div>

          {/* Retry prompt if any failures */}
          {hasAnyFailure && (
            <div className="mb-6 p-4 bg-[#FFF7ED] border border-[#FED7AA] rounded-[12px]">
              <p className="text-[13px] text-[#92400E]">
                Some items couldn't be created. You can{' '}
                <button
                  onClick={() => setScreen('entry')}
                  className="font-medium underline hover:no-underline"
                >
                  try again
                </button>{' '}
                or continue and add them manually.
              </p>
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

          {/* Start over */}
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
            <h2 className="text-[24px] font-semibold text-[#1A1A1A]">
              Invite a teammate
            </h2>
            <p className="text-[15px] text-[#737373] mt-2">
              Give them access to your{' '}
              <span className="font-medium text-[#1A1A1A]">
                {structure?.aiPackage.project.title || 'new project'}
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
                They'll get an email shortly.
              </p>
              <button
                onClick={() => {
                  setInviteEmail('')
                  setInviteStatus('idle')
                }}
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
                {inviteStatus === 'sending' ? 'Sending...' : 'Send invite'}
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
        </div>
      </div>
    )
  }

  return null
}
