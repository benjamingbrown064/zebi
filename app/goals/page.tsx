'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaPlus, FaTrash, FaEdit, FaFlag, FaMicrophone } from 'react-icons/fa'
import Sidebar from '@/components/Sidebar'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import MobileListItem from '@/components/responsive/MobileListItem'
import LoadingScreen from '@/components/LoadingScreen'
import VoiceCoachModal from '@/components/voice-coach/VoiceCoachModal'
import { getGoals, createGoal, updateGoal, deleteGoal, calculateGoalProgress, Goal } from '@/app/actions/goals'
import { useWorkspace } from '@/lib/use-workspace'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

const CURRENCY_SYMBOLS: Record<string, string> = {
  'GBP': '£',
  'USD': '$',
  'EUR': '€',
}

const getCurrencySymbol = (currency?: string): string => {
  if (!currency) return ''
  return CURRENCY_SYMBOLS[currency] || currency
}

export default function GoalsPage() {
  const router = useRouter()
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [loading, setLoading] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [isVoiceCoachOpen, setIsVoiceCoachOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (workspaceLoading || !workspaceId) {
      console.log('Goals page: waiting for workspace', { workspaceLoading, workspaceId });
      return;
    }
    
    async function loadAndRefreshGoals() {
      try {
        console.log('Loading goals for workspace:', workspaceId);
        const timeout = setTimeout(() => {
          setLoading(false)
        }, 2000)
        
        const fetchedGoals = await getGoals(workspaceId!)
        console.log('Fetched goals:', fetchedGoals.length, fetchedGoals);
        clearTimeout(timeout)
        
        // Sort goals alphabetically by name
        const sortedGoals = fetchedGoals.sort((a, b) => a.name.localeCompare(b.name))
        setGoals(sortedGoals)
        setLoading(false)
        
        // Calculate progress for all goals, then update with sorted list
        const updatedGoalsMap = new Map(sortedGoals.map(g => [g.id, g]))
        for (const goal of sortedGoals) {
          try {
            const updated = await calculateGoalProgress(workspaceId!, goal.id)
            if (updated) {
              updatedGoalsMap.set(goal.id, updated)
            }
          } catch (err) {
            console.error(`Failed to recalculate progress for goal ${goal.id}:`, err)
          }
        }
        // Update with sorted results
        const finalGoals = Array.from(updatedGoalsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
        setGoals(finalGoals)
      } catch (err) {
        console.error('Failed to load goals:', err)
        setGoals([])
        setLoading(false)
      }
    }
    
    loadAndRefreshGoals()
    // Don't poll every 5 seconds - it causes bouncing/reordering
    // Users can manually refresh if needed
    return () => {}
  }, [workspaceId, workspaceLoading])

  const handleSaveGoal = async () => {
    if (!newGoal.name || !newGoal.endDate) {
      alert('Name and due date are required')
      return
    }

    setIsSaving(true)
    try {
      if (editingGoal) {
        const updated = await updateGoal(workspaceId!, editingGoal.id, {
          name: newGoal.name,
          targetValue: newGoal.targetValue,
          unit: newGoal.unit,
          endDate: newGoal.endDate,
          metricType: newGoal.metricType,
        })

        if (updated) {
          const updatedGoals = goals.map((g) => (g.id === editingGoal.id ? updated : g)).sort((a, b) => a.name.localeCompare(b.name))
          setGoals(updatedGoals)
          setEditingGoal(null)
          setIsAdding(false)
        } else {
          alert('Failed to update goal')
        }
      } else {
        const created = await createGoal(workspaceId!, PLACEHOLDER_USER_ID, {
          name: newGoal.name,
          targetValue: newGoal.targetValue,
          currentValue: 0,
          unit: newGoal.unit,
          endDate: newGoal.endDate,
          metricType: newGoal.metricType,
        })

        if (created) {
          const newGoalsList = [created, ...goals].sort((a, b) => a.name.localeCompare(b.name))
          setGoals(newGoalsList)
          setIsAdding(false)
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
      const success = await deleteGoal(workspaceId!, id)
      if (success) {
        setGoals(goals.filter((g) => g.id !== id))
      } else {
        alert('Failed to delete goal')
      }
    } catch (err) {
      console.error('Error deleting goal:', err)
      alert('Error deleting goal')
    }
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setNewGoal({
      name: goal.name,
      targetValue: goal.targetValue,
      unit: goal.unit || '%',
      endDate: goal.endDate ? new Date(goal.endDate).toISOString().split('T')[0] : '',
      metricType: (goal.metricType || 'numeric') as 'numeric' | 'currency' | 'percentage',
    })
    setIsAdding(true)
  }

  if (loading) {
    return <LoadingScreen message="Loading goals..." />
  }

  const mainPaddingClass = isMobile ? 'pt-16' : sidebarCollapsed ? 'ml-20' : 'ml-64'

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatValue = (goal: Goal) => {
    if (goal.metricType === 'currency') {
      const symbol = '£'  // Default to GBP symbol for currency type
      return `${symbol}${goal.currentValue.toLocaleString()} / ${symbol}${goal.targetValue.toLocaleString()}`
    }
    return `${goal.currentValue} / ${goal.targetValue} ${goal.unit || ''}`
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className={mainPaddingClass}>
        <ResponsiveHeader
          title="Goals"
          subtitle="Track your long-term objectives"
          primaryAction={
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => setIsVoiceCoachOpen(true)}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-white hover:bg-gray-50 text-[#DD3A44] border border-[#DD3A44] rounded-[10px] font-medium text-[13px] md:text-[15px] transition-colors min-h-[44px]"
              >
                <FaMicrophone className="text-sm" />
                <span className="hidden sm:inline">Voice Coach</span>
                <span className="sm:hidden">Voice</span>
              </button>
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[13px] md:text-[15px] transition-colors min-h-[44px]"
              >
                <FaPlus className="text-sm" />
                <span className="hidden sm:inline">Add Goal</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          }
        />

        <ResponsivePageContainer>
          <div className="py-6 md:py-12">
            {goals.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
                  <FaFlag className="text-[#A3A3A3] text-2xl" />
                </div>
                <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No goals yet</h3>
                <p className="text-[#A3A3A3] mb-6">Create your first goal to get started</p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-6 py-3 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium transition-colors min-h-[44px]"
                >
                  Create First Goal
                </button>
              </div>
            ) : (
              <>
                {/* Mobile: List View */}
                <div className="block md:hidden space-y-3">
                  {goals.map((goal) => {
                    const progress = goal.targetValue > 0 
                      ? Math.round((goal.currentValue / goal.targetValue) * 100)
                      : 0
                    const daysRemaining = goal.endDate 
                      ? Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null

                    return (
                      <MobileListItem
                        key={goal.id}
                        title={goal.name}
                        icon={
                          <div className="w-10 h-10 rounded-[6px] bg-[#FEF2F2] flex items-center justify-center">
                            <FaFlag className="text-[#DD3A44]" />
                          </div>
                        }
                        badge={
                          <span className="px-2 py-1 rounded-[6px] text-[11px] font-semibold bg-blue-100 text-blue-700">
                            {progress}%
                          </span>
                        }
                        metadata={[
                          { label: 'Progress', value: formatValue(goal) },
                          ...(daysRemaining !== null ? [{ 
                            label: 'Due', 
                            value: daysRemaining > 0 
                              ? `${daysRemaining} days` 
                              : daysRemaining === 0 
                              ? 'Today' 
                              : `${Math.abs(daysRemaining)} days overdue`
                          }] : []),
                        ]}
                        onClick={() => router.push(`/goals/${goal.id}`)}
                        actions={
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleEditGoal(goal)
                              }}
                              className="flex-1 px-3 py-2 bg-[#F5F5F5] text-[#525252] rounded-[6px] hover:bg-[#E5E5E5] transition text-[13px] font-medium min-h-[44px]"
                            >
                              <FaEdit className="inline mr-1" /> Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteGoal(goal.id)
                              }}
                              className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-[6px] hover:bg-red-100 transition text-[13px] font-medium min-h-[44px]"
                            >
                              <FaTrash className="inline mr-1" /> Delete
                            </button>
                          </>
                        }
                      />
                    )
                  })}
                </div>

                {/* Desktop: Card Grid */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {goals.map((goal) => {
                    const progress = goal.targetValue > 0 
                      ? Math.round((goal.currentValue / goal.targetValue) * 100)
                      : 0
                    const daysRemaining = goal.endDate 
                      ? Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null

                    return (
                      <div
                        key={goal.id}
                        onClick={() => router.push(`/goals/${goal.id}`)}
                        className="bg-white rounded-[14px] border border-[#E5E5E5] p-6 hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[17px] font-medium text-[#1A1A1A] truncate mb-1">
                              {goal.name}
                            </h3>
                            <p className="text-[13px] text-[#A3A3A3]">
                              {formatValue(goal)}
                            </p>
                          </div>
                          <span className="ml-3 px-2.5 py-1 rounded-[6px] text-[12px] font-semibold bg-blue-100 text-blue-700">
                            {progress}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="w-full h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(progress)} transition-all duration-300`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E5]">
                          <div className="text-[12px] text-[#A3A3A3]">
                            {daysRemaining !== null && (
                              <>
                                {daysRemaining > 0 ? (
                                  `${daysRemaining} days remaining`
                                ) : daysRemaining === 0 ? (
                                  'Due today'
                                ) : (
                                  <span className="text-red-600">{Math.abs(daysRemaining)} days overdue</span>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditGoal(goal)
                              }}
                              className="p-2 text-[#525252] hover:bg-[#F5F5F5] rounded-[6px] transition"
                              title="Edit goal"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteGoal(goal.id)
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-[6px] transition"
                              title="Delete goal"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </ResponsivePageContainer>
      </div>

      {/* Add/Edit Goal Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-12 md:pt-20 px-4 overflow-y-auto">
          <div 
            className="bg-white w-full max-w-lg rounded-[14px] shadow-lg p-6 my-8"
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
                  className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-[10px] focus:ring-2 focus:ring-[#DD3A44] focus:border-transparent text-[15px] min-h-[44px]"
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
                    className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-[10px] focus:ring-2 focus:ring-[#DD3A44] focus:border-transparent text-[15px] min-h-[44px]"
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
                    className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-[10px] focus:ring-2 focus:ring-[#DD3A44] focus:border-transparent text-[15px] min-h-[44px]"
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
                  className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-[10px] focus:ring-2 focus:ring-[#DD3A44] focus:border-transparent text-[15px] min-h-[44px]"
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
                className="flex-1 px-4 py-2.5 bg-[#F5F5F5] text-[#525252] rounded-[10px] hover:bg-[#E5E5E5] transition font-medium min-h-[44px]"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoal}
                className="flex-1 px-4 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] transition font-medium disabled:opacity-50 min-h-[44px]"
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
          // Goal created successfully - just stay on goals list and refresh
          // (Goal detail page doesn't exist yet)
          console.log('Voice coach created goal:', goalId);
        }}
      />
    </div>
  )
}
