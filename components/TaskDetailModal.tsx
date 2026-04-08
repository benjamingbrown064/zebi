'use client'

import { useState, useEffect } from 'react'
import { FaTimes, FaTrash, FaShareAlt } from 'react-icons/fa'
import { Task } from '@/app/actions/tasks'
import TaskComments from './TaskComments'
import ShareModal from './ShareModal'
import RichTextEditor from './RichTextEditor'
import AITidyMenu from './AITidyMenu'
import AITidyPreviewModal from './AITidyPreviewModal'
import FileUpload from './FileUpload'
import TaskOutcomeFields from './TaskOutcomeFields'
import TaskAgentFields, { AgentFieldValues } from './TaskAgentFields'
import TaskHandoffPanel from './TaskHandoffPanel'
import TaskSkillPanel from './TaskSkillPanel'
import TaskSkillEvaluationModal from './TaskSkillEvaluationModal'
import TaskDependencyPanel from './TaskDependencyPanel'
import { tidyDescription, TidyMode } from '@/app/actions/ai-tidy'

// ─── Copy Link Button ─────────────────────────────────────────────────────────
function CopyLinkButton({ taskId }: { taskId: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const url = `${window.location.origin}/tasks?task=${taskId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy link to task"
      className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] border rounded transition ${
        copied
          ? 'border-[#1A1C1C] bg-[#1A1C1C] text-white'
          : 'border-[#C6C6C6] text-[#474747] hover:border-[#1A1C1C] hover:text-[#1A1C1C] bg-white'
      }`}
      style={{ borderRadius: 2 }}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Copy Link
        </>
      )}
    </button>
  )
}

interface TaskDetailModalProps {
  isOpen: boolean
  onClose: () => void
  task?: Task & { goalTag?: string }
  onUpdate?: (taskId: string, updates: Partial<Task>) => void
  onDelete?: (taskId: string) => void
  workspaceId?: string
  userId?: string
  userName?: string
  statuses?: Array<{ id: string; name: string; type: string }>
}

const PRIORITIES = [
  { num: 1, label: 'P1 - Urgent', color: 'bg-red-100 text-red-700' },
  { num: 2, label: 'P2 - High', color: 'bg-orange-100 text-orange-700' },
  { num: 3, label: 'P3 - Medium', color: 'bg-yellow-100 text-yellow-700' },
  { num: 4, label: 'P4 - Low', color: 'bg-[#F3F3F3] text-[#474747]' },
]

