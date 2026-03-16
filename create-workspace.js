// Create workspace for existing user
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://btuphkievfekuwkfqnib.supabase.co'
const supabaseAnonKey = 'sb_publishable_VJn6FPAW9bfgHxB6QMT7rA_jmOjM4Gw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createWorkspaceForUser(email, password, workspaceName = "Ben's Workspace") {
  console.log(`Creating workspace for: ${email}`)
  
  // Step 1: Sign in to get user ID
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (authError) {
    console.error('❌ Login failed:', authError.message)
    console.log('Try signing up first if account does not exist')
    return false
  }
  
  console.log('✅ Logged in successfully')
  console.log('User ID:', authData.user.id)
  
  // Step 2: Check if workspace already exists
  const { data: existingWorkspaces, error: checkError } = await supabase
    .from('Workspace')
    .select('*')
    .eq('ownerId', authData.user.id)
  
  if (checkError) {
    console.error('❌ Error checking workspaces:', checkError.message)
  } else if (existingWorkspaces && existingWorkspaces.length > 0) {
    console.log('✅ Workspace already exists:', existingWorkspaces[0])
    return true
  }
  
  // Step 3: Create workspace via API
  console.log('Creating new workspace via API...')
  
  const response = await fetch('https://zebi.app/api/workspaces', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session.access_token}`,
    },
    body: JSON.stringify({
      name: workspaceName,
      userId: authData.user.id,
    }),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    console.error('❌ Failed to create workspace:', errorData)
    return false
  }
  
  const workspaceData = await response.json()
  console.log('✅ Workspace created successfully!')
  console.log('Workspace:', workspaceData)
  
  return true
}

// Get password from command line argument
const password = process.argv[2]

if (!password) {
  console.log('Usage: node create-workspace.js <password>')
  console.log('Example: node create-workspace.js yourpassword')
  process.exit(1)
}

createWorkspaceForUser('benjamin@onebeyond.studio', password).catch(console.error)
