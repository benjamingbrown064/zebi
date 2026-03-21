'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/lib/use-workspace'
import { MODE_META, OperatingMode } from '@/lib/operating-mode/detector'

interface ModeData {
  mode: OperatingMode
  setBy: 'auto' | 'manual'
  expiresAt: string | null
  suggested: OperatingMode | null
  reasoning: string | null
}

export default function OperatingModeCard() {
  const { workspaceId } = useWorkspace()
  const [modeData, setModeData] = useState<ModeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOverride, setShowOverride] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!workspaceId) return
    fetchMode()
  }, [workspaceId])

  const fetchMode = async () => {
    try {
      const res = await fetch('/api/workspaces/operating-mode')
      const data = await res.json()
      if (data && data.mode) {
        const validModes: OperatingMode[] = ['pressure', 'plateau', 'momentum', 'drift']
        setModeData({
          ...data,
          mode: validModes.includes(data.mode) ? data.mode : 'momentum',
          suggested: validModes.includes(data.suggested) ? data.suggested : null,
        })
      }
    } catch (err) {
      console.error('Failed to fetch mode:', err)
    } finally {
      setLoading(false)
    }
  }

  const setMode = async (mode: OperatingMode, setBy: 'manual' | 'auto' = 'manual') => {
    setSaving(true)
    try {
      await fetch('/api/workspaces/operating-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, setBy }),
      })
      await fetchMode()
      setShowOverride(false)
    } catch (err) {
      console.error('Failed to set mode:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-[14px] p-5 mb-4 animate-pulse">
        <div className="h-4 bg-[#F5F5F5] rounded w-1/3 mb-2" />
        <div className="h-3 bg-[#F5F5F5] rounded w-2/3" />
      </div>
    )
  }

  if (!modeData) return null

  const meta = MODE_META[modeData.mode] ?? MODE_META['momentum']
  const suggestedMeta = modeData.suggested ? (MODE_META[modeData.suggested] ?? null) : null

  // Format expiry
  const expiryText = modeData.expiresAt
    ? (() => {
        const days = Math.ceil((new Date(modeData.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return days > 1 ? `resets in ${days} days` : 'resets tomorrow'
      })()
    : null

  return (
    <div className="bg-white rounded-[14px] p-5 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: meta.colour }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#1A1A1A]">{meta.label}</span>
              {modeData.setBy === 'manual' && expiryText && (
                <span className="text-[11px] text-[#A3A3A3] bg-[#F5F5F5] px-2 py-0.5 rounded-full">
                  Manual · {expiryText}
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#737373] mt-0.5">{meta.description}</p>
            {modeData.reasoning && (
              <p className="text-[12px] text-[#A3A3A3] mt-1">{modeData.reasoning}</p>
            )}
            <p className="text-[12px] font-medium mt-2" style={{ color: meta.colour }}>
              → {meta.suggestedShift}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowOverride(!showOverride)}
          className="text-[12px] text-[#A3A3A3] hover:text-[#525252] transition-colors px-2 py-1 rounded hover:bg-[#F5F5F5]"
        >
          Change
        </button>
      </div>

      {/* Suggestion pill (only if different from current) */}
      {suggestedMeta && modeData.suggested !== modeData.mode && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] text-[#A3A3A3]">Zebi suggests:</span>
          <button
            onClick={() => setMode(modeData.suggested!, 'manual')}
            className="text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors hover:opacity-80"
            style={{
              color: suggestedMeta.colour,
              borderColor: suggestedMeta.borderColour,
              backgroundColor: suggestedMeta.bgColour,
            }}
          >
            Switch to {suggestedMeta.label}
          </button>
        </div>
      )}

      {/* Mode override panel */}
      {showOverride && (
        <div className="mt-4 pt-4 border-t border-[#F5F5F5]">
          <p className="text-[12px] text-[#737373] mb-3">Set your current operating mode:</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(MODE_META) as OperatingMode[]).map(m => {
              const mm = MODE_META[m]
              const isActive = modeData.mode === m
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  disabled={saving}
                  className="p-3 rounded-[10px] text-left transition-all border-2"
                  style={{
                    backgroundColor: isActive ? mm.bgColour : '#FAFAFA',
                    borderColor: isActive ? mm.colour : '#F0F0F0',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mm.colour }} />
                    <span className="text-[13px] font-medium" style={{ color: isActive ? mm.colour : '#1A1A1A' }}>
                      {mm.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#737373] leading-tight">{mm.description}</p>
                </button>
              )
            })}
          </div>
          {modeData.setBy === 'manual' && (
            <button
              onClick={() => setMode(modeData.suggested || 'momentum', 'auto')}
              className="mt-3 text-[12px] text-[#A3A3A3] hover:text-[#525252] transition-colors"
            >
              Reset to auto-detected mode
            </button>
          )}
        </div>
      )}
    </div>
  )
}
