#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:patxev-sodhyn-2oa90a@db.btuphkievfekuwkfqnib.supabase.co:6543/postgres?pgbouncer=true'
    }
  }
});

const OBJECTIVE_ID = '5007adfa-9367-45b6-8939-47b5cf28271b';

async function checkBrandObjective() {
  try {
    console.log('🔍 Checking objective: Brand positioned for overwhelmed business owners\n');

    // Get the objective
    const objective = await prisma.objective.findUnique({
      where: { id: OBJECTIVE_ID },
      include: {
        company: true,
        goal: true,
        tasks: true
      }
    });

    if (!objective) {
      console.log('❌ Objective not found');
      return;
    }

    console.log('📊 OBJECTIVE DETAILS:');
    console.log('='.repeat(80));
    console.log(`Title: ${objective.title}`);
    console.log(`Progress: ${objective.progressPercent}%`);
    console.log(`Current: ${objective.currentValue}${objective.unit} / Target: ${objective.targetValue}${objective.unit}`);
    console.log(`Status: ${objective.status}`);
    if (objective.company) console.log(`Company: ${objective.company.name}`);
    if (objective.project) console.log(`Project: ${objective.project.name}`);
    if (objective.goal) console.log(`Goal: ${objective.goal.name}`);
    console.log('='.repeat(80));

    // Get all tasks for this objective
    const tasks = await prisma.task.findMany({
      where: { objectiveId: OBJECTIVE_ID },
      orderBy: { createdAt: 'asc' },
      include: {
        company: true,
        project: true
      }
    });

    console.log(`\n📋 Found ${tasks.length} tasks linked to this objective\n`);
    
    if (tasks.length > 0) {
      console.log('TASKS:');
      console.log('='.repeat(80));
      
      // First, let's see what statuses we actually have
      console.log('\nActual task statuses found:');
      const uniqueStatuses = [...new Set(tasks.map(t => t.status))];
      console.log(uniqueStatuses);
      
      const byStatus = { 
        todo: [], 
        'in-progress': [], 
        check: [], 
        done: [], 
        archived: [],
        other: []
      };
      
      tasks.forEach(task => {
        if (byStatus[task.status]) {
          byStatus[task.status].push(task);
        } else {
          byStatus.other.push(task);
        }
      });

      Object.entries(byStatus).forEach(([status, taskList]) => {
        if (taskList.length > 0) {
          console.log(`\n${status.toUpperCase()} (${taskList.length})`);
          taskList.forEach(task => {
            console.log(`  • ${task.title}`);
            console.log(`    ID: ${task.id}`);
            console.log(`    Priority: ${task.priority}`);
            console.log(`    Created: ${task.createdAt.toISOString().split('T')[0]}`);
            if (task.company) console.log(`    Company: ${task.company.name}`);
            if (task.project) console.log(`    Project: ${task.project.name}`);
          });
        }
      });
      
      console.log('\n' + '='.repeat(80));

      // Calculate progress
      const completedCount = byStatus.done.length + byStatus.archived.length;
      const totalCount = tasks.length;
      const calculatedProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      console.log('\n📊 PROGRESS BREAKDOWN:');
      console.log(`  Todo: ${byStatus.todo.length}`);
      console.log(`  In Progress: ${byStatus['in-progress'].length}`);
      console.log(`  Check: ${byStatus.check.length}`);
      console.log(`  Done: ${byStatus.done.length}`);
      console.log(`  Archived: ${byStatus.archived.length}`);
      console.log(`  ─────────────────────`);
      console.log(`  Total: ${totalCount}`);
      console.log(`  Completed: ${completedCount}`);
      console.log(`  Calculated: ${calculatedProgress}%`);
      console.log(`  Stored in objective: ${objective.progressPercent}%`);
      
      if (calculatedProgress !== objective.progressPercent) {
        console.log(`\n⚠️  MISMATCH: Progress should be ${calculatedProgress}% based on tasks`);
      }
    } else {
      console.log('⚠️  NO TASKS FOUND');
      console.log('\nThis explains the issue - the objective shows 40% progress');
      console.log('but there are no tasks linked to it.');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkBrandObjective();
