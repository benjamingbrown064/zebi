import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
const DEFAULT_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

async function migrateActionPlans() {
  console.log('Starting action plan migration...')

  // Get all objectives with action plans
  const objectives = await prisma.objective.findMany({
    where: {
      workspaceId: DEFAULT_WORKSPACE_ID,
      aiActionPlan: {
        not: Prisma.DbNull
      }
    },
    select: {
      id: true,
      title: true,
      aiActionPlan: true
    }
  })

  console.log(`Found ${objectives.length} objectives with action plans`)

  // Get inbox status for new tasks
  const inboxStatus = await prisma.status.findFirst({
    where: {
      workspaceId: DEFAULT_WORKSPACE_ID,
      type: 'inbox'
    }
  })

  if (!inboxStatus) {
    console.error('No inbox status found - cannot migrate')
    return
  }

  let migratedCount = 0

  for (const objective of objectives) {
    const actionPlan = objective.aiActionPlan as any

    if (!actionPlan || !Array.isArray(actionPlan.steps)) {
      console.log(`Skipping objective ${objective.id} - no valid action plan steps`)
      continue
    }

    console.log(`\nMigrating ${actionPlan.steps.length} steps from objective: ${objective.title}`)

    for (const step of actionPlan.steps) {
      const taskTitle = step.title || step.description || 'Untitled task'
      
      // Create task from action plan step
      await prisma.task.create({
        data: {
          workspaceId: DEFAULT_WORKSPACE_ID,
          title: taskTitle,
          description: step.description || null,
          priority: step.priority || 3,
          statusId: inboxStatus.id,
          objectiveId: objective.id,
          createdBy: DEFAULT_USER_ID,
          aiGenerated: true,
          aiAgent: 'action-plan-migration'
        }
      })

      migratedCount++
      console.log(`  ✓ Created task: ${taskTitle}`)
    }

    // Clear the action plan from objective
    await prisma.objective.update({
      where: { id: objective.id },
      data: { aiActionPlan: Prisma.DbNull }
    })

    console.log(`  ✓ Cleared action plan from objective`)
  }

  console.log(`\n✅ Migration complete: ${migratedCount} tasks created from action plans`)
  await prisma.$disconnect()
}

migrateActionPlans().catch(console.error)
