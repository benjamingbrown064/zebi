'use client'

import { useState } from 'react'
import { FaPlus, FaMicrophone } from 'react-icons/fa'
import Sidebar from '@/components/Sidebar'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import VoiceCoachModal from '@/components/voice-coach/VoiceCoachModal'
import { createGoal, updateGoal, deleteGoal } from '@/app/actions/goals'
import { useRouter } from 'next/navigation'
import { GoalsProvider } from './goals-context'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

interface GoalsClientWrapperProps {
  workspaceId: string
  children: React.ReactNode
}

export default function GoalsClientWrapper({ workspaceId, children }: GoalsClientWrapperProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isVoiceCoachOpen, setIsVoiceCoachOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<any | null>(null)
  const [newGoal, setNewGoal] = useState<{
    name: string
    targetValue: number
    unit: string
    endDate: string
    metricType: 'numeric' | 'currency' | 'percentage'
  }>({
    name: '',
    targetValue: 100,
    unit: '%',
    endDate: '',
    metricType: 'numeric',
  })

  const handleSaveGoal = async () => {
    if (!newGoal.name || !newGoal.endDate) {
      alert('Name and due date are required')
      return
    }

    setIsSaving(true)
    try {
      if (editingGoal) {
        const updated = await updateGoal(workspaceId, editingGoal.id, {
          name: newGoal.name,
          targetValue: newGoal.targetValue,
          unit: newGoal.unit,
          endDate: newGoal.endDate,
          metricType: newGoal.metricType,
        })

        if (updated) {
          setEditingGoal(null)
          setIsAdding(false)
          router.refresh() // Refresh server component data
        } else {
          alert('Failed to update goal')
        }
      } else {
        const created = await createGoal(workspaceId, PLACEHOLDER_USER_ID, {
          name: newGoal.name,
          targetValue: newGoal.targetValue,
          currentValue: 0,
          unit: newGoal.unit,
          endDate: newGoal.endDate,
          metricType: newGoal.metricType,
        })

        if (created) {
          setIsAdding(false)
          router.refresh() // Refresh server component data
        } else {
          alert('Failed to create goal')
        }
      }
      
      setNewGoal({
        name: '',
        targetValue: 100,
        unit: '%',
        endDate: '',
        metricType: 'numeric',
      })
    } catch (err) {
      console.error('Error saving goal:', err)
      alert(`Error saving goal: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      const success = await deleteGoal(workspaceId, id)
      if (success) {
        router.refresh() // Refresh server component data
      } else {
        alert('Failed to delete goal')
      }
    } catch (err) {
      console.error('Error deleting goal:', err)
      alert('Error deleting goal')
    }
  }

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal)
    setNewGoal({
      name: goal.name,
      targetValue: Number(goal.targetValue),
      unit: goal.unit || '%',
      endDate: goal.endDate ? new Date(goal.endDate).toISOString().split('T')[0] : '',
      metricType: (goal.metricType || 'numeric') as 'numeric' | 'currency' | 'percentage',
    })
    setIsAdding(true)
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={false}
        onCollapsedChange={() => {}}
      />
      <div className="md:ml-64 flex flex-col">
      <ResponsiveHeader
        title="Goals"
        subtitle="Track your long-term objectives"
        primaryAction={
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setIsVoiceCoachOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#e0dbdb] hover:bg-[#d4cecd] text-[#1c1b1b]  rounded font-medium text-[13px] transition-colors min-h-[44px]"
            >
              <FaMicrophone className="text-sm" />
              <span className="hidden sm:inline">Voice Coach</span>
              <span className="sm:hidden">Voice</span>
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded font-medium text-[13px] transition-colors min-h-[44px]"
            >
              <FaPlus className="text-sm" />
              <span className="hidden sm:inline">Add Goal</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        }
      />

      <div className="px-6 py-6 md:px-8 md:py-12">
        <GoalsProvider onEdit={handleEditGoal} onDelete={handleDeleteGoal}>
          {children}
        </GoalsProvider>
      </div>

      {/* Add/Edit Goal Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-12 md:pt-20 px-4 overflow-y-auto">
          <div 
            className="bg-white w-full max-w-lg rounded shadow-[0_20px_40px_rgba(28,27,27,0.06)] p-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">
              {editingGoal ? 'Edit Goal' : 'Add New Goal'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="w-full px-4 py-2.5  rounded focus:ring-2 focus:ring-[#DD3A44] focus:border-transparent text-[15px] min-h-[44px]"
                  placeholder="e.g., Reach £100k revenue"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Target Value
                  </label>
                  <input
                    type="number"
                    value={newGoal.targetValue}
                    onChange={(e) => setNewGoal({ ...newGoal, targetValue: Number(e.target.value) })}
                    className="w-full px-4 py-2.5  rounded focus:ring-2 focus:ring-[#DD3A44] focus:border-transparent text-[15px] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newGoal.unit}
                    onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                    className="w-full px-4 py-2.5  rounded focus:ring-2 focus:ring-[#DD3A44] focus:border-transparent text-[15px] min-h-[44px]"
                    placeholder="%"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newGoal.endDate}
                  onChange={(e) => setNewGoal({ ...newGoal, endDate: e.target.value })}
                  className="w-full px-4 py-2.5  rounded focus:ring-2 focus:ring-[#DD3A44] focus:border-transparent text-[15px] min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsAdding(false)
                  setEditingGoal(null)
                  setNewGoal({
                    name: '',
                    targetValue: 100,
                    unit: '%',
                    endDate: '',
                    metricType: 'numeric',
                  })
                }}
                className="flex-1 px-4 py-2.5 bg-[#F5F5F5] text-[#525252] rounded hover:bg-[#E5E5E5] transition font-medium min-h-[44px]"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoal}
                className="flex-1 px-4 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded transition font-medium disabled:opacity-50 min-h-[44px]"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : editingGoal ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Coach Modal */}
      <VoiceCoachModal
        isOpen={isVoiceCoachOpen}
        onClose={() => setIsVoiceCoachOpen(false)}
        onSuccess={(goalId) => {
          console.log('Voice coach created goal:', goalId)
          router.refresh()
        }}
      />
      </div>
    </div>
  )
}
