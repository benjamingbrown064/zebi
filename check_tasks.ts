import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTasks() {
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
      archivedAt: null
    },
    include: {
      company: { select: { name: true } },
      project: { select: { name: true } },
      objective: { select: { title: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  console.log(`Total active tasks: ${tasks.length}`)
  console.log('\nTasks:')
  tasks.forEach(t => {
    console.log(`- ${t.title}`)
    console.log(`  Company: ${t.company?.name || 'None'}`)
    console.log(`  Project: ${t.project?.name || 'None'}`)
    console.log(`  Objective: ${t.objective?.title || 'None'}`)
  })

  await prisma.$disconnect()
}

checkTasks()
