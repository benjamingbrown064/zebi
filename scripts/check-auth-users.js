const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  // Use service role key to query auth.users (need to set this in env if available)
  // For now, use anon key and try to get data another way
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function main() {
  // Check the WorkspaceMember users
  const targetUserIds = [
    'dc949f3d-2077-4ff7-8dc2-2a54454b7d74',
    'bdd884e9-03bd-44f2-909c-68ab0ab1bfc4'
  ]
  
  console.log('Target user IDs in My Workspace:', targetUserIds)
  console.log('\nNote: To query auth.users, we need the SUPABASE_SERVICE_ROLE_KEY')
  console.log('For now, we know the workspaceId is: dfd6d384-9e2f-4145-b4f3-254aa82c0237')
}

main().catch(console.error)
