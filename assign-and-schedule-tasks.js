#!/usr/bin/env node
/**
 * Love Warranty - Task Assignment & Daily Scheduling
 * 
 * This script:
 * 1. Fetches all tasks from Zebi
 * 2. Assigns them to Benjamin Brown (8494814048) or Doug/Harvey
 * 3. Creates 2-week daily assignment schedule (6 tasks/day)
 * 4. Generates JSON summary with task counts by priority
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPANY_ID = 'a50c15be-afec-49fa-81d3-0bb34570b74b';
const BENJAMIN_BROWN_ID = '8494814048';
const DOUG_HARVEY_ASSIGNEE = 'Doug/Harvey (AI)';

// Assignment rules
const BENJAMIN_TASKS = [
  'review', 'approve', 'decision', 'sign-off', 'leadership', 
  'governance', 'strategic', 'budget', 'final approval', 'validate',
  'authorize', 'oversight', 'policy', 'framework approval'
];

const AI_TASKS = [
  'research', 'analysis', 'draft', 'document', 'setup', 
  'configure', 'build', 'create', 'design', 'compile',
  'organize', 'prepare', 'coordinate', 'collect', 'summarize'
];

// Effort point mapping
const EFFORT_MAP = {
  small: [1, 2, 3],
  medium: [4, 5, 6],
  large: [7, 8, 9, 10]
};

function determineAssignee(taskTitle, taskDescription) {
  const combined = `${taskTitle} ${taskDescription}`.toLowerCase();
  
  // Check for Benjamin-specific keywords
  for (const keyword of BENJAMIN_TASKS) {
    if (combined.includes(keyword)) {
      return BENJAMIN_BROWN_ID;
    }
  }
  
  // Default to AI for research/execution tasks
  return DOUG_HARVEY_ASSIGNEE;
}

function determineEffort(taskTitle, phase) {
  const title = taskTitle.toLowerCase();
  
  // Large tasks (7-10 points)
  if (title.includes('system build') || title.includes('implementation') || 
      title.includes('rollout') || title.includes('platform')) {
    return 8;
  }
  
  // Medium tasks (4-6 points)
  if (title.includes('framework') || title.includes('process') || 
      title.includes('training') || title.includes('testing')) {
    return 5;
  }
  
  // Small tasks (1-3 points) - documentation, simple config
  return 2;
}

function calculateDueDate(baseDate, taskIndex, priority) {
  // Priority 1 tasks: Days 1-30
  // Priority 2 tasks: Days 31-90
  // Priority 3 tasks: Days 91-180
  // Priority 4 tasks: Days 181+
  
  const daysOffset = {
    1: Math.floor(taskIndex * 0.3), // Spread over 30 days
    2: 30 + Math.floor(taskIndex * 0.6), // Days 30-90
    3: 90 + Math.floor(taskIndex * 0.9), // Days 90-180
    4: 180 + Math.floor(taskIndex * 1.2) // Days 180+
  };
  
  const offset = daysOffset[priority] || taskIndex;
  const dueDate = new Date(baseDate);
  dueDate.setDate(dueDate.getDate() + offset);
  return dueDate;
}

async function assignAllTasks() {
  console.log('🎯 Starting task assignment and scheduling...\n');
  
  // Get all objectives with their projects and tasks
  const objectives = await prisma.objective.findMany({
    where: {
      company: {
        id: COMPANY_ID
      }
    },
    include: {
      projects: {
        include: {
          tasks: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`📊 Found ${objectives.length} objectives\n`);
  
  let totalTasks = 0;
  let assignedToBenjamin = 0;
  let assignedToAI = 0;
  const tasksByPriority = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const allTasks = [];
  
  const baseDate = new Date('2026-03-16'); // Start tomorrow
  
  // Process each objective
  for (const objective of objectives) {
    console.log(`\n📁 Processing: ${objective.name}`);
    
    // Determine priority based on objective name
    let priority = 1; // Default to highest priority
    const name = objective.name.toLowerCase();
    
    if (name.includes('phase 3') || name.includes('advanced') || name.includes('optimization')) {
      priority = 3;
    } else if (name.includes('phase 4') || name.includes('scaling') || name.includes('future')) {
      priority = 4;
    } else if (name.includes('phase 2') || name.includes('build') || name.includes('implementation')) {
      priority = 2;
    }
    
    // Process projects
    for (const project of objective.projects) {
      // Determine project phase from name
      let phase = 1;
      if (project.name.includes('P2.')) phase = 2;
      else if (project.name.includes('P3.')) phase = 3;
      else if (project.name.includes('P4.')) phase = 4;
      
      // Override priority based on phase
      if (phase === 1) priority = 1;
      else if (phase === 2) priority = 2;
      else if (phase === 3) priority = 3;
      else if (phase === 4) priority = 4;
      
      // Process tasks
      for (let i = 0; i < project.tasks.length; i++) {
        const task = project.tasks[i];
        totalTasks++;
        tasksByPriority[priority]++;
        
        // Determine assignee
        const assignee = determineAssignee(task.name, task.description || '');
        const isBenjamin = assignee === BENJAMIN_BROWN_ID;
        
        if (isBenjamin) assignedToBenjamin++;
        else assignedToAI++;
        
        // Determine effort
        const effort = determineEffort(task.name, phase);
        
        // Calculate due date
        const dueDate = calculateDueDate(baseDate, i, priority);
        
        // Store task info for scheduling
        allTasks.push({
          id: task.id,
          name: task.name,
          projectName: project.name,
          objectiveName: objective.name,
          priority,
          effort,
          assignee,
          assigneeName: isBenjamin ? 'Benjamin Brown' : 'Doug/Harvey',
          dueDate,
          phase
        });
        
        // Update task in database
        await prisma.task.update({
          where: { id: task.id },
          data: {
            assignedTo: assignee,
            effortPoints: effort,
            priority,
            dueDate,
            status: 'To Do'
          }
        });
      }
    }
  }
  
  console.log('\n✅ Assignment complete!\n');
  console.log('📊 Assignment Summary:');
  console.log(`   Total tasks: ${totalTasks}`);
  console.log(`   Assigned to Benjamin Brown: ${assignedToBenjamin}`);
  console.log(`   Assigned to Doug/Harvey (AI): ${assignedToAI}`);
  console.log(`\n📊 Tasks by Priority:`);
  console.log(`   Priority 1 (Operational foundations): ${tasksByPriority[1]}`);
  console.log(`   Priority 2 (Core growth systems): ${tasksByPriority[2]}`);
  console.log(`   Priority 3 (Revenue acceleration): ${tasksByPriority[3]}`);
  console.log(`   Priority 4 (Strategic structure): ${tasksByPriority[4]}`);
  
  return { allTasks, totalTasks, assignedToBenjamin, assignedToAI, tasksByPriority };
}

function createDailySchedule(allTasks) {
  console.log('\n\n📅 Creating 2-week daily assignment schedule...\n');
  
  // Sort tasks by priority (1 first), then by due date
  const sortedTasks = allTasks.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.dueDate - b.dueDate;
  });
  
  // Daily workload: 1 main (7-10 pts) + 2 medium (4-6 pts) + 3 small (1-3 pts) = 6 tasks
  const dailySchedule = [];
  let taskIndex = 0;
  
  for (let day = 1; day <= 14; day++) {
    const date = new Date('2026-03-16');
    date.setDate(date.getDate() + (day - 1));
    
    const dayTasks = {
      day,
      date: date.toISOString().split('T')[0],
      tasks: [],
      totalEffort: 0,
      benjaminTasks: 0,
      aiTasks: 0
    };
    
    // Try to get 1 main task (7-10 points)
    const mainTask = sortedTasks.slice(taskIndex).find(t => t.effort >= 7);
    if (mainTask) {
      dayTasks.tasks.push(mainTask);
      dayTasks.totalEffort += mainTask.effort;
      if (mainTask.assignee === BENJAMIN_BROWN_ID) dayTasks.benjaminTasks++;
      else dayTasks.aiTasks++;
      taskIndex = sortedTasks.indexOf(mainTask) + 1;
    }
    
    // Get 2 medium tasks (4-6 points)
    let mediumCount = 0;
    while (mediumCount < 2 && taskIndex < sortedTasks.length) {
      const task = sortedTasks[taskIndex];
      if (task.effort >= 4 && task.effort <= 6) {
        dayTasks.tasks.push(task);
        dayTasks.totalEffort += task.effort;
        if (task.assignee === BENJAMIN_BROWN_ID) dayTasks.benjaminTasks++;
        else dayTasks.aiTasks++;
        mediumCount++;
      }
      taskIndex++;
    }
    
    // Get 3 small tasks (1-3 points)
    let smallCount = 0;
    while (smallCount < 3 && taskIndex < sortedTasks.length) {
      const task = sortedTasks[taskIndex];
      if (task.effort <= 3) {
        dayTasks.tasks.push(task);
        dayTasks.totalEffort += task.effort;
        if (task.assignee === BENJAMIN_BROWN_ID) dayTasks.benjaminTasks++;
        else dayTasks.aiTasks++;
        smallCount++;
      }
      taskIndex++;
    }
    
    // If we didn't get exactly 6 tasks, fill with remaining tasks
    while (dayTasks.tasks.length < 6 && taskIndex < sortedTasks.length) {
      const task = sortedTasks[taskIndex];
      dayTasks.tasks.push(task);
      dayTasks.totalEffort += task.effort;
      if (task.assignee === BENJAMIN_BROWN_ID) dayTasks.benjaminTasks++;
      else dayTasks.aiTasks++;
      taskIndex++;
    }
    
    dailySchedule.push(dayTasks);
  }
  
  return dailySchedule;
}

function printDailySchedule(dailySchedule) {
  console.log('\n' + '='.repeat(80));
  console.log('📅 2-WEEK DAILY ASSIGNMENT SCHEDULE');
  console.log('='.repeat(80));
  
  dailySchedule.forEach(day => {
    console.log(`\n📆 Day ${day.day} - ${day.date}`);
    console.log(`   Total effort: ${day.totalEffort} points | Benjamin: ${day.benjaminTasks} tasks | AI: ${day.aiTasks} tasks`);
    console.log('   ' + '-'.repeat(76));
    
    day.tasks.forEach((task, idx) => {
      const effortLabel = task.effort >= 7 ? 'MAIN' : task.effort >= 4 ? 'MED ' : 'SMALL';
      console.log(`   ${idx + 1}. [${effortLabel}] [P${task.priority}] ${task.name}`);
      console.log(`      → ${task.assigneeName} | ${task.effort} pts | ${task.objectiveName}`);
    });
  });
}

function generateJSONSummary(data, dailySchedule) {
  const summary = {
    generatedAt: new Date().toISOString(),
    company: 'Love Warranty',
    companyId: COMPANY_ID,
    totalTasks: data.totalTasks,
    assignments: {
      benjaminBrown: {
        userId: BENJAMIN_BROWN_ID,
        taskCount: data.assignedToBenjamin,
        percentage: Math.round((data.assignedToBenjamin / data.totalTasks) * 100)
      },
      dougHarvey: {
        taskCount: data.assignedToAI,
        percentage: Math.round((data.assignedToAI / data.totalTasks) * 100)
      }
    },
    tasksByPriority: {
      priority1_operational: data.tasksByPriority[1],
      priority2_growth: data.tasksByPriority[2],
      priority3_revenue: data.tasksByPriority[3],
      priority4_strategic: data.tasksByPriority[4]
    },
    twoWeekSchedule: dailySchedule.map(day => ({
      day: day.day,
      date: day.date,
      taskCount: day.tasks.length,
      totalEffort: day.totalEffort,
      benjaminTasks: day.benjaminTasks,
      aiTasks: day.aiTasks,
      tasks: day.tasks.map(t => ({
        id: t.id,
        name: t.name,
        priority: t.priority,
        effort: t.effort,
        assignee: t.assigneeName,
        objective: t.objectiveName,
        project: t.projectName
      }))
    })),
    firstWeekSummary: {
      days: dailySchedule.slice(0, 7).map(day => ({
        day: day.day,
        date: day.date,
        taskCount: day.tasks.length,
        benjaminTasks: day.benjaminTasks,
        aiTasks: day.aiTasks,
        totalEffort: day.totalEffort
      })),
      totalTasks: dailySchedule.slice(0, 7).reduce((sum, day) => sum + day.tasks.length, 0),
      totalBenjaminTasks: dailySchedule.slice(0, 7).reduce((sum, day) => sum + day.benjaminTasks, 0),
      totalAITasks: dailySchedule.slice(0, 7).reduce((sum, day) => sum + day.aiTasks, 0)
    }
  };
  
  return summary;
}

async function main() {
  try {
    console.log('🚀 Love Warranty - Task Assignment & Scheduling');
    console.log('='.repeat(80) + '\n');
    
    // Step 1: Assign all tasks
    const assignmentData = await assignAllTasks();
    
    // Step 2: Create daily schedule
    const dailySchedule = createDailySchedule(assignmentData.allTasks);
    
    // Step 3: Print schedule
    printDailySchedule(dailySchedule);
    
    // Step 4: Generate JSON summary
    const summary = generateJSONSummary(assignmentData, dailySchedule);
    
    // Step 5: Save JSON to file
    const fs = require('fs');
    const summaryPath = './love-warranty-assignment-summary.json';
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ COMPLETE!');
    console.log('='.repeat(80));
    console.log(`\n📄 JSON summary saved to: ${summaryPath}`);
    console.log(`\n🔗 View in Zebi: https://zebi.app/workspace/dfd6d384-9e2f-4145-b4f3-254aa82c0237\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
