'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaArrowLeft, FaEdit, FaTrash, FaTasks, FaBullseye } from 'react-icons/fa'
import Sidebar from '@/components/Sidebar'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import { deleteGoal } from '@/app/actions/goals'
import GoalSpaceLinker from '@/components/GoalSpaceLinker'

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
    if (progress >= 100) return 'bg-[#F3F3F3]0'
    if (progress >= 75) return 'bg-[#F3F3F3]0'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const mainPaddingClass = sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
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
            className="flex items-center gap-2 text-[#474747] hover:text-[#1A1A1A] transition-colors text-[15px] font-medium"
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
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-white hover:bg-[#F3F3F3] text-[#474747]  rounded font-medium text-[13px] md:text-[15px] transition-colors min-h-[44px]"
              >
                <FaEdit className="text-sm" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded font-medium text-[13px] md:text-[15px] transition-colors min-h-[44px]"
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
            <div className="bg-white rounded p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-[17px] font-semibold text-[#1A1A1A] mb-1">Progress</h2>
                  <p className="text-[15px] text-[#A3A3A3]">{formatValue()}</p>
                </div>
                <span className="px-3 py-1.5 rounded-md text-[13px] font-semibold bg-[#F3F3F3] text-[#474747]">
                  {progress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full h-3 bg-[#F3F3F3] rounded-full overflow-hidden">
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
              <div className="bg-white rounded p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[17px] font-semibold text-[#1A1A1A] flex items-center gap-2">
                    <FaTasks className="text-[#1A1C1C]" />
                    Linked Tasks
                  </h2>
                  <span className="text-[13px] font-medium bg-[#F3F3F3] text-[#474747] px-3 py-1 rounded-md">
                    {totalTasks} task{totalTasks !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[14px] text-[#A3A3A3] mt-3">This goal has {totalTasks} linked task{totalTasks !== 1 ? 's' : ''}. View them in the Tasks section.</p>
              </div>
            )}

            {/* Objectives */}
            {goal.objectives && goal.objectives.length > 0 && (
              <div className="bg-white rounded p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-3">
                  Linked Objectives
                </h2>

                <div className="space-y-2">
                  {goal.objectives.map((objective: any) => (
                    <LinkedItem
                      key={objective.id}
                      title={objective.title}
                      subtitle={objective.status ? objective.status.replace('_', ' ') : undefined}
                      href={`/objectives/${objective.id}`}
                    />
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
