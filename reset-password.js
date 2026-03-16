// Send password reset email
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://btuphkievfekuwkfqnib.supabase.co'
const supabaseAnonKey = 'sb_publishable_VJn6FPAW9bfgHxB6QMT7rA_jmOjM4Gw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function resetPassword(email) {
  console.log(`Sending password reset email to: ${email}`)
  
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `https://zebi.app/auth/reset-password`,
  })
  
  if (error) {
    console.error('Error:', error.message)
    return false
  }
  
  console.log('✅ Password reset email sent successfully!')
  console.log('Check your inbox at:', email)
  return true
}

resetPassword('benjamin@onebeyond.studio').catch(console.error)
