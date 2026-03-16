// Transfer "My Workspace" to Ben's account
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function transferWorkspace() {
  try {
    const benUserId = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'
    const workspaceId = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
    
    console.log('🔄 Transferring "My Workspace" to benjamin@onebeyond.studio...\n')
    
    // Update workspace owner
    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { ownerId: benUserId }
    })
    
    console.log('✅ Workspace ownership updated!')
    console.log('   Workspace:', updated.name)
    console.log('   New owner:', updated.ownerId)
    console.log('')
    
    // Check if workspace member entry exists
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: workspaceId,
        userId: benUserId
      }
    })
    
    if (!existingMember) {
      // Create workspace member entry
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspaceId,
          userId: benUserId,
          role: 'owner'
        }
      })
      console.log('✅ Workspace member entry created')
    } else {
      console.log('✅ Workspace member entry already exists')
    }
    
    // Delete the empty "Ben's Workspace" that was created today
    const emptyWorkspace = 'e9474da5-a9cd-4042-896f-58399989a6d3'
    
    // First delete workspace members
    await prisma.workspaceMember.deleteMany({
      where: { workspaceId: emptyWorkspace }
    })
    
    // Then delete the workspace
    await prisma.workspace.delete({
      where: { id: emptyWorkspace }
    })
    
    console.log('✅ Deleted empty "Ben\'s Workspace" created today')
    console.log('')
    console.log('🎉 All done! Your data should now be visible at https://zebi.app')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

transferWorkspace()
