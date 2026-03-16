const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const members = await prisma.workspaceMember.findMany({
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    take: 10,
  })
  
  console.log(JSON.stringify(members, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
