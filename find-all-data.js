// Find ALL workspaces with data
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function findAllData() {
  try {
    console.log('🔍 Searching all workspaces for data...\n')
    
    const workspaces = await prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Total workspaces: ${workspaces.length}\n`)
    
    for (const ws of workspaces) {
      const [goals, companies, objectives, projects, tasks] = await Promise.all([
        prisma.goal.count({ where: { workspaceId: ws.id } }),
        prisma.company.count({ where: { workspaceId: ws.id } }),
        prisma.objective.count({ where: { workspaceId: ws.id } }),
        prisma.project.count({ where: { workspaceId: ws.id } }),
        prisma.task.count({ where: { workspaceId: ws.id } })
      ])
      
      const total = goals + companies + objectives + projects + tasks
      
      if (total > 0) {
        console.log(`✅ ${ws.name} (${ws.id})`)
        console.log(`   Owner: ${ws.ownerId || 'NULL'}`)
        console.log(`   Created: ${ws.createdAt}`)
        console.log(`   Goals: ${goals}, Companies: ${companies}, Objectives: ${objectives}, Projects: ${projects}, Tasks: ${tasks}`)
        console.log(`   TOTAL: ${total} items`)
        console.log('')
        
        // Get user email for this workspace
        if (ws.ownerId) {
          const owner = await prisma.$queryRaw`
            SELECT email FROM auth.users WHERE id = ${ws.ownerId}
          `
          if (owner && owner.length > 0) {
            console.log(`   Owner email: ${owner[0].email}`)
            console.log('')
          }
        }
      }
    }
    
    console.log('\n⚠️  Empty workspaces:')
    for (const ws of workspaces) {
      const [goals, companies, objectives, projects, tasks] = await Promise.all([
        prisma.goal.count({ where: { workspaceId: ws.id } }),
        prisma.company.count({ where: { workspaceId: ws.id } }),
        prisma.objective.count({ where: { workspaceId: ws.id } }),
        prisma.project.count({ where: { workspaceId: ws.id } }),
        prisma.task.count({ where: { workspaceId: ws.id } })
      ])
      
      const total = goals + companies + objectives + projects + tasks
      
      if (total === 0) {
        console.log(`  - ${ws.name} (${ws.id}) - Owner: ${ws.ownerId || 'NULL'}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

findAllData()
