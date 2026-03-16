/**
 * Migration script to add 'Review' status to all workspaces
 * Run with: node scripts/add-review-status.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function addReviewStatus() {
  console.log('🚀 Starting Review status migration...')
  
  try {
    // Get all workspaces
    const workspaces = await prisma.workspace.findMany({
      select: { id: true, name: true }
    })
    
    console.log(`📊 Found ${workspaces.length} workspace(s)`)
    
    let created = 0
    let skipped = 0
    
    for (const workspace of workspaces) {
      // Check if Review status already exists
      const existing = await prisma.status.findFirst({
        where: {
          workspaceId: workspace.id,
          type: 'review'
        }
      })
      
      if (existing) {
        console.log(`⏭️  Workspace "${workspace.name}": Review status already exists`)
        skipped++
        continue
      }
      
      // Create Review status
      await prisma.status.create({
        data: {
          workspaceId: workspace.id,
          name: 'Review',
          type: 'review',
          isSystem: true,
          sortOrder: 40, // Between doing (30) and done (50)
        }
      })
      
      console.log(`✅ Workspace "${workspace.name}": Review status created`)
      created++
    }
    
    console.log('\n🎉 Migration complete!')
    console.log(`   Created: ${created}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Total: ${workspaces.length}`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
addReviewStatus()
