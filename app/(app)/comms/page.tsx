'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CommsPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/agents?tab=comms') }, [router])
  return null
}