const STATUS_COLORS: Record<string, string> = {
  inbox: 'bg-[#F3F3F3] text-[#474747]',
  planned: 'bg-[#F3F3F3] text-[#474747]',
  doing: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-[#1A1A1A] text-white',
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onUpdate,
  onDelete,
  workspaceId,
  userId,
  userName = 'You',
  statuses = [],
}: TaskDetailModalProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState(3)
  const [statusId, setStatusId] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Phase 2: Outcome fields
  const [expectedOutcome, setExpectedOutcome] = useState<string | null>(null)
  const [completionNote, setCompletionNote] = useState<string | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)

  // Dependencies
  const [dependencyIds, setDependencyIds] = useState<string[]>([])

  // Skill linking
  const [skillId, setSkillId] = useState<string | null>(null)
  const [showEvalModal, setShowEvalModal] = useState(false)
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)

  // Multi-agent OS fields
  const [agentFields, setAgentFields] = useState<AgentFieldValues>({
    ownerAgent:       null,
    reviewerAgent:    null,
    handoffToAgent:   null,
    requestedBy:      null,
    taskType:         null,
    decisionNeeded:   false,
    decisionSummary:  null,
    waitingOn:        null,
    blockedReason:    null,
    definitionOfDone: null,
    nextAction:       null,
  })

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // AI Tidy state
  const [isAITidyMenuOpen, setIsAITidyMenuOpen] = useState(false)
  const [isAITidyPreviewOpen, setIsAITidyPreviewOpen] = useState(false)
  const [aiTidyResult, setAiTidyResult] = useState<{
    original: string
    rewritten: string
    mode: TidyMode
  } | null>(null)
  const [isAITidyLoading, setIsAITidyLoading] = useState(false)
  const [aiTidyError, setAiTidyError] = useState<string | null>(null)

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([])

  // Load attachments when task changes
  useEffect(() => {
    if (task?.id && workspaceId) {
      fetch(`/api/attachments?taskId=${task.id}&workspaceId=${workspaceId}`)
        .then(res => res.json())
        .then(data => setAttachments(data.attachments || []))
        .catch(err => console.error('Failed to load attachments:', err))
    } else {
      setAttachments([])
    }
  }, [task?.id, workspaceId])

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setPriority(task.priority || 3)
      setStatusId(task.statusId || '')
      // Use the actual description value from task, or empty string if not present
      const taskDescription = task.description || ''
      setDescription(taskDescription)
      setDueDate(task.dueAt ? (typeof task.dueAt === 'string' ? task.dueAt.split('T')[0] : new Date(task.dueAt).toISOString().split('T')[0]) : '')
      setAssigneeId(task.assigneeId || null)
      
      // Phase 2: Load outcome fields
      setExpectedOutcome((task as any).expectedOutcome || null)
      setCompletionNote((task as any).completionNote || null)
      setOutputUrl((task as any).outputUrl || null)

      // Dependencies
      setDependencyIds((task as any).dependencyIds || [])

      // Skill linking
      setSkillId((task as any).skillId || null)

      // Multi-agent OS fields
      setAgentFields({
        ownerAgent:       (task as any).ownerAgent       ?? null,
        reviewerAgent:    (task as any).reviewerAgent    ?? null,
        handoffToAgent:   (task as any).handoffToAgent   ?? null,
        requestedBy:      (task as any).requestedBy      ?? null,
        taskType:         (task as any).taskType         ?? null,
        decisionNeeded:   (task as any).decisionNeeded   ?? false,
        decisionSummary:  (task as any).decisionSummary  ?? null,
        waitingOn:        (task as any).waitingOn        ?? null,
        blockedReason:    (task as any).blockedReason    ?? null,
        definitionOfDone: (task as any).definitionOfDone ?? null,
        nextAction:       (task as any).nextAction       ?? null,
      })
      
      console.log(`[TaskDetailModal] Task ${task.id} loaded. Description: "${taskDescription.substring(0, 30)}${taskDescription.length > 30 ? '...' : ''}"`)
    } else {
      // Reset all form fields when no task is selected
      setTitle('')
      setPriority(3)
      setStatusId('')
      setDescription('')
      setDueDate('')
      setAssigneeId(null)
      
      // Phase 2: Reset outcome fields
      setExpectedOutcome(null)
      setCompletionNote(null)
      setOutputUrl(null)

      // Dependencies
      setDependencyIds([])

      // Skill linking
      setSkillId(null)

      // Multi-agent OS fields reset
      setAgentFields({
        ownerAgent: null, reviewerAgent: null, handoffToAgent: null,
        requestedBy: null, taskType: null, decisionNeeded: false,
        decisionSummary: null, waitingOn: null, blockedReason: null,
        definitionOfDone: null, nextAction: null,
      })
    }
  }, [task?.id])

  if (!isOpen) return null

  // Phase 2: Determine when to show outcome fields
  const isHighPriority = priority <= 2
  const isLinkedToObjective = !!(task as any)?.objectiveId
  const isAIAssigned = !!(task as any)?.botAssignee
  const isCompleted = !!task?.completedAt
  const showOutcomeFields = isHighPriority || isLinkedToObjective || isAIAssigned || isCompleted

  const handleSave = () => {
    if (!task) return

    const updates: Partial<Task> = {
      title,
      priority,
      statusId,
      description: description || undefined,
      dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
      assigneeId: assigneeId || undefined,
      // Phase 2: Include outcome fields when they should be shown
      ...(showOutcomeFields ? {
        expectedOutcome: expectedOutcome || undefined,
        completionNote: completionNote || undefined,
        outputUrl: outputUrl || undefined,
      } : {}),
      // Multi-agent OS fields (always save)
      ...agentFields,
      // Dependencies
      dependencyIds,
      // Skill linking
      skillId: skillId || undefined,
    }

    onUpdate?.(task.id, updates)
    onClose()
  }

  // Called when evaluation is submitted or skipped from eval modal
  const handleEvaluationComplete = (skipped: boolean, skipReason?: string) => {
    setShowEvalModal(false)
    if (pendingStatusId) {
      setStatusId(pendingStatusId)
      setPendingStatusId(null)
      // Save immediately with new status + skip info if applicable
      if (task && workspaceId) {
        fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            statusId: pendingStatusId,
            ...(skipped ? { skipEvaluation: true, skipEvaluationReason: skipReason } : {}),
          }),
        }).catch(err => console.error('Failed to update task status:', err))
      }
    }
  }

  const handleDelete = () => {
    if (!task) return
    if (confirm('Are you sure you want to delete this task?')) {
      onDelete?.(task.id)
      onClose()
    }
  }

  const handleAITidy = async (mode: TidyMode) => {
    if (!description.trim()) {
      setAiTidyError('Description cannot be empty')
      return
    }

    setIsAITidyLoading(true)
    setAiTidyError(null)

    try {
      const result = await tidyDescription(description, mode)
      setAiTidyResult(result)
      setIsAITidyPreviewOpen(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to tidy description'
      setAiTidyError(errorMessage)
      console.error('AI tidy error:', error)
    } finally {
      setIsAITidyLoading(false)
    }
  }

  const handleAITidyAccept = (rewrittenText: string) => {
    setDescription(rewrittenText)
    setAiTidyResult(null)
    setIsAITidyPreviewOpen(false)
    
    // Auto-save immediately after accepting changes
    setTimeout(() => {
      if (!task) return
      const updates: Partial<Task> = {
        title,
        priority,
        statusId,
        description: rewrittenText || undefined,
        dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
      }
      onUpdate?.(task.id, updates)
    }, 100)
  }

return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_24px_48px_rgba(0,0,0,0.12)]" style={{ borderRadius: 2 }}>

        {/* ── Top header ── */}
        <div className="px-8 pt-6 pb-5 border-b border-[#E8E8E8]">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-2">
                {task?.id ? `TASK · ${task.id.slice(0, 8).toUpperCase()}` : 'NEW TASK'}
              </p>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="w-full text-[22px] font-bold text-[#1A1C1C] uppercase tracking-tight bg-transparent border-none outline-none placeholder:text-[#C6C6C6]"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {task?.id && (
                <CopyLinkButton taskId={task.id} />
              )}
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-[#1A1C1C] text-white text-[12px] font-semibold uppercase tracking-[0.08em] hover:bg-[#333] transition"
                style={{ borderRadius: 2 }}
              >
                Save Task
              </button>
              <button onClick={onClose} className="p-2 text-[#A3A3A3] hover:text-[#1A1C1C] transition">
                <FaTimes />
              </button>
            </div>
          </div>

          {/* Meta bar */}
          <div className="grid grid-cols-4 gap-0 border border-[#E8E8E8]" style={{ borderRadius: 2 }}>
            {/* Priority */}
            <div className="px-5 py-3 border-r border-[#E8E8E8]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-1">Priority</p>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="text-[13px] font-bold text-[#1A1C1C] bg-transparent border-none outline-none cursor-pointer uppercase tracking-wide w-full"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.num} value={p.num}>{p.label.split(' - ')[1]?.toUpperCase() ?? p.label}</option>
                ))}
              </select>
            </div>
            {/* Status */}
            <div className="px-5 py-3 border-r border-[#E8E8E8]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-1">Status</p>
              {statuses.length > 0 ? (
                <select
                  value={statusId}
                  onChange={(e) => {
                    const newStatusId = e.target.value
                    const newStatus = statuses.find(s => s.id === newStatusId)
                    if (newStatus?.name?.toLowerCase() === 'review' && skillId && task) {
                      setPendingStatusId(newStatusId)
                      setShowEvalModal(true)
                    } else {
                      setStatusId(newStatusId)
                    }
                  }}
                  className="text-[13px] font-bold text-[#1A1C1C] bg-transparent border-none outline-none cursor-pointer uppercase tracking-wide w-full"
                >
                  <option value="">— Select —</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                  ))}
                </select>
              ) : (
                <span className="text-[13px] font-bold text-[#A3A3A3]">—</span>
              )}
            </div>
            {/* Due Date */}
            <div className="px-5 py-3 border-r border-[#E8E8E8]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-1">Due Date</p>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-[13px] font-bold text-[#1A1C1C] bg-transparent border-none outline-none cursor-pointer uppercase tracking-wide w-full"
              />
            </div>
            {/* Owner */}
            <div className="px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3] mb-1">Owner</p>
              <select
                value={agentFields.ownerAgent || ''}
                onChange={(e) => {
                  const updated = { ...agentFields, ownerAgent: e.target.value || null }
                  setAgentFields(updated)
                  if (task && workspaceId) {
                    fetch(`/api/tasks/${task.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ownerAgent: e.target.value || null, workspaceId }),
                    }).catch(() => {})
                  }
                }}
                className="text-[13px] font-bold text-[#1A1C1C] bg-transparent border-none outline-none cursor-pointer uppercase tracking-wide w-full"
              >
                <option value="">Unassigned</option>
                <option value="harvey">Harvey</option>
                <option value="theo">Theo</option>
                <option value="doug">Doug</option>
                <option value="casper">Casper</option>
                <option value="ben">Ben</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Body — two column ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-full">

            {/* Left: main content */}
            <div className="lg:col-span-2 px-8 py-6 space-y-7 border-r border-[#E8E8E8]">

              {/* Description */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-3">Description</p>
                <div className="relative">
                  <RichTextEditor
                    key={`editor-${task?.id}`}
                    value={description}
                    onChange={setDescription}
                    onAITidyClick={() => setIsAITidyMenuOpen(!isAITidyMenuOpen)}
                    placeholder="Describe this task..."
                  />
                  {isAITidyMenuOpen && (
                    <AITidyMenu
                      isOpen={isAITidyMenuOpen}
                      onClose={() => setIsAITidyMenuOpen(false)}
                      onSelect={handleAITidy}
                      isLoading={isAITidyLoading}
                    />
                  )}
                </div>
                {aiTidyError && <p className="mt-2 text-sm text-red-600">{aiTidyError}</p>}
              </div>

              {/* Expected Outcome */}
              {(showOutcomeFields || expectedOutcome) && task && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-3">Expected Outcome</p>
                  <textarea
                    value={expectedOutcome || ''}
                    onChange={e => {
                      setExpectedOutcome(e.target.value)
                      if (task && workspaceId) {
                        fetch(`/api/tasks/${task.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ expectedOutcome: e.target.value, workspaceId }),
                        }).catch(() => {})
                      }
                    }}
                    rows={3}
                    placeholder="What does success look like?"
                    className="w-full text-[13px] text-[#1A1C1C] bg-[#F9F9F9] border border-[#E8E8E8] px-3 py-2.5 outline-none focus:border-[#1A1C1C] resize-none"
                    style={{ borderRadius: 2 }}
                  />
                </div>
              )}

              {/* Completion Note */}
              {(isCompleted || completionNote) && task && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-3">Result</p>
                  <div className="border-l-2 border-[#1A1C1C] pl-4 py-1">
                    <textarea
                      value={completionNote || ''}
                      onChange={e => {
                        setCompletionNote(e.target.value)
                        if (task && workspaceId) {
                          fetch(`/api/tasks/${task.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ completionNote: e.target.value, workspaceId }),
                          }).catch(() => {})
                        }
                      }}
                      rows={3}
                      placeholder="What was completed?"
                      className="w-full text-[13px] text-[#1A1C1C] bg-transparent border-none outline-none resize-none"
                    />
                    {outputUrl && (
                      <a href={outputUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1A1C1C] underline hover:text-[#474747] mt-1 block">
                        Access Output →
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Dependencies */}
              {task && workspaceId && (
                <TaskDependencyPanel
                  workspaceId={workspaceId}
                  taskId={task.id}
                  dependencyIds={dependencyIds}
                  dependencies={(task as any).dependencies}
                  onChange={(ids) => {
                    setDependencyIds(ids)
                    fetch(`/api/tasks/${task.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ workspaceId, dependencyIds: ids }),
                    }).catch(() => {})
                  }}
                />
              )}

              {/* Skill */}
              {task && workspaceId && (
                <TaskSkillPanel
                  workspaceId={workspaceId}
                  skillId={skillId}
                  onSkillChange={(id) => {
                    setSkillId(id)
                    fetch(`/api/tasks/${task.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ workspaceId, skillId: id || null }),
                    }).catch(() => {})
                  }}
                />
              )}

              {/* Agent & Workflow */}
              {task && (
                <TaskAgentFields
                  values={agentFields}
                  onChange={values => {
                    setAgentFields(values)
                    if (workspaceId) {
                      fetch(`/api/tasks/${task.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...values, workspaceId }),
                      }).catch(() => {})
                    }
                  }}
                />
              )}

              {/* Handoff panel */}
              {task && workspaceId && (
                <TaskHandoffPanel
                  taskId={task.id}
                  workspaceId={workspaceId}
                  ownerAgent={agentFields.ownerAgent}
                />
              )}
            </div>

            {/* Right: sidebar */}
            <div className="px-6 py-6 space-y-6 bg-[#F9F9F9]">

              {/* Attachments */}
              {task && workspaceId && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-3">Attachments</p>
                  <FileUpload
                    taskId={task.id}
                    workspaceId={workspaceId}
                    attachments={attachments}
                    onUploadComplete={(attachment) => setAttachments([...attachments, attachment])}
                    onDelete={(attachmentId) => setAttachments(attachments.filter(a => a.id !== attachmentId))}
                  />
                </div>
              )}

              {/* Comments / Activity */}
              {task && workspaceId && userId && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-3">Activity Ledger</p>
                  <TaskComments
                    taskId={task.id}
                    workspaceId={workspaceId}
                    userId={userId}
                    userName={userName}
                  />
                </div>
              )}

              {/* Footer actions */}
              <div className="pt-4 border-t border-[#E8E8E8] flex flex-col gap-2">
                <button
                  onClick={handleDelete}
                  className="w-full py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-red-500 hover:bg-red-50 border border-red-200 transition"
                  style={{ borderRadius: 2 }}
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {task && workspaceId && userId && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          taskId={task.id}
          taskTitle={task.title}
          workspaceId={workspaceId}
          userId={userId}
        />
      )}

      {/* AI Tidy Preview Modal */}
      {aiTidyResult && (
        <AITidyPreviewModal
          isOpen={isAITidyPreviewOpen}
          onClose={() => { setIsAITidyPreviewOpen(false); setAiTidyResult(null) }}
          original={aiTidyResult.original}
          rewritten={aiTidyResult.rewritten}
          mode={aiTidyResult.mode}
          onAccept={handleAITidyAccept}
          isLoading={isAITidyLoading}
        />
      )}

      {/* Skill Evaluation Modal */}
      {showEvalModal && task && skillId && workspaceId && (
        <TaskSkillEvaluationModal
          isOpen={showEvalModal}
          onClose={() => { setShowEvalModal(false); setPendingStatusId(null) }}
          onSubmit={(_evalData, skipped, skipReason) => handleEvaluationComplete(skipped, skipReason)}
          skillId={skillId}
          taskId={task.id}
          workspaceId={workspaceId}
          agentId={(agentFields.ownerAgent as string) || 'doug'}
        />
      )}
    </div>
  )
}