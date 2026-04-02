'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { SignupSchema } from '@/lib/schemas'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const validation = SignupSchema.safeParse({
        email,
        password,
        confirmPassword,
        workspaceName,
      })

      if (!validation.success) {
        setError(validation.error.errors[0].message)
        return
      }

      // Step 1: Sign up the user
      const { data: signupData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Don't send confirmation email - we'll handle onboarding directly
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (!signupData.user) {
        setError('Sign up failed. Please try again.')
        return
      }

      // Step 2: Explicitly sign in to establish session
      // (In case email confirmation is disabled, this ensures we have a valid session)
      const { data: signinData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // If email confirmation is required, inform the user
        if (signInError.message.includes('Email not confirmed')) {
          setError('Please check your email to confirm your account before signing in.')
          return
        }
        setError(signInError.message)
        return
      }

      if (!signinData.session) {
        setError('Failed to establish session. Please try logging in.')
        return
      }

      // Step 3: Create workspace with authenticated session
      const createWorkspaceResponse = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceName,
          userId: signupData.user.id,
        }),
      })

      if (!createWorkspaceResponse.ok) {
        const errorData = await createWorkspaceResponse.json()
        setError(errorData.error || 'Failed to create workspace')
        return
      }

      // Step 4: Verify workspace was created by fetching it
      const verifyWorkspaceResponse = await fetch('/api/workspaces/current')
      
      if (!verifyWorkspaceResponse.ok) {
        setError('Workspace created but failed to load. Please try logging in.')
        return
      }

      // Step 5: All good! Send new users through the first-value flow
      router.push('/start')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
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
            <div className="w-20 h-20 bg-[#DD3A44] rounded flex items-center justify-center">
              <span className="font-semibold text-white text-3xl">Z</span>
            </div>
          </div>
          <h1 className="text-4xl font-semibold text-[#1A1A1A] mb-2">
            Zebi
          </h1>
          <p className="text-[#525252] text-[15px]">AI Business Operating System</p>
        </div>

        {/* Form Card */}
        <div className="bg-white  rounded p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Get started</h2>
            <p className="text-[#525252] text-[15px]">Create your account and workspace</p>
          </div>

          {error && (
            <div className="p-4 bg-[#FEF2F2] border-l-2 border-[#DD3A44] rounded-md mb-6">
              <p className="text-[13px] text-[#DD3A44] font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-3 border border-[#D4D4D4] rounded text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                Workspace name
              </label>
              <input
                type="text"
                placeholder="My Space"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-3 border border-[#D4D4D4] rounded text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-3 border border-[#D4D4D4] rounded text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                Confirm password
              </label>
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-3 border border-[#D4D4D4] rounded text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#DD3A44] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-5 py-3 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded font-medium text-[15px] transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 pt-6 text-center">
            <p className="text-[13px] text-[#525252]">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="text-[#DD3A44] hover:text-[#C7333D] font-medium transition"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[12px] text-[#A3A3A3] mt-8 px-4">
          By creating an account, you agree to our{' '}
          <a href="#" className="hover:text-[#525252] transition">Terms</a>
          {' '}and{' '}
          <a href="#" className="hover:text-[#525252] transition">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
