'use client'

import { useRouter } from 'next/navigation'
import { FaEdit, FaTrash, FaFlag } from 'react-icons/fa'
import MobileListItem from '@/components/responsive/MobileListItem'
import { useGoalsContext } from './goals-context'

interface GoalCardProps {
  goal: {
    id: string
    name: string
    currentValue: number | string
    targetValue: number | string
    unit: string | null
    endDate: string | Date
    metricType: string
    workspaceId: string
  }
  isMobile?: boolean
}

export default function GoalCard({ goal, isMobile }: GoalCardProps) {
  const router = useRouter()
  const { onEdit, onDelete } = useGoalsContext()

  // Calculate progress
  const currentValue = Number(goal.currentValue) || 0
  const targetValue = Number(goal.targetValue) || 1
  const progress = targetValue > 0 ? Math.round((currentValue / targetValue) * 100) : 0

  // Calculate days remaining
  const daysRemaining = Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  const formatValue = () => {
    if (goal.metricType === 'currency') {
      const symbol = '£'
      return `${symbol}${currentValue.toLocaleString()} / ${symbol}${targetValue.toLocaleString()}`
    }
    return `${currentValue} / ${targetValue} ${goal.unit || ''}`
  }

  const getProgressColor = () => {
    if (progress >= 100) return 'bg-[#F3F3F3]0'
    if (progress >= 75) return 'bg-[#F3F3F3]0'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // Pre-fetch goal detail on hover
  const handleMouseEnter = () => {
    router.prefetch(`/goals/${goal.id}`)
  }

  const handleClick = () => {
    router.push(`/goals/${goal.id}`)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onEdit) onEdit(goal)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDelete) onDelete(goal.id)
  }

  if (isMobile) {
    return (
      <MobileListItem
        title={goal.name}
        icon={
          <div className="w-10 h-10 rounded-md bg-[#FEF2F2] flex items-center justify-center">
            <FaFlag className="text-[#1A1C1C]" />
          </div>
        }
        badge={
          <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#F3F3F3] text-[#474747]">
            {progress}%
          </span>
        }
        metadata={[
          { label: 'Progress', value: formatValue() },
          { 
            label: 'Due', 
            value: daysRemaining > 0 
              ? `${daysRemaining} days` 
              : daysRemaining === 0 
              ? 'Today' 
              : `${Math.abs(daysRemaining)} days overdue`
          },
        ]}
        onClick={handleClick}
        actions={
          <>
            <button
              onClick={handleEdit}
              className="flex-1 px-3 py-2 bg-[#F3F3F3] text-[#474747] rounded-md hover:bg-[#E5E5E5] transition text-[13px] font-medium min-h-[44px]"
            >
              <FaEdit className="inline mr-1" /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition text-[13px] font-medium min-h-[44px]"
            >
              <FaTrash className="inline mr-1" /> Delete
            </button>
          </>
        }
      />
    )
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className="bg-white rounded p-5 border border-[#E5E5E5] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] cursor-pointer transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1 min-w-0">
          <h3 className="text-[18px] leading-[28px] font-medium text-[#1A1A1A]">
            {goal.name}
          </h3>
        </div>
        <div className="px-3 py-1.5 rounded-md border bg-[#F9F9F9] border-[#E5E5E5]">
          <span className="text-[12px] font-medium text-[#1A1A1A]">
            {progress}%
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[13px] text-[#525252]">
            <span className="font-medium text-[#1A1A1A]">{formatValue()}</span>
          </div>
          <span className="text-[15px] font-medium text-[#1A1A1A]">
            {progress}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#F3F3F3] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1A1A1A] rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-[13px] text-[#525252]">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-[#A3A3A3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {daysRemaining > 0 ? (
              `${daysRemaining} days`
            ) : daysRemaining === 0 ? (
              'Due today'
            ) : (
              <span className="text-red-600">{Math.abs(daysRemaining)} days overdue</span>
            )}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="p-1.5 text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#F3F3F3] rounded transition"
            title="Edit goal"
          >
            <FaEdit className="text-sm" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-[#A3A3A3] hover:text-red-600 hover:bg-red-50 rounded transition"
            title="Delete goal"
          >
            <FaTrash className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  )
}
