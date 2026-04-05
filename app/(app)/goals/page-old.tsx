'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa'
import Sidebar from '@/components/Sidebar'
import LoadingSpinner from '@/components/LoadingSpinner'
import { getGoals, createGoal, updateGoal, deleteGoal, calculateGoalProgress, Goal } from '@/app/actions/goals'

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
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
  const [loading, setLoading] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetValue: 100,
    unit: '%',
    currency: 'GBP',
    endDate: '',
    metricType: 'numeric' as const,
  })
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  // Load goals from database on mount and refresh periodically
  useEffect(() => {
    async function loadAndRefreshGoals() {
      try {
        // Timeout: force UI to show after 2 seconds even if getGoals hangs
        const timeout = setTimeout(() => {
          setLoading(false)
          console.log('[Goals] Timeout - showing UI despite loading')
        }, 2000)
        
        const fetchedGoals = await getGoals(DEFAULT_WORKSPACE_ID)
        clearTimeout(timeout)
        
        // Set goals immediately - do NOT wait for progress calculation
        setGoals(fetchedGoals)
        setLoading(false)
        
        // Recalculate progress in the background (don't block UI)
        // This will pick up changes from completed tasks
        for (const goal of fetchedGoals) {
          try {
            const updated = await calculateGoalProgress(DEFAULT_WORKSPACE_ID, goal.id)
            if (updated) {
              setGoals(prev => prev.map(g => g.id === goal.id ? updated : g))
            }
          } catch (err) {
            console.error(`Failed to recalculate progress for goal ${goal.id}:`, err)
          }
        }
      } catch (err) {
        console.error('Failed to load goals:', err)
        setGoals([])
        setLoading(false)
      }
    }
    
    // Load immediately on mount
    loadAndRefreshGoals()
    
    // Then refresh every 5 seconds to pick up changes from task completions
    const interval = setInterval(loadAndRefreshGoals, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const handleSaveGoal = async () => {
    if (!newGoal.name || !newGoal.endDate) {
      alert('Name and due date are required')
      return
    }

    setIsSaving(true)
    try {
      if (editingGoal) {
        // Update existing goal
        const updated = await updateGoal(DEFAULT_WORKSPACE_ID, editingGoal.id, {
          name: newGoal.name,
          targetValue: newGoal.targetValue,
          unit: newGoal.unit,
          endDate: newGoal.endDate,
          metricType: newGoal.metricType,
        })

        if (updated) {
          setGoals(goals.map((g) => (g.id === editingGoal.id ? updated : g)))
          setEditingGoal(null)
          setIsAdding(false)
        } else {
          alert('Failed to update goal')
        }
      } else {
        // Create new goal
        const created = await createGoal(DEFAULT_WORKSPACE_ID, PLACEHOLDER_USER_ID, {
          name: newGoal.name,
          targetValue: newGoal.targetValue,
          currentValue: 0,
          unit: newGoal.unit,
          endDate: newGoal.endDate,
          metricType: newGoal.metricType,
        })

        if (created) {
          setGoals([created, ...goals])
          setIsAdding(false)
        } else {
          console.error('createGoal returned null')
          alert('Failed to create goal. Check browser console for details.')
        }
      }
      
      setNewGoal({
        name: '',
        targetValue: 100,
        unit: '%',
        currency: 'GBP',
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
      const success = await deleteGoal(DEFAULT_WORKSPACE_ID, id)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className="ml-64">
        <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-10">
          <div className="px-12 py-8 flex justify-between items-center">
            <div>
              <h1 className="text-[30px] leading-[36px] font-medium text-[#1A1A1A]">Goals</h1>
              <p className="text-[13px] text-[#A3A3A3] mt-1">Track your long-term objectives</p>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="px-5 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] hover:bg-accent-600 transition flex items-center gap-2"
            >
              <FaPlus /> Add goal
            </button>
          </div>
        </header>

        <main className="flex-1 p-8">
          {goals.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[10px] border border-[#E5E5E5]">
              <p className="text-gray-600">No goals yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-white rounded-[10px] border border-[#E5E5E5] p-6 hover:shadow-card-hover transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#1A1A1A]">{goal.name}</h3>
                      <p className="text-xs text-[#A3A3A3] mt-1">
                        Due: {goal.endDate} • Type: {goal.metricType} • Status: {goal.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingGoal(goal)
                          setNewGoal({
                            name: goal.name,
                            targetValue: goal.targetValue,
                            unit: goal.unit || '%',
                            currency: (goal as any).currency || 'GBP',
                            endDate: goal.endDate,
                            metricType: goal.metricType as any,
                          })
                        }}
                        className="p-2 text-[#A3A3A3] hover:text-[#DD3A44] transition"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-2 text-[#A3A3A3] hover:text-red-600 transition"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#525252]">Progress</span>
                      <span className="text-gray-600 font-medium">
                        {getCurrencySymbol((goal as any).currency)}{Math.round(goal.currentValue)} {goal.unit === '%' ? '%' : ''} / {getCurrencySymbol((goal as any).currency)}{Math.round(goal.targetValue)} {goal.unit === '%' ? '%' : ''}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-500 transition-all duration-300"
                        style={{
                          width: `${Math.min((goal.currentValue / goal.targetValue) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {(isAdding || editingGoal) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-[10px] shadow-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">
                {editingGoal ? 'Edit goal' : 'Add a new goal'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                    Goal name
                  </label>
                  <input
                    type="text"
                    value={newGoal.name}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, name: e.target.value })
                    }
                    placeholder="e.g., £100k/month revenue"
                    className="w-full px-4 py-2 border border-[#E5E5E5] rounded-[10px] focus:focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                    Currency
                  </label>
                  <select
                    value={newGoal.currency}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, currency: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-[#E5E5E5] rounded-[10px] focus:focus-ring"
                  >
                    <option value="GBP">£ GBP</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="">No currency</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                      Target value
                    </label>
                    <input
                      type="number"
                      value={newGoal.targetValue}
                      onChange={(e) =>
                        setNewGoal({
                          ...newGoal,
                          targetValue: Number(e.target.value),
                        })
                      }
                      placeholder="100"
                      className="w-full px-4 py-2 border border-[#E5E5E5] rounded-[10px] focus:focus-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={newGoal.unit}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, unit: e.target.value })
                      }
                      placeholder="e.g., k, %, items"
                      className="w-full px-4 py-2 border border-[#E5E5E5] rounded-[10px] focus:focus-ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={newGoal.endDate}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, endDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-[#E5E5E5] rounded-[10px] focus:focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                    Tracking type
                  </label>
                  <select
                    value={newGoal.metricType}
                    onChange={(e) =>
                      setNewGoal({
                        ...newGoal,
                        metricType: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-[#E5E5E5] rounded-[10px] focus:focus-ring"
                  >
                    <option value="tasks">Tasks (count completed)</option>
                    <option value="numeric">Numeric (input value)</option>
                    <option value="milestones">Milestones (manual)</option>
                    <option value="points">Points (effort)</option>
                  </select>
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
                      currency: 'GBP',
                      endDate: '',
                      metricType: 'numeric',
                    })
                  }}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-gray-100 text-[#1A1A1A] rounded-[10px] hover:bg-gray-200 transition font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGoal}
                  disabled={isSaving}
                  className="flex-1 px-5 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] hover:bg-accent-600 transition font-medium disabled:opacity-50"
                >
                  {isSaving ? (editingGoal ? 'Updating...' : 'Creating...') : (editingGoal ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
