const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    const goalId = 'f8f4cadc-ff4b-4bfc-aa25-45179877d931'
    
    const tasks = await prisma.task.findMany({
      where: {
        goalId: goalId,
      },
      include: {
        status: true,
        goal: true,
      },
    })

    console.log(`Found ${tasks.length} tasks for goal "Complete the task app development":`)
    tasks.forEach((task) => {
      console.log(`\nTask: ${task.title}`)
      console.log(`  ID: ${task.id}`)
      console.log(`  Priority: P${task.priority}`)
      console.log(`  Status: ${task.status.name}`)
      console.log(`  Description: ${task.description || '(none)'}`)
    })
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
