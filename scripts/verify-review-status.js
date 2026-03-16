/**
 * Verification script to check that Review status exists
 * Run with: node scripts/verify-review-status.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verifyReviewStatus() {
  console.log('🔍 Verifying Review status...\n')
  
  try {
    // Get all workspaces and their statuses
    const workspaces = await prisma.workspace.findMany({
      include: {
        statuses: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })
    
    for (const workspace of workspaces) {
      console.log(`📁 Workspace: ${workspace.name}`)
      console.log(`   ID: ${workspace.id}`)
      console.log(`   Statuses:`)
      
      workspace.statuses.forEach(status => {
        const icon = status.type === 'review' ? '✨' : '  '
        console.log(`   ${icon} ${status.name.padEnd(10)} | Type: ${status.type.padEnd(10)} | Sort: ${status.sortOrder} | System: ${status.isSystem}`)
      })
      
      const reviewStatus = workspace.statuses.find(s => s.type === 'review')
      if (reviewStatus) {
        console.log(`   ✅ Review status exists!`)
      } else {
        console.log(`   ❌ Review status NOT found!`)
      }
      console.log()
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run verification
verifyReviewStatus()
