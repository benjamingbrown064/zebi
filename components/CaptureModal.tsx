'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/lib/use-workspace'

interface CaptureModalProps {
  isOpen: boolean
  onClose: () => void
}

const QUICK_TYPES = [
  { id: 'task',  label: 'Task',  icon: '✓', placeholder: 'Add a task…' },
  { id: 'note',  label: 'Note',  icon: '✎', placeholder: 'Jot a note…' },
  { id: 'idea',  label: 'Idea',  icon: '✦', placeholder: 'Capture an idea…' },
  { id: 'any',   label: 'Let AI decide', icon: '⚡', placeholder: 'Type anything — AI will route it…' },
]

export default function CaptureModal({ isOpen, onClose }: CaptureModalProps) {
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const [value, setValue] = useState('')
  const [type, setType] = useState<string>('any')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setValue('')
      setSaved(false)
      setType('any')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleSubmit = useCallback(async () => {
    const text = value.trim()
    if (!text || !workspaceId || saving) return

    setSaving(true)
    try {
      // Try inbox routing first (AI decides what it is)
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          rawText: text,
          sourceType: type === 'any' ? 'capture_modal' : `capture_${type}`,
          captureType: type,
        }),
      })

      if (!res.ok) {
        // Fallback: create task directly
        await fetch('/api/tasks/direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId, title: text, priority: 3 }),
        })
      }

      setSaved(true)
      setTimeout(() => {
        onClose()
        setSaved(false)
      }, 800)
    } catch {
      setSaving(false)
    }
  }, [value, workspaceId, saving, type, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!isOpen) return null

  const selectedType = QUICK_TYPES.find(t => t.id === type) || QUICK_TYPES[3]

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Type selector */}
        <div className="flex border-b border-[#E5E5E5]">
          {QUICK_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => { setType(t.id); inputRef.current?.focus() }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold transition-colors ${
                type === t.id
                  ? 'bg-[#1A1A1A] text-white'
                  : 'text-[#737373] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]'
              }`}
            >
              <span className="text-[13px]">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-5">
          <textarea
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedType.placeholder}
            rows={3}
            className="w-full text-[15px] text-[#1A1A1A] placeholder-[#A3A3A3] resize-none outline-none leading-relaxed"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E5E5E5] bg-[#F9F9F9]">
          <span className="text-[11px] text-[#A3A3A3]">⌘↵ to save · Esc to close</span>
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || saving}
            className={`px-5 py-2 rounded text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              saved
                ? 'bg-[#22C55E] text-white'
                : 'bg-[#1A1A1A] hover:bg-[#333] text-white'
            }`}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
