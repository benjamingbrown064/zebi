'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TaskDetailModal from '@/components/TaskDetailModal'
import Sidebar from '@/components/Sidebar'
import { updateTask, deleteTask } from '@/app/actions/tasks'

interface TaskDetailClientProps {
  task: any
  statuses: any[]
  workspaceId: string
}

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

export default function TaskDetailClient({
  task,
  statuses,
  workspaceId,
}: TaskDetailClientProps) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentTask, setCurrentTask] = useState(task)

  // Auto-open modal on mount
  const [isModalOpen, setIsModalOpen] = useState(true)

  // When modal closes, navigate back
  const handleClose = () => {
    setIsModalOpen(false)
    // Use router.back() to return to previous page (board/dashboard/tasks list)
    router.back()
  }

  const handleUpdate = async (taskId: string, updates: any) => {
    try {
      const updatedTask = await updateTask(workspaceId, taskId, updates)
      if (updatedTask) {
        setCurrentTask(updatedTask)
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(workspaceId, taskId)
      // After delete, go back to previous page
      router.back()
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  return (
    <div className="min-h-screen bg-bg-cream">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}>
        {/* Main content - just show empty state since modal will overlay */}
        <div className="p-8">
          <div className="text-center text-[#A3A3A3] py-20">
            Loading task details...
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isModalOpen}
        onClose={handleClose}
        task={currentTask}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        workspaceId={workspaceId}
        userId={PLACEHOLDER_USER_ID}
        userName="You"
        statuses={statuses}
      />
    </div>
  )
}
