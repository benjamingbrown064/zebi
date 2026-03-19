'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import MilestoneTimeline from '@/components/MilestoneTimeline'
import BlockerCard from '@/components/BlockerCard'
import ProgressChart from '@/components/ProgressChart'
import ProgressBreakdown from '@/components/ProgressBreakdown'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import {
  FaArrowLeft,
  FaBuilding,
  FaChartLine,
  FaTasks,
  FaBan,
  FaBrain,
  FaHistory,
  FaRobot,
  FaUser,
  FaExclamationTriangle,
  FaCheckCircle,
} from 'react-icons/fa'

interface ObjectiveDetailClientProps {
  objective: any
  memories: any[]
  insights: any[]
  activityLogs: any[]
}

type Tab = 'overview' | 'progress' | 'blockers' | 'intelligence' | 'activity'

export default function ObjectiveDetailClient({
  objective,
  memories,
  insights,
  activityLogs,
}: ObjectiveDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Status colors
  const statusConfig: any = {
    on_track: { bg: 'bg-[#e6f4f4]', text: 'text-[#006766]', bar: 'bg-[#f0fafa]0', icon: '✅', label: 'ON TRACK' },
    at_risk: { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500', icon: '⚠️', label: 'AT RISK' },
    blocked: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500', icon: '🚫', label: 'BLOCKED' },
    completed: { bg: 'bg-[#e6f4f4]', text: 'text-[#006766]', bar: 'bg-[#f0fafa]0', icon: '🎉', label: 'COMPLETED' },
    active: { bg: 'bg-[#f0eded]', text: 'text-[#5a5757]', bar: 'bg-accent-500', icon: '🎯', label: 'ACTIVE' },
  }

  const statusStyle = statusConfig[objective.status] || statusConfig.active

  // Format currency
  const formatValue = (value: number) => {
    if (objective.unit === 'GBP') {
      return `£${(value / 1000).toFixed(0)}k`
    }
    return value.toString()
  }

  // Days until deadline
  const daysUntil = Math.ceil((new Date(objective.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const totalDays = Math.ceil((new Date(objective.deadline).getTime() - new Date(objective.startDate).getTime()) / (1000 * 60 * 60 * 24))
  const daysElapsed = totalDays - daysUntil

  // Find next milestone
  const nextMilestone = objective.milestones.find((m: any) => !m.completedAt && m.targetValue > objective.currentValue)

  // Active blockers
  const activeBlockers = objective.blockers.filter((b: any) => !b.resolvedAt)
  const resolvedBlockers = objective.blockers.filter((b: any) => b.resolvedAt)

  // AI vs human tasks
  const aiTasks = objective.tasks.filter((t: any) => t.aiGenerated && !t.completedAt)
  const humanTasks = objective.tasks.filter((t: any) => !t.aiGenerated && !t.completedAt)
  const completedTasks = objective.tasks.filter((t: any) => t.completedAt)

  // Calculate velocity
  const recentProgress = objective.progressEntries.slice(0, 7) // Last 7 entries
  const velocity = recentProgress.length > 1
    ? (recentProgress[0].value - recentProgress[recentProgress.length - 1].value) /
      Math.max(1, Math.ceil((new Date(recentProgress[0].entryDate).getTime() - new Date(recentProgress[recentProgress.length - 1].entryDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const handleResolveBlocker = async (blockerId: string) => {
    try {
      const response = await fetch(`/api/objectives/${objective.id}/blockers/${blockerId}/resolve`, {
        method: 'PUT',
      })
      if (response.ok) {
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to resolve blocker:', err)
    }
  }

  const mainPaddingClass = isMobile ? '' : sidebarCollapsed ? 'ml-16' : 'ml-64'

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className={`flex-1 transition-all duration-300 ${mainPaddingClass}`}>
        {/* Header */}
        <header className="bg-white sticky top-0 z-10">
          <div className="px-4 md:px-12 py-4 md:py-8">
            {/* Tabs - scrollable on mobile */}
            <nav className="flex items-center justify-start md:justify-center gap-4 md:gap-8 overflow-x-auto scrollbar-hide">
              {[
                { id: 'overview', label: 'Overview', icon: <FaChartLine /> },
                { id: 'progress', label: 'Progress', icon: <FaChartLine /> },
                { id: 'blockers', label: 'Blockers', icon: <FaBan /> },
                { id: 'intelligence', label: 'Intelligence', icon: <FaBrain /> },
                { id: 'activity', label: 'Activity', icon: <FaHistory /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-2 pb-3 md:pb-4 border-b-2 transition text-[13px] md:text-[15px] whitespace-nowrap min-h-[44px] ${
                    activeTab === tab.id
                      ? 'border-[#DD3A44] text-[#DD3A44]'
                      : 'border-transparent text-[#737373] hover:text-[#1A1A1A]'
                  }`}
                >
                  {tab.icon}
                  <span className={`font-medium ${isMobile ? 'hidden' : ''}`}>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <ResponsivePageContainer>
          <div className="max-w-[1280px] mx-auto py-6 md:py-12">
          {/* Back Button */}
          <Link
            href="/objectives"
            className="inline-flex items-center gap-2 text-[#737373] hover:text-[#DD3A44] mb-8 transition text-[15px]"
          >
            <FaArrowLeft />
            <span>Back to Objectives</span>
          </Link>

            {/* Intro Card */}
            <div className="bg-white rounded-[14px] p-4 md:p-8 mb-6 md:mb-8">
              {/* Company */}
              {objective.company && (
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <div className="w-6 h-6 rounded-[6px] bg-[#F5F5F5] flex items-center justify-center">
                    <FaBuilding className="text-[#737373] text-xs" />
                  </div>
                  <Link
                    href={`/companies/${objective.company.id}`}
                    className="text-[13px] md:text-[15px] font-medium text-[#525252] hover:text-[#DD3A44] transition"
                  >
                    {objective.company.name}
                  </Link>
                </div>
              )}

              {/* Title */}
              <h1 className="text-[20px] md:text-[30px] leading-[28px] md:leading-[36px] font-medium text-[#1A1A1A] mb-4 md:mb-6">{objective.title}</h1>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-[13px] text-[#525252] mb-2">
                <span>
                  Current: <strong className="text-[#1A1A1A]">{formatValue(objective.currentValue)}</strong> → Target:{' '}
                  <strong className="text-[#1A1A1A]">{formatValue(objective.targetValue)}</strong>
                  <span className="text-[#A3A3A3] ml-1.5">
                    ({formatValue(objective.targetValue - objective.currentValue)} gap)
                  </span>
                </span>
                <span className="text-[15px] font-medium text-[#1A1A1A]">{Math.round(objective.progressPercent)}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300 rounded-full"
                  style={{ 
                    width: `${Math.min(objective.progressPercent, 100)}%`,
                    backgroundColor: statusStyle.bar
                  }}
                />
              </div>
            </div>

            {/* Status & Timeline */}
            <div className="flex items-center gap-4 mb-6">
              <div 
                className="px-3 py-1.5 rounded-[6px] border"
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
              <span className="text-[13px] text-[#525252]">
                {daysUntil > 0 ? `${daysUntil} days remaining` : `${Math.abs(daysUntil)} days overdue`}
              </span>
            </div>

            {/* Description */}
            {objective.description && (
              <p className="text-[15px] leading-[24px] text-[#525252]">{objective.description}</p>
            )}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Progress Breakdown (V2) */}
                {objective.progressMode === 'auto' && objective.progressBreakdown && (
                  <ProgressBreakdown
                    totalTasks={objective.progressBreakdown.totalTasks}
                    completedTasks={objective.progressBreakdown.completedTasks}
                    progressPercent={Number(objective.progressPercent)}
                    directTasks={objective.progressBreakdown.directTasks}
                    projectTasks={objective.progressBreakdown.projectTasks}
                    scopeChangeNote={objective.progressBreakdown.scopeChangeNote}
                    lastRecalc={objective.progressBreakdown.lastRecalc}
                  />
                )}

                {/* Current Metrics (for manual mode) */}
                {objective.progressMode === 'manual' && (
                  <div className="card-base p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold text-[#1c1b1b]">Current Metrics</h3>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#e8e4e4] text-[#5a5757]">
                        MANUAL
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-[#5a5757] mb-1">Current</p>
                        <p className="text-2xl font-bold text-[#1c1b1b]">{formatValue(objective.currentValue)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#5a5757] mb-1">Target</p>
                        <p className="text-2xl font-bold text-[#1c1b1b]">{formatValue(objective.targetValue)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#5a5757] mb-1">Gap</p>
                        <p className="text-2xl font-bold text-[#1c1b1b]">
                          {formatValue(objective.targetValue - objective.currentValue)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="card-base p-6">
                  <h3 className="text-lg font-semibold text-[#1c1b1b] mb-4">Timeline</h3>
                  <div className="flex items-center justify-between text-sm text-[#5a5757]">
                    <span>
                      Start: <strong>{new Date(objective.startDate).toLocaleDateString()}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Deadline: <strong>{new Date(objective.deadline).toLocaleDateString()}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Days: <strong>{totalDays}</strong> (elapsed: {daysElapsed}, left: {daysUntil})
                    </span>
                  </div>
                </div>

                {/* Progress Chart */}
                <div className="card-base p-6">
                  <h3 className="text-lg font-semibold text-[#1c1b1b] mb-4">Progress Chart (Last 30 Days)</h3>
                  <ProgressChart
                    progressEntries={objective.progressEntries.map((p: any) => ({
                      ...p,
                      entryDate: new Date(p.entryDate),
                    }))}
                    targetValue={objective.targetValue}
                    deadline={new Date(objective.deadline)}
                    unit={objective.unit}
                  />
                  {velocity > 0 && (
                    <p className="text-sm text-[#5a5757] mt-4">
                      Trajectory: At current rate ({formatValue(velocity)}/day), will reach{' '}
                      {formatValue(objective.currentValue + velocity * daysUntil)} by deadline
                    </p>
                  )}
                </div>

                {/* Next Milestone */}
                {nextMilestone && (
                  <div className="card-base p-6 border-2 border-accent-200">
                    <h3 className="text-lg font-semibold text-[#1c1b1b] mb-4">🎯 Next Milestone</h3>
                    <p className="text-xl font-bold text-[#1c1b1b] mb-2">{nextMilestone.title}</p>
                    <p className="text-[#5a5757] mb-3">
                      Target: <strong>{formatValue(nextMilestone.targetValue)}</strong> by{' '}
                      <strong>{new Date(nextMilestone.targetDate).toLocaleDateString()}</strong>
                      {' '}({Math.ceil((new Date(nextMilestone.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days)
                    </p>
                    <p className="text-[#5a5757]">
                      Need: <strong>{formatValue(nextMilestone.targetValue - objective.currentValue)}</strong> growth
                      {velocity > 0 && (
                        <span className={`ml-2 ${velocity * Math.ceil((new Date(nextMilestone.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) >= (nextMilestone.targetValue - objective.currentValue) ? 'text-[#006766]' : 'text-red-600'}`}>
                          ({velocity > 0 && velocity * Math.ceil((new Date(nextMilestone.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) >= (nextMilestone.targetValue - objective.currentValue) ? '✅ on track' : '⚠️ behind pace'})
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Status Assessment */}
                <div className="card-base p-6">
                  <h3 className="text-lg font-semibold text-[#1c1b1b] mb-4">
                    Status Assessment
                    {objective.lastChecked && (
                      <span className="text-sm font-normal text-[#A3A3A3] ml-2">
                        (Updated {new Date(objective.lastChecked).toLocaleString()})
                      </span>
                    )}
                  </h3>
                  <div className={`p-4 rounded-[10px] ${statusStyle.bg}`}>
                    <p className={`text-lg font-semibold ${statusStyle.text} mb-3`}>
                      {statusStyle.icon} {statusStyle.label}
                    </p>
                    <ul className="space-y-1 text-[#5a5757]">
                      <li>• Completing {objective.tasks.filter((t: any) => t.completedAt).length} / {objective.tasks.length} tasks</li>
                      {velocity > 0 && <li>• Growing at {formatValue(velocity)}/day</li>}
                      <li>• {activeBlockers.length} active blocker{activeBlockers.length !== 1 ? 's' : ''}</li>
                      <li>• {objective.projects.length} project{objective.projects.length !== 1 ? 's' : ''} active</li>
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      // TODO: Implement progress update modal
                      alert('Progress update functionality coming soon')
                    }}
                    className="px-5 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[15px] transition-colors"
                  >
                    Update Progress
                  </button>
                  <button 
                    onClick={() => {
                      // TODO: Implement objective edit
                      router.push(`/objectives/${objective.id}/edit`)
                    }}
                    className="px-5 py-2.5 bg-white  text-[#525252] rounded-[10px] font-medium text-[15px] hover:bg-[#F5F5F5] transition-colors"
                  >
                    Adjust Objective
                  </button>
                </div>
              </div>
            )}

            {/* ACTION PLAN TAB */}
            {/* PROGRESS TAB */}
            {activeTab === 'progress' && (
              <div className="space-y-6">
                {/* Velocity Chart */}
                <div className="card-base p-6">
                  <h3 className="text-lg font-semibold text-[#1c1b1b] mb-4">Velocity</h3>
                  <p className="text-3xl font-bold text-[#1c1b1b]">
                    {formatValue(velocity)}<span className="text-lg text-[#5a5757]">/day</span>
                  </p>
                </div>

                {/* Milestone Timeline */}
                <div className="card-base p-6">
                  <h3 className="text-lg font-semibold text-[#1c1b1b] mb-4">Milestone Timeline</h3>
                  <MilestoneTimeline
                    milestones={objective.milestones.map((m: any) => ({
                      ...m,
                      targetDate: new Date(m.targetDate),
                      completedAt: m.completedAt ? new Date(m.completedAt) : null,
                    }))}
                    currentValue={objective.currentValue}
                    unit={objective.unit}
                  />
                </div>

                {/* Progress Entry History */}
                <div className="card-base p-6">
                  <h3 className="text-lg font-semibold text-[#1c1b1b] mb-4">Progress History</h3>
                  {objective.progressEntries.length === 0 ? (
                    <p className="text-[#A3A3A3]">No progress entries yet</p>
                  ) : (
                    <div className="space-y-2">
                      {objective.progressEntries.map((entry: any) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-[#f6f3f2] rounded-[10px]">
                          <div>
                            <p className="font-semibold text-[#1c1b1b]">{formatValue(entry.value)}</p>
                            <p className="text-xs text-[#5a5757]">
                              {new Date(entry.entryDate).toLocaleDateString()} • {entry.source}
                            </p>
                          </div>
                          {entry.note && <p className="text-sm text-[#5a5757]">{entry.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BLOCKERS TAB */}
            {activeTab === 'blockers' && (
              <div className="space-y-6">
                {/* Active Blockers */}
                <div className="card-base p-6">
                  <h3 className="text-lg font-semibold text-[#1c1b1b] mb-4 flex items-center gap-2">
                    <FaExclamationTriangle className="text-red-600" />
                    Active Blockers ({activeBlockers.length})
                  </h3>
                  {activeBlockers.length === 0 ? (
                    <div className="p-4 bg-[#f0fafa] border border-green-200 rounded-[10px] text-[#006766]">
                      <FaCheckCircle className="inline mr-2" />
                      No active blockers
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeBlockers.map((blocker: any) => (
                        <BlockerCard
                          key={blocker.id}
                          blocker={{
                            ...blocker,
                            detectedAt: new Date(blocker.detectedAt),
                            resolvedAt: blocker.resolvedAt ? new Date(blocker.resolvedAt) : null,
                          }}
                          onResolve={handleResolveBlocker}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Resolved Blockers */}
                {resolvedBlockers.length > 0 && (
                  <div className="card-base p-6">
                    <h3 className="text-lg font-semibold text-[#1c1b1b] mb-4">
                      Resolved Blockers ({resolvedBlockers.length})
                    </h3>
                    <div className="space-y-3">
                      {resolvedBlockers.map((blocker: any) => (
                        <BlockerCard
                          key={blocker.id}
                          blocker={{
                            ...blocker,
                            detectedAt: new Date(blocker.detectedAt),
                            resolvedAt: blocker.resolvedAt ? new Date(blocker.resolvedAt) : null,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* INTELLIGENCE TAB */}
            {activeTab === 'intelligence' && (
              <div className="space-y-6">
                {/* Relevant Memories */}
                <div className="card-base p-6">
                  <h3 className="text-lg font-semibold text-[#1c1b1b] mb-4">Relevant Memories ({memories.length})</h3>
                  {memories.length === 0 ? (
                    <p className="text-[#A3A3A3]">No memories yet</p>
                  ) : (
                    <div className="space-y-3">
                      {memories.map((memory: any) => (
                        <div key={memory.id} className="p-4 bg-[#f6f3f2] rounded-[10px]">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-[#1c1b1b]">{memory.title}</h4>
                            <span className="px-2 py-1 bg-accent-100 text-accent-700 rounded text-xs font-medium">
                              Confidence: {memory.confidenceScore}/10
                            </span>
                          </div>
                          <p className="text-sm text-[#5a5757]">{memory.description}</p>
                          <p className="text-xs text-[#A3A3A3] mt-2">
                            {memory.memoryType} • {new Date(memory.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Related Insights */}
                <div className="card-base p-6">
                  <h3 className="text-lg font-semibold text-[#1c1b1b] mb-4">Related Insights ({insights.length})</h3>
                  {insights.length === 0 ? (
                    <p className="text-[#A3A3A3]">No insights yet</p>
                  ) : (
                    <div className="space-y-3">
                      {insights.map((insight: any) => (
                        <div key={insight.id} className="p-4 bg-[#f0fafa] border border-transparent rounded-[10px]">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-[#1c1b1b]">{insight.title}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              insight.priority === 1 ? 'bg-red-100 text-red-700' :
                              insight.priority === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              P{insight.priority}
                            </span>
                          </div>
                          <p className="text-sm text-[#5a5757]">{insight.summary}</p>
                          <p className="text-xs text-[#A3A3A3] mt-2">
                            {insight.insightType} • {insight.status} • {new Date(insight.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ACTIVITY TAB */}
            {activeTab === 'activity' && (
              <div className="card-base p-6">
                <h3 className="text-lg font-semibold text-[#1c1b1b] mb-4">Activity Log ({activityLogs.length})</h3>
                {activityLogs.length === 0 ? (
                  <p className="text-[#A3A3A3]">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {activityLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-[#f6f3f2] rounded-[10px]">
                        <div className="flex-1">
                          <p className="text-sm text-[#1c1b1b]">
                            <strong>{log.entityType}</strong> • {log.action}
                          </p>
                          {log.details && (
                            <p className="text-xs text-[#5a5757] mt-1">
                              {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-[#A3A3A3] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              )}
            </div>
          </div>
        </ResponsivePageContainer>
      </div>
    </div>
  )
}
