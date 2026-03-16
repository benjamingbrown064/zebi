#!/usr/bin/env node
/**
 * Recalculate all objective progress based on task completion
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

async function recalculateAllProgress() {
  try {
    console.log('🔧 Recalculating objective progress based on task completion...\n')

    // Get all objectives with their tasks
    const objectives = await prisma.objective.findMany({
      where: { workspaceId: WORKSPACE_ID },
      include: {
        tasks: {
          include: { status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`📊 Found ${objectives.length} objectives\n`)
    console.log('='.repeat(80))

    let updated = 0
    let unchanged = 0

    for (const objective of objectives) {
      if (objective.tasks.length === 0) {
        console.log(`⏭️  ${objective.title}`)
        console.log(`   No tasks - skipping\n`)
        continue
      }

      // Calculate progress based on completed tasks
      const completedTasks = objective.tasks.filter(task =>
        task.status?.type === 'done'
      ).length

      const calculatedProgress = Math.round((completedTasks / objective.tasks.length) * 100)
      const oldProgress = Number(objective.progressPercent)

      if (calculatedProgress !== oldProgress) {
        // Update objective
        await prisma.objective.update({
          where: { id: objective.id },
          data: {
            progressPercent: calculatedProgress,
            currentValue: calculatedProgress
          }
        })

        console.log(`✅ ${objective.title}`)
        console.log(`   ${oldProgress}% → ${calculatedProgress}% (${completedTasks}/${objective.tasks.length} tasks done)\n`)
        updated++
      } else {
        console.log(`✓  ${objective.title}`)
        console.log(`   ${calculatedProgress}% (already correct)\n`)
        unchanged++
      }
    }

    console.log('='.repeat(80))
    console.log(`\n📊 SUMMARY:`)
    console.log(`   Total objectives: ${objectives.length}`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Unchanged: ${unchanged}`)
    console.log(`   Skipped (no tasks): ${objectives.length - updated - unchanged}`)
    console.log(`\n✅ Recalculation complete!`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

recalculateAllProgress()
