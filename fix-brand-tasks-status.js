#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OBJECTIVE_ID = '5007adfa-9367-45b6-8939-47b5cf28271b';

async function fixTaskStatuses() {
  try {
    console.log('🔧 Fixing task statuses for "Brand positioned" objective...\n');

    // Find all tasks for this objective (we'll check status in JS)
    const allTasks = await prisma.task.findMany({
      where: {
        objectiveId: OBJECTIVE_ID
      }
    });

    const tasksToFix = allTasks.filter(t => !t.status || t.status === null);

    console.log(`📋 Found ${tasksToFix.length} tasks with undefined/null status\n`);

    if (tasksToFix.length === 0) {
      console.log('✅ No tasks need fixing!');
      return;
    }

    // Update each task individually to 'todo' status
    for (const task of tasksToFix) {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'todo' }
      });
    }

    console.log(`✅ Updated ${tasksToFix.length} tasks to status: 'todo'\n`);

    console.log(`✅ Updated ${result.count} tasks to status: 'todo'\n`);

    // Verify the fix
    const verifyTasks = await prisma.task.findMany({
      where: {
        objectiveId: OBJECTIVE_ID
      },
      select: {
        id: true,
        title: true,
        status: true
      }
    });

    console.log('📊 VERIFICATION - All tasks now have status:\n');
    console.log('='.repeat(80));
    verifyTasks.forEach(task => {
      console.log(`  ✓ [${task.status?.toUpperCase() || 'NULL'}] ${task.title}`);
    });
    console.log('='.repeat(80));

    // Check status distribution
    const statusCounts = verifyTasks.reduce((acc, task) => {
      const status = task.status || 'null';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 Status distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\n✅ Fix complete! Tasks should now be visible in the UI.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixTaskStatuses();
