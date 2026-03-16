// Search for missing workspace data
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function searchMissingData() {
  try {
    const benUserId = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'
    
    console.log('🔍 Searching for missing data...\n')
    console.log('Ben user ID:', benUserId)
    console.log('')
    
    // Check when Ben's user account was created
    const benUser = await prisma.$queryRaw`
      SELECT email, created_at, updated_at FROM auth.users WHERE id = ${benUserId}::uuid
    `
    
    if (benUser && benUser.length > 0) {
      console.log('📅 Account created:', benUser[0].created_at)
      console.log('📅 Last updated:', benUser[0].updated_at)
      console.log('')
    }
    
    // Find ALL workspaces and check creation dates
    const allWorkspaces = await prisma.workspace.findMany({
      orderBy: { createdAt: 'asc' }
    })
    
    console.log('📊 All workspaces in database:\n')
    
    for (const ws of allWorkspaces) {
      const [goals, companies, objectives, projects, tasks] = await Promise.all([
        prisma.goal.count({ where: { workspaceId: ws.id } }),
        prisma.company.count({ where: { workspaceId: ws.id } }),
        prisma.objective.count({ where: { workspaceId: ws.id } }),
        prisma.project.count({ where: { workspaceId: ws.id } }),
        prisma.task.count({ where: { workspaceId: ws.id } })
      ])
      
      const total = goals + companies + objectives + projects + tasks
      
      console.log(`${total > 0 ? '✅' : '⚪'} ${ws.name}`)
      console.log(`   ID: ${ws.id}`)
      console.log(`   Owner: ${ws.ownerId || 'NULL'}`)
      console.log(`   Created: ${ws.createdAt}`)
      console.log(`   Data: Goals:${goals}, Companies:${companies}, Objectives:${objectives}, Projects:${projects}, Tasks:${tasks}`)
      
      if (ws.ownerId) {
        const owner = await prisma.$queryRaw`
          SELECT email FROM auth.users WHERE id = ${ws.ownerId}::uuid
        `
        if (owner && owner.length > 0) {
          console.log(`   Owner email: ${owner[0].email}`)
        }
      }
      console.log('')
    }
    
    // Check for workspaces with NULL owner (orphaned)
    console.log('\n🔍 Checking for orphaned workspaces (NULL owner)...')
    const orphaned = allWorkspaces.filter(ws => !ws.ownerId)
    console.log(`Found ${orphaned.length} orphaned workspaces`)
    
    // Check workspace members for Ben's user ID
    console.log('\n🔍 Checking workspace memberships for benjamin@onebeyond.studio...')
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: benUserId }
    })
    console.log(`Found ${memberships.length} membership(s)`)
    
    // Check workspace history
    console.log('\n🔍 Looking for patterns in workspace creation times...')
    const benWorkspace = allWorkspaces.find(ws => ws.id === 'e9474da5-a9cd-4042-896f-58399989a6d3')
    if (benWorkspace) {
      console.log('Ben\'s current workspace created:', benWorkspace.createdAt)
      console.log('This was created TODAY - the data should be from before this.')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

searchMissingData()
