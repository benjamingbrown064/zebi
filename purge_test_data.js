const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    // Delete all test goals
    const deletedGoals = await prisma.goal.deleteMany({
      where: {
        name: {
          contains: 'Complete the task app',
        },
      },
    })

    console.log(`✅ Deleted ${deletedGoals.count} test goal(s)`)

    // Verify database is clean
    const goals = await prisma.goal.findMany()
    const tasks = await prisma.task.findMany()
    const statuses = await prisma.status.findMany()

    console.log(`\n📊 Database state:`)
    console.log(`  Tasks: ${tasks.length}`)
    console.log(`  Goals: ${goals.length}`)
    console.log(`  Statuses: ${statuses.length}`)
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
