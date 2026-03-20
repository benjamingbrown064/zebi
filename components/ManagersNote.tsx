'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/lib/use-workspace'
import { MODE_META, OperatingMode } from '@/lib/operating-mode/detector'

export default function ManagersNote() {
  const { workspaceId } = useWorkspace()
  const [note, setNote] = useState<string | null>(null)
  const [mode, setMode] = useState<OperatingMode>('momentum')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) return
    fetchNote()
  }, [workspaceId])

  const fetchNote = async () => {
    try {
      const res = await fetch('/api/dashboard/managers-note')
      const data = await res.json()
      if (data.note) {
        setNote(data.note)
        setMode(data.mode as OperatingMode)
      }
    } catch (err) {
      console.error('Failed to fetch manager\'s note:', err)
    } finally {
      setLoading(false)
    }
  }

  const meta = MODE_META[mode]

  if (loading) {
    return (
      <div className="bg-white rounded-[14px] p-6 mb-6 animate-pulse">
        <div className="h-4 bg-[#F5F5F5] rounded w-1/4 mb-3" />
        <div className="h-4 bg-[#F5F5F5] rounded w-full mb-2" />
        <div className="h-4 bg-[#F5F5F5] rounded w-3/4" />
      </div>
    )
  }

  if (!note) return null

  return (
    <div
      className="rounded-[14px] p-6 mb-6"
      style={{ backgroundColor: meta.bgColour, border: `1px solid ${meta.borderColour}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-[8px] flex items-center justify-center text-sm flex-shrink-0 mt-0.5 font-bold"
          style={{ backgroundColor: meta.colour, color: '#fff' }}
        >
          Z
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: meta.colour }}>
            Manager's Note · {meta.label} Mode
          </p>
          <p className="text-[14px] text-[#1A1A1A] leading-[1.6]">{note}</p>
        </div>
      </div>
    </div>
  )
}
