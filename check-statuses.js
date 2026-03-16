const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const statuses = await prisma.status.findMany({
    where: { workspaceId: 'b68f4274-c19a-412c-8e26-4eead85dde0e' },
    orderBy: { sortOrder: 'asc' }
  })
  console.log('Current statuses:')
  statuses.forEach(s => {
    console.log(`  ${s.name} (${s.type}) - sortOrder: ${s.sortOrder}, id: ${s.id}`)
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error)
