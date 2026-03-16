#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';

async function checkBrandObjective() {
  try {
    console.log('🔍 Looking for "Brand positioned" objective...\n');

    // Find the objective
    const objectives = await prisma.objective.findMany({
      where: {
        workspaceId: WORKSPACE_ID,
        title: {
          contains: 'Brand positioned',
          mode: 'insensitive'
        }
      },
      include: {
        company: true,
        project: true,
        goal: true
      }
    });

    if (objectives.length === 0) {
      console.log('❌ No objective found with "Brand positioned" in title');
      return;
    }

    const objective = objectives[0];
    
    console.log('📊 OBJECTIVE FOUND:');
    console.log('='.repeat(80));
    console.log(`Title: ${objective.title}`);
    console.log(`ID: ${objective.id}`);
    console.log(`Progress: ${objective.progressPercent}%`);
    console.log(`Current: ${objective.currentValue}${objective.unit} / Target: ${objective.targetValue}${objective.unit}`);
    console.log(`Status: ${objective.status}`);
    console.log(`Type: ${objective.objectiveType}`);
    console.log(`Priority: ${objective.priority}/5`);
    console.log(`Deadline: ${objective.deadline?.toISOString().split('T')[0] || 'None'}`);
    if (objective.company) console.log(`Company: ${objective.company.name}`);
    if (objective.project) console.log(`Project: ${objective.project.name}`);
    if (objective.goal) console.log(`Goal: ${objective.goal.name}`);
    console.log('='.repeat(80));

    // Find tasks linked to this objective
    console.log('\n🔍 Looking for tasks linked to this objective...\n');
    
    const tasks = await prisma.task.findMany({
      where: {
        objectiveId: objective.id
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📋 Found ${tasks.length} tasks\n`);
    
    if (tasks.length > 0) {
      console.log('TASKS:');
      console.log('='.repeat(80));
      tasks.forEach((task, index) => {
        console.log(`\n${index + 1}. ${task.title}`);
        console.log(`   ID: ${task.id}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Priority: ${task.priority}`);
        console.log(`   Created: ${task.createdAt.toISOString()}`);
        if (task.description) console.log(`   Description: ${task.description.substring(0, 100)}...`);
      });
      console.log('\n' + '='.repeat(80));
    }

    // Count completed vs total tasks to explain the 40%
    const completedTasks = tasks.filter(t => t.status === 'done' || t.status === 'archived').length;
    const totalTasks = tasks.length;
    
    console.log('\n📊 PROGRESS CALCULATION:');
    console.log(`Completed tasks: ${completedTasks} / ${totalTasks}`);
    if (totalTasks > 0) {
      const calculatedPercent = Math.round((completedTasks / totalTasks) * 100);
      console.log(`Calculated progress: ${calculatedPercent}%`);
      console.log(`Stored progress: ${objective.progressPercent}%`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBrandObjective();
