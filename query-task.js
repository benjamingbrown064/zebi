const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    const task = await prisma.task.findFirst({
      where: {
        title: {
          contains: 'Complete the task app development',
          mode: 'insensitive',
        },
      },
      include: {
        status: true,
        goal: true,
      },
    })

    if (task) {
      console.log(JSON.stringify(task, null, 2))
    } else {
      console.log('Task not found')
    }
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
