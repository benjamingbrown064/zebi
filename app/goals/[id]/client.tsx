'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaEdit, FaTrash, FaTasks, FaBullseye } from 'react-icons/fa'
import Sidebar from '@/components/Sidebar'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import { deleteGoal } from '@/app/actions/goals'
import GoalSpaceLinker from '@/components/GoalSpaceLinker'

interface GoalDetailClientProps {
  goal: any
}

export default function GoalDetailClient({ goal }: GoalDetailClientProps) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Calculate progress
  const progress = goal.targetValue > 0 
    ? Math.round((goal.currentValue / goal.targetValue) * 100)
    : 0

  // Use count instead of loading full task data
  const totalTasks = goal._count?.tasks || 0
  const completedTasks = [] // We're not loading task details anymore for performance

  // Calculate days remaining
  const daysRemaining = goal.endDate 
    ? Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      const success = await deleteGoal(goal.workspaceId, goal.id)
      if (success) {
        router.push('/goals')
      } else {
        alert('Failed to delete goal')
      }
    } catch (err) {
      console.error('Error deleting goal:', err)
      alert('Error deleting goal')
    }
  }

  const formatValue = () => {
    if (goal.metricType === 'currency') {
      const symbol = '£'
      return `${symbol}${goal.currentValue.toLocaleString()} / ${symbol}${goal.targetValue.toLocaleString()}`
    }
    return `${goal.currentValue} / ${goal.targetValue} ${goal.unit || ''}`
  }

  const getProgressColor = () => {
    if (progress >= 100) return 'bg-[#f0fafa]0'
    if (progress >= 75) return 'bg-[#f0fafa]0'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const mainPaddingClass = sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className={mainPaddingClass}>
        {/* Back Button */}
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
          <button
            onClick={() => router.push('/goals')}
            className="flex items-center gap-2 text-[#525252] hover:text-[#1A1A1A] transition-colors text-[15px] font-medium"
          >
            <FaArrowLeft className="text-sm" />
            Back to Goals
          </button>
        </div>

        <ResponsiveHeader
          title={goal.name}
          subtitle="Goal details"
          primaryAction={
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => router.push(`/goals?edit=${goal.id}`)}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-white hover:bg-[#f6f3f2] text-[#525252]  rounded-[10px] font-medium text-[13px] md:text-[15px] transition-colors min-h-[44px]"
              >
                <FaEdit className="text-sm" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-[10px] font-medium text-[13px] md:text-[15px] transition-colors min-h-[44px]"
              >
                <FaTrash className="text-sm" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          }
        />

        <ResponsivePageContainer>
          <div className="py-6 md:py-12 space-y-6">
            {/* Progress Card */}
            <div className="bg-white rounded-[14px] p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-[17px] font-semibold text-[#1A1A1A] mb-1">Progress</h2>
                  <p className="text-[15px] text-[#A3A3A3]">{formatValue()}</p>
                </div>
                <span className="px-3 py-1.5 rounded-[6px] text-[13px] font-semibold bg-[#e6f4f4] text-[#006766]">
                  {progress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full h-3 bg-[#F5F5F5] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor()} transition-all duration-300`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div>
                  <p className="text-[12px] text-[#A3A3A3] mb-1">Target</p>
                  <p className="text-[15px] font-semibold text-[#1A1A1A]">
                    {goal.metricType === 'currency' ? `£${goal.targetValue.toLocaleString()}` : `${goal.targetValue} ${goal.unit || ''}`}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-[#A3A3A3] mb-1">Current</p>
                  <p className="text-[15px] font-semibold text-[#1A1A1A]">
                    {goal.metricType === 'currency' ? `£${goal.currentValue.toLocaleString()}` : `${goal.currentValue} ${goal.unit || ''}`}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-[#A3A3A3] mb-1">Due Date</p>
                  <p className="text-[15px] font-semibold text-[#1A1A1A]">
                    {new Date(goal.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-[#A3A3A3] mb-1">Time Left</p>
                  <p className={`text-[15px] font-semibold ${daysRemaining && daysRemaining < 0 ? 'text-red-600' : 'text-[#1A1A1A]'}`}>
                    {daysRemaining !== null ? (
                      daysRemaining > 0 ? `${daysRemaining} days` : daysRemaining === 0 ? 'Today' : `${Math.abs(daysRemaining)} days overdue`
                    ) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>


            {/* Space Links for Financial Goals */}
            <GoalSpaceLinker
              goalId={goal.id}
              workspaceId={goal.workspaceId}
              isFinancial={goal.metricType === 'currency'}
              onUpdate={() => router.refresh()}
            />
            {/* Tasks Count */}
            {totalTasks > 0 && (
              <div className="bg-white rounded-[14px] p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[17px] font-semibold text-[#1A1A1A] flex items-center gap-2">
                    <FaTasks className="text-[#DD3A44]" />
                    Linked Tasks
                  </h2>
                  <span className="text-[13px] font-medium bg-[#e6f4f4] text-[#006766] px-3 py-1 rounded-[6px]">
                    {totalTasks} task{totalTasks !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[14px] text-[#A3A3A3] mt-3">This goal has {totalTasks} linked task{totalTasks !== 1 ? 's' : ''}. View them in the Tasks section.</p>
              </div>
            )}

            {/* Objectives */}
            {goal.objectives && goal.objectives.length > 0 && (
              <div className="bg-white rounded-[14px] p-6">
                <h2 className="text-[17px] font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                  <FaBullseye className="text-[#DD3A44]" />
                  Linked Objectives
                </h2>

                <div className="space-y-2">
                  {goal.objectives.map((objective: any) => (
                    <div
                      key={objective.id}
                      onClick={() => router.push(`/objectives/${objective.id}`)}
                      className="flex items-center gap-3 p-3 rounded-[10px] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] text-[#1A1A1A]">{objective.title}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-[6px] text-[11px] font-medium ${
                        objective.status === 'complete' ? 'bg-[#e6f4f4] text-[#006766]' :
                        objective.status === 'at_risk' ? 'bg-red-100 text-red-700' :
                        objective.status === 'on_track' ? 'bg-[#e6f4f4] text-[#006766]' :
                        'bg-[#F5F5F5] text-[#525252]'
                      }`}>
                        {objective.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ResponsivePageContainer>
      </div>
    </div>
  )
}
