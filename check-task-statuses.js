#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OBJECTIVE_ID = '5007adfa-9367-45b6-8939-47b5cf28271b';

async function checkTaskStatuses() {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        objectiveId: OBJECTIVE_ID
      },
      include: {
        status: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📋 Found ${tasks.length} tasks\n`);
    console.log('='.repeat(80));

    tasks.forEach(task => {
      console.log(`Task: ${task.title}`);
      console.log(`  statusId: ${task.statusId}`);
      console.log(`  status: ${task.status ? task.status.name : 'NO STATUS RELATION'}`);
      console.log('');
    });

    console.log('='.repeat(80));

    // Count by status
    const bystatus = {};
    tasks.forEach(task => {
      const name = task.status ? task.status.name : 'NULL';
      bystatus[name] = (bystatus[name] || 0) + 1;
    });

    console.log('\n📊 Status distribution:');
    Object.entries(bystatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkTaskStatuses();
