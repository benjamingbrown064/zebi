#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OBJECTIVE_ID = '5007adfa-9367-45b6-8939-47b5cf28271b';
const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';

async function fixTaskStatuses() {
  try {
    console.log('🔧 Fixing task statuses for "Brand positioned" objective...\n');

    // First, find the "Inbox" status ID (default starting status)
    const inboxStatus = await prisma.status.findFirst({
      where: {
        workspaceId: WORKSPACE_ID,
        name: 'Inbox'
      }
    });

    if (!inboxStatus) {
      console.log('❌ Could not find "Inbox" status in database');
      return;
    }

    console.log(`✓ Found "Inbox" status: ${inboxStatus.id}\n`);

    // Find all tasks for this objective
    const allTasks = await prisma.task.findMany({
      where: {
        objectiveId: OBJECTIVE_ID
      },
      include: {
        status: true
      }
    });

    const tasksToFix = allTasks.filter(t => !t.statusId);

    console.log(`📋 Total tasks: ${allTasks.length}`);
    console.log(`📋 Tasks without status: ${tasksToFix.length}\n`);

    if (tasksToFix.length === 0) {
      console.log('✅ No tasks need fixing!');
      return;
    }

    // Update each task to use the inbox status
    console.log('Updating tasks...');
    for (const task of tasksToFix) {
      await prisma.task.update({
        where: { id: task.id },
        data: { statusId: inboxStatus.id }
      });
      console.log(`  ✓ ${task.title}`);
    }

    console.log(`\n✅ Updated ${tasksToFix.length} tasks to "Inbox" status\n`);

    // Verify the fix
    const verifyTasks = await prisma.task.findMany({
      where: {
        objectiveId: OBJECTIVE_ID
      },
      include: {
        status: true
      }
    });

    console.log('📊 VERIFICATION:\n');
    console.log('='.repeat(80));
    
    const statusCounts = {};
    verifyTasks.forEach(task => {
      const statusName = task.status?.name || 'NO STATUS';
      statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} tasks`);
    });
    
    console.log('='.repeat(80));
    console.log('\n✅ Fix complete! Tasks should now be visible in the UI.');
    console.log('   Refresh the Zebi app to see them.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixTaskStatuses();
