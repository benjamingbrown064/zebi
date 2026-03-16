const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const workspaceId = 'b68f4274-c19a-412c-8e26-4eead85dde0e'
  
  // Check if Check status already exists
  const existing = await prisma.status.findFirst({
    where: { workspaceId, type: 'check' }
  })
  
  if (existing) {
    console.log('Check status already exists:', existing)
    return
  }
  
  // Add Check status after Done (sortOrder 5)
  const checkStatus = await prisma.status.create({
    data: {
      workspaceId,
      name: 'Check',
      type: 'check',
      isSystem: true,
      sortOrder: 5
    }
  })
  
  console.log('Created Check status:', checkStatus)
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error)
