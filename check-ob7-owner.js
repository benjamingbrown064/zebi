// Check owner of OB7 workspace
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkOwner() {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: '879287db-c800-40fd-9ad4-fdfd0b1987a0' }
    })
    
    console.log('📊 Workspace:', workspace.name)
    console.log('Owner ID:', workspace.ownerId)
    console.log('')
    
    // Get owner email using proper UUID casting
    const owner = await prisma.$queryRaw`
      SELECT email, created_at FROM auth.users WHERE id = ${workspace.ownerId}::uuid
    `
    
    if (owner && owner.length > 0) {
      console.log('✅ Owner email:', owner[0].email)
      console.log('Account created:', owner[0].created_at)
    } else {
      console.log('❌ Owner not found in auth.users')
    }
    
    // Check workspace members
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id }
    })
    
    console.log('\n👥 Workspace members:', members.length)
    for (const member of members) {
      const memberUser = await prisma.$queryRaw`
        SELECT email FROM auth.users WHERE id = ${member.userId}::uuid
      `
      if (memberUser && memberUser.length > 0) {
        console.log(`  - ${memberUser[0].email} (${member.role})`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkOwner()
