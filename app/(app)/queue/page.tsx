'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function Redirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    // Preserve agent param if present
    const agent = searchParams.get('agent')
    router.replace(`/agents?tab=queue${agent ? `&agent=${agent}` : ''}`)
  }, [router, searchParams])
  return null
}

export default function QueuePage() {
  return <Suspense fallback={null}><Redirect /></Suspense>
}
