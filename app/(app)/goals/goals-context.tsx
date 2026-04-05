'use client'

import { createContext, useContext } from 'react'

interface GoalsContextType {
  onEdit: (goal: any) => void
  onDelete: (id: string) => void
}

const GoalsContext = createContext<GoalsContextType | null>(null)

export function GoalsProvider({ 
  children, 
  onEdit, 
  onDelete 
}: { 
  children: React.ReactNode
  onEdit: (goal: any) => void
  onDelete: (id: string) => void
}) {
  return (
    <GoalsContext.Provider value={{ onEdit, onDelete }}>
      {children}
    </GoalsContext.Provider>
  )
}

export function useGoalsContext() {
  const context = useContext(GoalsContext)
  if (!context) {
    throw new Error('useGoalsContext must be used within GoalsProvider')
  }
  return context
}
