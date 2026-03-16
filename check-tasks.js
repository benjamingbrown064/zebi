const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        status: true,
        goal: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(`\n📊 Total tasks in database: ${tasks.length}\n`)
    
    if (tasks.length > 0) {
      tasks.forEach((task, i) => {
        const completed = task.completedAt ? ' ✅' : ''
        console.log(`${i + 1}. [P${task.priority}] ${task.title}${completed}`)
        console.log(`   Status: ${task.status.name} | Goal: ${task.goal?.name || 'None'}`)
        console.log()
      })
    } else {
      console.log('No tasks found')
    }
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
