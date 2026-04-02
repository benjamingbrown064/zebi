'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { LoginSchema } from '@/lib/schemas'
import { Input, Button } from '@heroui/react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const validation = LoginSchema.safeParse({ email, password })
      if (!validation.success) {
        setError(validation.error.errors[0].message)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      router.push('/dashboard')
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
            <div className="w-20 h-20 bg-[#000000] rounded flex items-center justify-center">
              <span className="font-semibold text-white text-3xl">Z</span>
            </div>
          </div>
          <h1 className="text-4xl font-semibold text-[#1A1A1A] mb-2">
            Zebi
          </h1>
          <p className="text-[#474747] text-[15px]">AI Business Operating System</p>
        </div>

        {/* Form Card */}
        <div className="bg-white  rounded p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-medium text-[#1A1A1A] mb-2">Welcome back</h2>
            <p className="text-[#474747] text-[15px]">Sign in to continue to your workspace</p>
          </div>

          {error && (
            <div className="p-4 bg-[#F3F3F3] border-l-2 border-[#1A1C1C] rounded-md mb-6">
              <p className="text-[13px] text-[#1A1C1C] font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
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
                className="w-full px-4 py-3 border border-[#D4D4D4] rounded text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#1A1C1C] transition"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-3 border border-[#D4D4D4] rounded text-[15px] text-[#1A1A1A] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#1A1C1C] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-5 py-3 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium text-[15px] transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 text-center">
            <p className="text-[13px] text-[#474747]">
              Don't have an account?{' '}
              <Link 
                href="/signup" 
                className="text-[#1A1C1C] hover:text-[#474747] font-medium transition"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[12px] text-[#A3A3A3] mt-8 px-4">
          By signing in, you agree to our{' '}
          <a href="#" className="hover:text-[#474747] transition">Terms</a>
          {' '}and{' '}
          <a href="#" className="hover:text-[#474747] transition">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
