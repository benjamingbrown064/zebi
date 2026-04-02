'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/lib/use-workspace'

export default function ManagersNote() {
  const { workspaceId } = useWorkspace()
  const [note, setNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) return
    fetchNote()
  }, [workspaceId])

  const fetchNote = async () => {
    try {
      const res = await fetch('/api/dashboard/managers-note')
      const data = await res.json()
      setNote(data.note || 'Your workspace is ready. Plan your day and keep priorities clear.')
    } catch {
      setNote('Your workspace is ready. Plan your day and keep priorities clear.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded p-5 animate-pulse" style={{ boxShadow: '0px 20px 40px rgba(0,0,0,0.04)' }}>
        <div className="h-3 bg-[#F3F3F3] rounded w-1/5 mb-3" />
        <div className="h-3 bg-[#F3F3F3] rounded w-full mb-2" />
        <div className="h-3 bg-[#F3F3F3] rounded w-4/5" />
      </div>
    )
  }

  if (!note) return null

  return (
    <div className="bg-white rounded p-5" style={{ boxShadow: '0px 20px 40px rgba(0,0,0,0.04)' }}>
      <div className="flex items-start gap-4">
        {/* Inverted tile — Monolith editorial accent */}
        <div className="w-8 h-8 rounded flex-shrink-0 mt-0.5 flex items-center justify-center text-[11px] font-bold text-white bg-[#1A1C1C]">
          Z
        </div>
        <div className="flex-1">
          <p className="label-sm mb-2">Manager's Note</p>
          <p className="text-[14px] text-[#1A1C1C] leading-relaxed">{note}</p>
        </div>
      </div>
    </div>
  )
}
