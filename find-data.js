// Find all workspaces and data for user
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function findUserData(email) {
  try {
    console.log(`Looking for data for: ${email}`)
    
    // Get user ID
    const users = await prisma.$queryRaw`
      SELECT id, email FROM auth.users WHERE email = ${email}
    `
    
    if (!users || users.length === 0) {
      console.error('❌ User not found')
      return
    }
    
    const userId = users[0].id
    console.log('✅ User ID:', userId)
    console.log('')
    
    // Find ALL workspaces (not just owner)
    const allWorkspaces = await prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Total workspaces in database: ${allWorkspaces.length}`)
    console.log('')
    
    // Find workspaces where user is owner
    const ownedWorkspaces = await prisma.workspace.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📁 Workspaces owned by ${email}: ${ownedWorkspaces.length}`)
    for (const ws of ownedWorkspaces) {
      console.log(`  - ${ws.name} (${ws.id})`)
      console.log(`    Created: ${ws.createdAt}`)
    }
    console.log('')
    
    // Find workspaces where user is a member
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true }
    })
    
    console.log(`👥 Workspace memberships: ${memberships.length}`)
    for (const member of memberships) {
      console.log(`  - ${member.workspace.name} (${member.workspace.id})`)
      console.log(`    Role: ${member.role}`)
    }
    console.log('')
    
    // Check for data in each workspace
    for (const ws of ownedWorkspaces) {
      console.log(`\n🔍 Checking data in workspace: ${ws.name} (${ws.id})`)
      
      const [goals, companies, objectives, projects, tasks] = await Promise.all([
        prisma.goal.count({ where: { workspaceId: ws.id } }),
        prisma.company.count({ where: { workspaceId: ws.id } }),
        prisma.objective.count({ where: { workspaceId: ws.id } }),
        prisma.project.count({ where: { workspaceId: ws.id } }),
        prisma.task.count({ where: { workspaceId: ws.id } })
      ])
      
      console.log(`  Goals: ${goals}`)
      console.log(`  Companies: ${companies}`)
      console.log(`  Objectives: ${objectives}`)
      console.log(`  Projects: ${projects}`)
      console.log(`  Tasks: ${tasks}`)
      
      const total = goals + companies + objectives + projects + tasks
      if (total > 0) {
        console.log(`  ✅ HAS DATA (${total} items)`)
      } else {
        console.log(`  ⚠️  EMPTY`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

findUserData('benjamin@onebeyond.studio')
