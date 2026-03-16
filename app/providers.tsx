'use client'

import { HeroUIProvider } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { WorkspaceProvider } from '@/lib/use-workspace'
import QueryProvider from '@/components/providers/QueryProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <QueryProvider>
      <HeroUIProvider navigate={router.push}>
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </HeroUIProvider>
    </QueryProvider>
  )
}
