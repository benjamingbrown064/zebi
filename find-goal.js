const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    const goals = await prisma.goal.findMany({
      where: {
        name: {
          contains: 'Complete the task app development',
          mode: 'insensitive',
        },
      },
      include: {
        tasks: true,
      },
    })

    if (goals.length > 0) {
      console.log('Found goals:')
      goals.forEach((goal) => {
        console.log(`\nGoal: ${goal.name}`)
        console.log(`  ID: ${goal.id}`)
        console.log(`  Metric Type: ${goal.metricType}`)
        console.log(`  Target: ${goal.targetValue}`)
        console.log(`  Current: ${goal.currentValue}`)
        console.log(`  Tasks linked: ${goal.tasks.length}`)
      })
    } else {
      console.log('No goals found with that name')
      console.log('\nAll goals:')
      const allGoals = await prisma.goal.findMany({
        include: {
          tasks: true,
        },
      })
      allGoals.forEach((goal) => {
        console.log(`- ${goal.name} (${goal.metricType})`)
      })
    }
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
