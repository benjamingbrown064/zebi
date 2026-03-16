#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';

async function checkAllObjectiveTasks() {
  try {
    console.log('🔍 Checking all objectives for tasks without status...\n');

    // Get all objectives with their tasks
    const objectives = await prisma.objective.findMany({
      where: {
        workspaceId: WORKSPACE_ID
      },
      include: {
        tasks: {
          include: {
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${objectives.length} objectives\n`);
    console.log('='.repeat(80));

    let totalTasksMissingStatus = 0;
    const objectivesWithIssues = [];

    for (const obj of objectives) {
      const tasksWithoutStatus = obj.tasks.filter(t => !t.statusId);
      
      if (obj.tasks.length > 0) {
        console.log(`\n${obj.title}`);
        console.log(`  Total tasks: ${obj.tasks.length}`);
        console.log(`  Tasks without status: ${tasksWithoutStatus.length}`);
        console.log(`  Objective progress: ${obj.progressPercent}%`);
        
        if (tasksWithoutStatus.length > 0) {
          totalTasksMissingStatus += tasksWithoutStatus.length;
          objectivesWithIssues.push({
            id: obj.id,
            title: obj.title,
            count: tasksWithoutStatus.length,
            tasks: tasksWithoutStatus
          });
        }

        // Calculate what progress SHOULD be based on tasks
        const completedTasks = obj.tasks.filter(t => 
          t.status?.type === 'done' || t.status?.name === 'Done'
        ).length;
        const calculatedProgress = obj.tasks.length > 0 
          ? Math.round((completedTasks / obj.tasks.length) * 100)
          : 0;

        if (calculatedProgress !== obj.progressPercent) {
          console.log(`  ⚠️  Progress mismatch: Should be ${calculatedProgress}% (${completedTasks}/${obj.tasks.length} done)`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 SUMMARY:`);
    console.log(`  Total objectives: ${objectives.length}`);
    console.log(`  Objectives with tasks: ${objectives.filter(o => o.tasks.length > 0).length}`);
    console.log(`  Objectives with status issues: ${objectivesWithIssues.length}`);
    console.log(`  Total tasks missing status: ${totalTasksMissingStatus}`);

    if (objectivesWithIssues.length > 0) {
      console.log('\n🔧 NEEDS FIXING:');
      objectivesWithIssues.forEach(obj => {
        console.log(`  • ${obj.title}: ${obj.count} tasks`);
      });
    }

    return objectivesWithIssues;

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllObjectiveTasks();
