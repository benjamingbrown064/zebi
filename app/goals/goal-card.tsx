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
      className="bg-white rounded p-6 hover:shadow-[0_20px_40px_rgba(28,27,27,0.06)] transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] font-medium text-[#1A1A1A] truncate mb-1">
            {goal.name}
          </h3>
          <p className="text-[13px] text-[#A3A3A3]">
            {formatValue()}
          </p>
        </div>
        <span className="ml-3 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-[#F3F3F3] text-[#474747]">
          {progress}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full h-2 bg-[#F3F3F3] rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-300`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-[12px] text-[#A3A3A3]">
          {daysRemaining > 0 ? (
            `${daysRemaining} days remaining`
          ) : daysRemaining === 0 ? (
            'Due today'
          ) : (
            <span className="text-red-600">{Math.abs(daysRemaining)} days overdue</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="p-2 text-[#474747] hover:bg-[#F3F3F3] rounded-md transition"
            title="Edit goal"
          >
            <FaEdit />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition"
            title="Delete goal"
          >
            <FaTrash />
          </button>
        </div>
      </div>
    </div>
  )
}
