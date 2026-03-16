// Create workspace directly using Prisma
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createWorkspace(email, workspaceName = "Ben's Workspace") {
  try {
    console.log(`Looking for user with email: ${email}`)
    
    // Get user ID from Supabase auth.users
    // Note: Prisma can't directly query auth.users, so we need to use raw SQL
    const users = await prisma.$queryRaw`
      SELECT id, email FROM auth.users WHERE email = ${email}
    `
    
    if (!users || users.length === 0) {
      console.error('❌ User not found in auth.users')
      console.log('Please sign up first at https://zebi.app/signup')
      return false
    }
    
    const userId = users[0].id
    console.log('✅ Found user:', userId)
    
    // Check if workspace already exists
    const existingWorkspace = await prisma.workspace.findFirst({
      where: { ownerId: userId }
    })
    
    if (existingWorkspace) {
      console.log('✅ Workspace already exists:', existingWorkspace.id)
      return true
    }
    
    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceName,
        ownerId: userId,
        plan: 'free',
      }
    })
    
    console.log('✅ Workspace created successfully!')
    console.log('Workspace ID:', workspace.id)
    console.log('Name:', workspace.name)
    
    // Create workspace member entry
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: userId,
        role: 'owner',
      }
    })
    
    console.log('✅ Workspace member created')
    
    return true
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

createWorkspace('benjamin@onebeyond.studio')
