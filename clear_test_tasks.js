const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    // Delete all tasks with completedAt set (which includes that test task)
    const deleted = await prisma.task.deleteMany({
      where: {
        completedAt: {
          not: null,
        },
      },
    })

    console.log(`✅ Deleted ${deleted.count} completed test task(s)`)

    // Verify remaining tasks
    const remaining = await prisma.task.findMany({
      include: { status: true, goal: true },
    })

    console.log(`\n📊 Remaining tasks: ${remaining.length}`)
    remaining.forEach((t) => {
      console.log(`- ${t.title} (${t.status.name})`)
    })
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
