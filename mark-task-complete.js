const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    const taskId = 'df8cffe7-b5d6-448d-a4c8-2aab1b7c47ce'
    const doneStatus = await prisma.status.findFirst({
      where: {
        type: 'done',
      },
    })

    if (!doneStatus) {
      console.error('Done status not found')
      return
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        statusId: doneStatus.id,
        completedAt: new Date(),
      },
      include: {
        status: true,
        goal: true,
      },
    })

    console.log('✅ Task marked as complete!')
    console.log(`Title: ${updated.title}`)
    console.log(`Status: ${updated.status.name}`)
    console.log(`Completed at: ${updated.completedAt}`)
    if (updated.goal) {
      console.log(`Goal: ${updated.goal.name}`)
    }
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
