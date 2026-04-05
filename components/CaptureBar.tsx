'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useWorkspace } from '@/lib/use-workspace'

interface CaptureBarProps {
  onCaptured?: () => void
  spaceId?: string
}

export default function CaptureBar({ onCaptured, spaceId }: CaptureBarProps) {
  const { workspaceId } = useWorkspace()
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }, [])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = value.trim()
    if (!text || !workspaceId || saving) return

    setSaving(true)
    setValue('')

    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          rawText: text,
          sourceType: 'capture_bar',
          spaceId,
        }),
      })

      if (res.ok) {
        showToast('Captured — AI is routing it now')
        onCaptured?.()
      } else {
        // Fallback: try creating a task directly
        const taskRes = await fetch('/api/tasks/direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            title: text,
            priority: 3,
          }),
        })
        if (taskRes.ok) {
          showToast('Added to your queue')
          onCaptured?.()
        } else {
          showToast('Could not save — try again')
          setValue(text) // restore input
        }
      }
    } catch {
      showToast('Could not save — check connection')
      setValue(text)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      inputRef.current?.blur()
      setFocused(false)
    }
  }

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`
            flex items-center gap-3 bg-white border rounded px-4 py-2.5 transition-all duration-150
            ${focused
              ? 'border-[#1A1A1A] shadow-[0_0_0_3px_rgba(26,26,26,0.08)]'
              : 'border-[#E5E5E5] shadow-sm hover:border-[#C6C6C6]'
            }
          `}
        >
          {/* Icon */}
          <svg
            className={`w-4 h-4 flex-shrink-0 transition-colors ${focused ? 'text-[#1A1A1A]' : 'text-[#A3A3A3]'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Capture anything… task, idea, note — AI routes it (⌘K)"
            className="flex-1 bg-transparent text-[14px] text-[#1A1A1A] placeholder-[#A3A3A3] outline-none min-w-0"
            disabled={saving}
          />

          {/* Shortcut hint or loading */}
          {saving ? (
            <div className="flex-shrink-0 w-4 h-4 border-2 border-[#A3A3A3] border-t-transparent rounded-full animate-spin" />
          ) : value ? (
            <button
              type="submit"
              className="flex-shrink-0 text-[12px] font-medium text-white bg-[#1A1A1A] hover:bg-[#333] px-2.5 py-1 rounded-md transition-colors"
            >
              Add
            </button>
          ) : (
            <span className="flex-shrink-0 text-[11px] text-[#C6C6C6] font-mono hidden sm:block">⌘K</span>
          )}
        </div>
      </form>

      {/* Toast notification */}
      {toast && (
        <div className="absolute top-full mt-2 left-0 right-0 flex justify-center pointer-events-none z-50">
          <div className="bg-[#1A1A1A] text-white text-[13px] px-4 py-2 rounded-md shadow-lg animate-fade-in">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
