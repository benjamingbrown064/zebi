'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Input, Button } from '@heroui/react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase embeds the tokens in the URL hash on redirect.
    // The SSR client picks them up automatically; we just need to wait
    // for the session to be established before allowing the form to submit.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true)
      } else {
        // Hash tokens not yet exchanged — listen for the event
        const { data: listener } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            setReady(true)
          }
        })
        return () => listener.subscription.unsubscribe()
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="w-20 h-20 bg-[#000000] rounded flex items-center justify-center">
              <span className="font-semibold text-white text-3xl">Z</span>
            </div>
          </div>
          <h1 className="text-4xl font-semibold text-[#1A1A1A] mb-2">Set new password</h1>
          <p className="text-[#666666] text-base">Choose a strong password for your account.</p>
        </div>

        {done ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[#1A1A1A] font-medium">Password updated. Redirecting you to login…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              label="New password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="bordered"
              classNames={{
                input: 'text-[#1A1A1A]',
                label: 'text-[#666666]',
              }}
              isDisabled={!ready}
            />
            <Input
              type="password"
              label="Confirm new password"
              placeholder="Repeat your new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              variant="bordered"
              classNames={{
                input: 'text-[#1A1A1A]',
                label: 'text-[#666666]',
              }}
              isDisabled={!ready}
            />

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            {!ready && (
              <p className="text-[#999999] text-sm text-center">Verifying reset link…</p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#000000] text-white font-medium h-12"
              isLoading={loading}
              isDisabled={!ready || loading}
            >
              Set new password
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
