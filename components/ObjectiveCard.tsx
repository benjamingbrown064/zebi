'use client'

import Link from 'next/link'
import { FaFlag, FaBuilding, FaCalendarAlt, FaRobot, FaUser } from 'react-icons/fa'

interface ObjectiveCardProps {
  id: string
  title: string
  spaceName?: string
  companyId?: string
  currentValue: number
  targetValue: number
  unit?: string
  deadline: Date
  status: string
  progressPercent: number
  nextMilestone?: {
    title: string
    targetDate: Date
    daysUntil: number
  }
  aiWork?: string
  humanWork?: string
  activeBlockers?: number
}

export default function ObjectiveCard({
  id,
  title,
  spaceName,
  companyId,
  currentValue,
  targetValue,
  unit,
  deadline,
  status,
  progressPercent,
  nextMilestone,
  aiWork,
  humanWork,
  activeBlockers = 0,
}: ObjectiveCardProps) {
  // Status configuration (minimal, semantic colours only)
  const statusConfig = {
    on_track: { 
      bg: '#ECFDF5', 
      text: '#047857', 
      bar: '#10B981', 
      label: 'On Track',
      border: '#A7F3D0'
    },
    at_risk: { 
      bg: '#FFFBEB', 
      text: '#B45309', 
      bar: '#F59E0B', 
      label: 'At Risk',
      border: '#FDE68A'
    },
    blocked: { 
      bg: '#FEF2F2', 
      text: '#B91C1C', 
      bar: '#EF4444', 
      label: 'Blocked',
      border: '#FECACA'
    },
    completed: { 
      bg: '#EFF6FF', 
      text: '#1D4ED8', 
      bar: '#3B82F6', 
      label: 'Completed',
      border: '#BFDBFE'
    },
    active: { 
      bg: '#F5F5F5', 
      text: '#525252', 
      bar: '#DD3A44', 
      label: 'Active',
      border: '#E5E5E5'
    },
  }

  const statusStyle = statusConfig[status as keyof typeof statusConfig] || statusConfig.active

  // Format values
  const formatValue = (value: number) => {
    if (unit === 'GBP') {
      return `£${(value / 1000).toFixed(0)}k`
    }
    return value.toString()
  }

  // Calculate days until deadline
  const daysUntil = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysUntil < 0

  return (
    <Link href={`/objectives/${id}`} className="block group">
      <div className="bg-white rounded border border-[#E5E5E5] p-6 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div 
            className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: statusStyle.bg }}
          >
            <FaFlag style={{ color: statusStyle.text }} className="text-sm" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Space */}
            {spaceName && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <FaBuilding className="text-[#737373] text-xs" />
                </div>
                <Link
                  href={`/spaces/${companyId}`}
                  className="text-[15px] font-medium text-[#525252] hover:text-[#1A1C1C] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {spaceName}
                </Link>
              </div>
            )}

            {/* Title */}
            <h3 className="text-[18px] leading-[28px] font-medium text-[#1A1A1A] group-hover:text-[#1A1C1C] transition-colors">
              {title}
            </h3>
          </div>

          {/* Status Badge */}
          <div 
            className="px-3 py-1.5 rounded-md border"
            style={{ 
              backgroundColor: statusStyle.bg,
              borderColor: statusStyle.border
            }}
          >
            <span 
              className="text-[12px] font-medium"
              style={{ color: statusStyle.text }}
            >
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[13px] text-[#525252]">
              <span className="font-medium text-[#1A1A1A]">{formatValue(currentValue)}</span>
              <span className="text-[#A3A3A3] mx-1.5">→</span>
              <span className="font-medium text-[#1A1A1A]">{formatValue(targetValue)}</span>
              <span className="text-[#A3A3A3] ml-1.5">
                ({formatValue(targetValue - currentValue)} remaining)
              </span>
            </div>
            <span className="text-[15px] font-medium text-[#1A1A1A]">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{ 
                width: `${Math.min(progressPercent, 100)}%`,
                backgroundColor: statusStyle.bar
              }}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-4 mb-5 text-[13px] text-[#525252]">
          {nextMilestone && (
            <div className="flex items-center gap-1.5">
              <FaCalendarAlt className="text-[#A3A3A3] text-xs" />
              <span>
                Next milestone in{' '}
                <span 
                  className="font-medium"
                  style={{ 
                    color: nextMilestone.daysUntil < 7 ? '#D97706' : '#1A1A1A' 
                  }}
                >
                  {nextMilestone.daysUntil} days
                </span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <FaCalendarAlt className="text-[#A3A3A3] text-xs" />
            <span>
              Deadline{' '}
              <span 
                className="font-medium"
                style={{ 
                  color: isOverdue ? '#DC2626' : daysUntil < 14 ? '#D97706' : '#1A1A1A'
                }}
              >
                {isOverdue 
                  ? `${Math.abs(daysUntil)} days overdue` 
                  : `in ${daysUntil} days`
                }
              </span>
            </span>
          </div>
        </div>

        {/* Blocker Alert */}
        {activeBlockers > 0 && (
          <div className="mb-5 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded">
            <span className="text-[13px] font-medium text-[#DC2626]">
              {activeBlockers} active blocker{activeBlockers > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Work Status */}
        {(aiWork || humanWork) && (
          <div className="space-y-2 mb-5">
            {aiWork && (
              <div className="flex items-start gap-2">
                <FaRobot className="text-[#1A1C1C] mt-0.5 text-sm flex-shrink-0" />
                <div className="text-[13px] leading-[20px]">
                  <span className="text-[#A3A3A3]">Doug:</span>{' '}
                  <span className="text-[#525252]">{aiWork}</span>
                </div>
              </div>
            )}
            {humanWork && (
              <div className="flex items-start gap-2">
                <FaUser className="text-[#737373] mt-0.5 text-sm flex-shrink-0" />
                <div className="text-[13px] leading-[20px]">
                  <span className="text-[#A3A3A3]">You:</span>{' '}
                  <span className="text-[#1A1A1A] font-medium">{humanWork}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-5 border-t border-[#F5F5F5]">
          <Link
            href={`/objectives/${id}`}
            className="flex-1 px-4 py-2 bg-[#000000] hover:bg-[#1A1C1C] rounded text-[13px] font-medium text-white transition-colors text-center"
            onClick={(e) => e.stopPropagation()}
          >
            View Details
          </Link>
        </div>
      </div>
    </Link>
  )
}
