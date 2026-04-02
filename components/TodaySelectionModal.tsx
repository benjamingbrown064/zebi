'use client'

import { useState, useEffect } from 'react'
import { FaTimes, FaPlus, FaGripVertical } from 'react-icons/fa'
import { getTodaySelection, setTaskForToday, removeTaskFromToday } from '@/app/actions/today'
import { getTasks } from '@/app/actions/tasks'
import { getStatuses } from '@/app/actions/statuses'

interface TodaySelectionModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
}

interface TaskItem {
  id: string
  title: string
  priority: number
}

interface TodayState {
  main: TaskItem[]        // Must complete (1)
  secondary: TaskItem[]   // Need to complete (2)
  additional: TaskItem[]  // Nice to complete (3)
  other: TaskItem[]       // Additional (5)
  available: TaskItem[]   // Unplanned tasks
}

export default function TodaySelectionModal({
  isOpen,
  onClose,
  workspaceId,
}: TodaySelectionModalProps) {
  const [todayState, setTodayState] = useState<TodayState>({
    main: [],
    secondary: [],
    additional: [],
    other: [],
    available: [],
  })
  const [allTasks, setAllTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load data when modal opens
  useEffect(() => {
    if (!isOpen) return

    async function loadData() {
      setLoading(true)
      try {
        const [selection, tasks, statuses] = await Promise.all([
          getTodaySelection(workspaceId),
          getTasks(workspaceId),
          getStatuses(workspaceId),
        ])

        // Get status type mapping
        const statusTypeMap = new Map(statuses.map(s => [s.id, s.type]))

        // Filter tasks to only include those with status 'inbox', 'planned', or 'doing'
        // Tasks with status 'done', 'blocked', or 'check' should not be displayed
        const allowedStatuses = new Set(['inbox', 'planned', 'doing'])
        
        const mappedTasks = tasks
          .filter(t => {
            const statusType = statusTypeMap.get(t.statusId)
            return statusType ? allowedStatuses.has(statusType) : false
          })
          .map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
          }))

        // Separate tasks into planned categories and unplanned
        const todayTaskIds = new Set([
          ...selection.main.map(t => t.id),
          ...selection.secondary.map(t => t.id),
          ...selection.additional.map(t => t.id),
          ...selection.other.map(t => t.id),
        ])

        const available = mappedTasks.filter(t => !todayTaskIds.has(t.id))

        setTodayState({
          main: selection.main,
          secondary: selection.secondary,
          additional: selection.additional,
          other: selection.other,
          available: available,
        })
        setAllTasks(available)
      } catch (err) {
        console.error('Failed to load today data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen, workspaceId])

  const handleAddTask = async (taskId: string, category: 'main' | 'secondary' | 'additional' | 'other') => {
    const task = allTasks.find(t => t.id === taskId)
    if (!task) return

    // Check limits
    if (category === 'main' && todayState.main.length >= 1) return
    if (category === 'secondary' && todayState.secondary.length >= 2) return
    if (category === 'additional' && todayState.additional.length >= 3) return
    if (category === 'other' && todayState.other.length >= 5) return

    // Add to server
    const order = todayState[category].length
    await setTaskForToday(workspaceId, taskId, category, order)

    // Update local state
    setTodayState(prev => ({
      ...prev,
      [category]: [...prev[category], task],
      available: prev.available.filter(t => t.id !== taskId),
    }))
    setAllTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const handleRemoveTask = async (taskId: string, category: keyof TodayState) => {
    if (category === 'available') return

    await removeTaskFromToday(workspaceId, taskId)

    const task = todayState[category].find(t => t.id === taskId)
    if (task) {
      setTodayState(prev => ({
        ...prev,
        [category]: prev[category].filter(t => t.id !== taskId),
        available: [...prev.available, task],
      }))
      setAllTasks(prev => [...prev, task])
    }
  }

  if (!isOpen) return null

  const mainSlots = 1 - todayState.main.length
  const secondarySlots = 2 - todayState.secondary.length
  const additionalSlots = 3 - todayState.additional.length
  const otherSlots = 5 - todayState.other.length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center md:p-4">
      <div className={`bg-white w-full md:max-w-2xl md:rounded shadow-[0_20px_40px_rgba(28,27,27,0.06)] overflow-y-auto flex flex-col ${
        isMobile ? 'h-[95vh] rounded-t-2xl' : 'max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="sticky top-0 bg-white px-4 md:px-6 py-4 flex justify-between items-center min-h-[56px]">
          <h2 className="text-lg font-semibold text-[#1c1b1b]">Plan Your Day</h2>
          <button
            onClick={onClose}
            className="text-[#C4C0C0] hover:text-[#5a5757] transition p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-[#A3A3A3]">Loading...</div>
          ) : (
            <>
              {/* Main Task */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-[#1c1b1b]">1. Must Complete</h3>
                  {mainSlots > 0 && (
                    <span className="text-xs bg-[#F3F3F3] text-[#5a5757] px-2 py-1 rounded">
                      {mainSlots} slot
                    </span>
                  )}
                </div>

                {todayState.main.length > 0 ? (
                  <div className="space-y-2">
                    {todayState.main.map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded"
                      >
                        <FaGripVertical className="text-[#C4C0C0]" size={14} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1c1b1b] truncate">{task.title}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveTask(task.id, 'main')}
                          className="text-red-600 hover:text-red-700 p-2 min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <FaTimes size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-[#F3F3F3] rounded text-sm text-[#A3A3A3]">
                    Select 1 main task for today
                  </div>
                )}

                {mainSlots > 0 && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {allTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => handleAddTask(task.id, 'main')}
                        className="w-full text-left flex items-center gap-3 p-3 bg-white hover:border-red-200 hover:bg-red-50 rounded transition"
                      >
                        <FaPlus className="text-[#C4C0C0] flex-shrink-0" size={14} />
                        <span className="text-sm text-[#5a5757] truncate">{task.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Secondary Tasks */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-[#1c1b1b]">2. Need to Complete</h3>
                  {secondarySlots > 0 && (
                    <span className="text-xs bg-[#F3F3F3] text-[#5a5757] px-2 py-1 rounded">
                      {secondarySlots} slots
                    </span>
                  )}
                </div>

                {todayState.secondary.length > 0 ? (
                  <div className="space-y-2">
                    {todayState.secondary.map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded"
                      >
                        <FaGripVertical className="text-[#C4C0C0]" size={14} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1c1b1b] truncate">{task.title}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveTask(task.id, 'secondary')}
                          className="text-amber-600 hover:text-amber-700 p-2 min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <FaTimes size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-[#F3F3F3] rounded text-sm text-[#A3A3A3]">
                    Select up to 2 secondary tasks
                  </div>
                )}

                {secondarySlots > 0 && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {allTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => handleAddTask(task.id, 'secondary')}
                        className="w-full text-left flex items-center gap-3 p-3 bg-white hover:border-amber-200 hover:bg-amber-50 rounded transition"
                      >
                        <FaPlus className="text-[#C4C0C0] flex-shrink-0" size={14} />
                        <span className="text-sm text-[#5a5757] truncate">{task.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Tasks */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-[#1c1b1b]">3. Nice to Complete</h3>
                  {additionalSlots > 0 && (
                    <span className="text-xs bg-[#F3F3F3] text-[#5a5757] px-2 py-1 rounded">
                      {additionalSlots} slots
                    </span>
                  )}
                </div>

                {todayState.additional.length > 0 ? (
                  <div className="space-y-2">
                    {todayState.additional.map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 bg-[#f0fafa] border border-transparent rounded"
                      >
                        <FaGripVertical className="text-[#C4C0C0]" size={14} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1c1b1b] truncate">{task.title}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveTask(task.id, 'additional')}
                          className="text-[#006766] hover:text-[#006766] p-2 min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <FaTimes size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-[#F3F3F3] rounded text-sm text-[#A3A3A3]">
                    Select up to 3 additional tasks
                  </div>
                )}

                {additionalSlots > 0 && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {allTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => handleAddTask(task.id, 'additional')}
                        className="w-full text-left flex items-center gap-3 p-3 bg-white hover:border-transparent hover:bg-[#f0fafa] rounded transition"
                      >
                        <FaPlus className="text-[#C4C0C0] flex-shrink-0" size={14} />
                        <span className="text-sm text-[#5a5757] truncate">{task.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Other Tasks (Additional) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-[#1c1b1b]">4. Additional</h3>
                  {otherSlots > 0 && (
                    <span className="text-xs bg-[#F3F3F3] text-[#5a5757] px-2 py-1 rounded">
                      {otherSlots} slots
                    </span>
                  )}
                </div>

                {todayState.other.length > 0 ? (
                  <div className="space-y-2">
                    {todayState.other.map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 bg-[#F3F3F3] border border-gray-300 rounded"
                      >
                        <FaGripVertical className="text-[#C4C0C0]" size={14} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1c1b1b] truncate">{task.title}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveTask(task.id, 'other')}
                          className="text-[#5a5757] hover:text-[#5a5757] p-2 min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <FaTimes size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-[#F3F3F3] rounded text-sm text-[#A3A3A3]">
                    Select up to 5 additional tasks
                  </div>
                )}

                {otherSlots > 0 && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {allTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => handleAddTask(task.id, 'other')}
                        className="w-full text-left flex items-center gap-3 p-3 bg-white hover:border-gray-300 hover:bg-[#F3F3F3] rounded transition"
                      >
                        <FaPlus className="text-[#C4C0C0] flex-shrink-0" size={14} />
                        <span className="text-sm text-[#5a5757] truncate">{task.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#F3F3F3] px-4 md:px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-accent-500 text-white rounded hover:bg-accent-600 transition font-medium min-h-[44px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
