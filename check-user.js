// Quick script to check user status in Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://btuphkievfekuwkfqnib.supabase.co'
const supabaseAnonKey = 'sb_publishable_VJn6FPAW9bfgHxB6QMT7rA_jmOjM4Gw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkUser(email) {
  console.log(`Checking user: ${email}`)
  
  // Try to query workspaces to see if user exists
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('*')
    .limit(10)
  
  if (error) {
    console.log('Error querying workspaces:', error.message)
  } else {
    console.log('Found workspaces:', workspaces?.length || 0)
    if (workspaces && workspaces.length > 0) {
      console.log('Sample workspace:', workspaces[0])
    }
  }
  
  // Try to query users table
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('email')
    .eq('email', email)
  
  if (usersError) {
    console.log('Error querying users:', usersError.message)
  } else {
    console.log('Found user:', users)
  }
}

checkUser('benjamin@onebeyond.studio').catch(console.error)
