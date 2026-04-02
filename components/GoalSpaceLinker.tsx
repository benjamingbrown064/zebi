'use client'

import { useState, useEffect } from 'react'
import { FaLink, FaUnlink, FaSpinner } from 'react-icons/fa'
import { linkSpacesToGoal, getLinkedSpaces } from '@/app/actions/goals'

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

  const totalRevenue = selectedSpaces.reduce((sum, companyId) => {
    const space = allSpaces.find(c => c.id === companyId)
    return sum + (space?.revenue || 0)
  }, 0)

  return (
    <div className="mt-6 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1A1A1A]">Link Spaces</h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-[13px] px-3 py-1.5 bg-[#DD3A44] text-white rounded hover:opacity-90 transition inline-flex items-center gap-2"
        >
          <FaLink className="text-xs" />
          {linkedSpaces.length > 0 ? 'Manage' : 'Add'} Spaces
        </button>
      </div>

      {/* Display linked spaces */}
      {linkedSpaces.length > 0 && (
        <div className="bg-[#F3F3F3] rounded p-4 mb-4">
          <p className="text-[12px] text-[#525252] mb-3">
            {linkedSpaces.length} compan{linkedSpaces.length === 1 ? 'y' : 'ies'} linked
          </p>
          <div className="space-y-2">
            {linkedSpaces.map(space => (
              <div
                key={space.id}
                className="flex items-center justify-between bg-white p-3 rounded "
              >
                <span className="text-[14px] font-medium text-[#1A1A1A]">{space.name}</span>
                <span className="text-[13px] text-[#DD3A44] font-semibold">
                  £{(space.revenue || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4">
            <p className="text-[13px] text-[#525252]">Total Revenue:</p>
            <p className="text-2xl font-bold text-[#DD3A44]">
              £{totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-xl w-full max-w-md mx-4 p-6">
            <h4 className="font-semibold text-[#1A1A1A] mb-4">Link Spaces to Goal</h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <FaSpinner className="animate-spin text-[#DD3A44] text-2xl" />
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
                    <p className="text-xl font-bold text-[#DD3A44]">
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
                    className="flex-1 px-4 py-2 bg-[#DD3A44] text-white rounded text-[13px] font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {isSaving ? (
                      <FaSpinner className="animate-spin inline mr-2" />
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
