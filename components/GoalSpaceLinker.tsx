'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaLink, FaUnlink } from 'react-icons/fa'
import { linkSpacesToGoal, getLinkedSpaces } from '@/app/actions/goals'

// Shared "linked item" row component
function LinkedItem({ title, subtitle, href }: { title: string; subtitle?: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between py-3 px-4 bg-[#F9F9F9] rounded hover:bg-[#F3F3F3] transition-colors">
      <div>
        <p className="text-[13px] font-medium text-[#1A1A1A]">{title}</p>
        {subtitle && <p className="text-[11px] text-[#A3A3A3] mt-0.5">{subtitle}</p>}
      </div>
      <svg className="w-3.5 h-3.5 text-[#C6C6C6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </Link>
  )
}

interface Space {
  id: string
  name: string
  revenue: number | null
}

interface GoalSpaceLinkerProps {
  goalId: string
  workspaceId: string
  isFinancial: boolean
  onUpdate?: () => void
}

export default function GoalSpaceLinker({
  goalId,
  workspaceId,
  isFinancial,
  onUpdate,
}: GoalSpaceLinkerProps) {
  const [linkedSpaces, setLinkedSpaces] = useState<Space[]>([])
  const [allSpaces, setAllSpaces] = useState<Space[]>([])
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load data when modal opens
  useEffect(() => {
    if (!isOpen) return
    loadData()
  }, [isOpen])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load all spaces
      const spacesRes = await fetch(`/api/spaces?workspaceId=${workspaceId}`)
      if (spacesRes.ok) {
        const spaces = await spacesRes.json()
        setAllSpaces(spaces)
      }

      // Load linked spaces
      const spaces = await getLinkedSpaces(workspaceId, goalId)
      setLinkedSpaces(spaces)
      setSelectedSpaces(spaces.map(c => c.id))
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleSpace = (companyId: string) => {
    setSelectedSpaces(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await linkSpacesToGoal(workspaceId, goalId, selectedSpaces)
      setIsOpen(false)
      onUpdate?.()
    } catch (err) {
      console.error('Failed to link spaces:', err)
      alert('Failed to link spaces')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isFinancial) {
    return null
  }

  const totalRevenue = linkedSpaces.reduce((sum, s) => sum + (Number(s.revenue) || 0), 0)

  return (
    <div className="bg-white rounded p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">Linked Spaces</h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-[13px] px-3 py-1.5 bg-[#000000] text-white rounded hover:opacity-90 transition inline-flex items-center gap-2"
        >
          <FaLink className="text-xs" />
          {linkedSpaces.length > 0 ? 'Manage' : 'Add'} Spaces
        </button>
      </div>

      {/* Display linked spaces */}
      {linkedSpaces.length > 0 ? (
        <>
          <div className="space-y-2 mb-4">
            {linkedSpaces.map(space => (
              <LinkedItem
                key={space.id}
                title={space.name}
                subtitle={space.revenue ? `£${(Number(space.revenue) / 1000).toFixed(1)}k MRR` : '—'}
                href={`/spaces/${space.id}`}
              />
            ))}
          </div>
          <div className="pt-4 border-t border-[#E5E5E5]">
            <p className="text-[11px] text-[#A3A3A3] mb-1">Total Revenue</p>
            <p className="text-[20px] font-medium text-[#1A1A1A]">
              {totalRevenue > 0 ? `£${(totalRevenue / 1000).toFixed(1)}k MRR` : '—'}
            </p>
          </div>
        </>
      ) : (
        <p className="text-[13px] text-[#A3A3A3] py-4">No spaces linked yet</p>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-xl w-full max-w-md mx-4 p-6">
            <h4 className="font-semibold text-[#1A1A1A] mb-4">Link Spaces to Goal</h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[400px] overflow-y-auto mb-6">
                  {allSpaces.length === 0 ? (
                    <p className="text-[13px] text-[#A3A3A3] py-4">No spaces available</p>
                  ) : (
                    allSpaces.map(space => (
                      <label
                        key={space.id}
                        className="flex items-center gap-3 p-3 rounded  cursor-pointer hover:bg-[#F3F3F3] transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSpaces.includes(space.id)}
                          onChange={() => handleToggleSpace(space.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#1A1A1A]">{space.name}</p>
                          <p className="text-[12px] text-[#525252]">
                            £{(space.revenue || 0).toLocaleString()}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                {/* Preview total */}
                {selectedSpaces.length > 0 && (
                  <div className="bg-[#F3F3F3] p-4 rounded mb-6">
                    <p className="text-[12px] text-[#525252] mb-2">Total Revenue Preview:</p>
                    <p className="text-xl font-bold text-[#1A1C1C]">
                      £{totalRevenue.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2  rounded text-[13px] font-medium text-[#525252] hover:bg-[#F3F3F3] transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-[#000000] text-white rounded text-[13px] font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
