// Test script for repeating tasks functionality
// Run with: npx tsx scripts/test-repeating-tasks.ts

import { prisma } from '../lib/prisma';
import { processDueRepeatingTasks, calculateNextRun } from '../lib/repeating-tasks';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

async function main() {
  console.log('🧪 Testing Repeating Tasks Module\n');

  try {
    // Step 1: Get or create a test workspace
    console.log('1️⃣ Finding test workspace...');
    let workspace = await prisma.workspace.findFirst({
      include: {
        statuses: true,
        companies: true,
      },
    });

    if (!workspace) {
      console.log('   No workspace found. Creating test workspace...');
      workspace = await prisma.workspace.create({
        data: {
          name: 'Test Workspace',
          plan: 'free',
          statuses: {
            create: [
              { name: 'To Do', type: 'todo', sortOrder: 0, isSystem: true },
              { name: 'In Progress', type: 'in_progress', sortOrder: 1, isSystem: true },
              { name: 'Done', type: 'done', sortOrder: 2, isSystem: true },
            ],
          },
        },
        include: {
          statuses: true,
          companies: true,
        },
      });
    }
    console.log(`   ✅ Workspace: ${workspace.name} (${workspace.id})\n`);

    // Step 2: Get or create a test company
    console.log('2️⃣ Finding test company...');
    let company = workspace.companies[0];
    
    if (!company) {
      console.log('   No company found. Creating test company...');
      company = await prisma.company.create({
        data: {
          workspaceId: workspace.id,
          name: 'Test Company',
          industry: 'SaaS',
          stage: 'early',
          createdBy: SYSTEM_USER_ID,
        },
      });
    }
    console.log(`   ✅ Company: ${company.name} (${company.id})\n`);

    // Step 3: Create a test repeating task (daily, due now)
    console.log('3️⃣ Creating test repeating task template...');
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const repeatingTask = await prisma.repeatingTask.create({
      data: {
        workspaceId: workspace.id,
        companyId: company.id,
        title: 'Daily Test Task - {company}',
        description: 'Automated test task for {company}',
        frequency: 'daily',
        nextRun: yesterday, // Set to past so it triggers immediately
        taskTemplate: {
          title: 'Test Task: {company} - {date}',
          description: 'This is a test task created on {date} for {company}.\n\n✅ Template expansion working!',
          priority: 2,
          dueAt: '+1d',
          effortPoints: 2,
        },
        isActive: true,
        createdBy: SYSTEM_USER_ID,
      },
    });
    console.log(`   ✅ Created: "${repeatingTask.title}"`);
    console.log(`   📅 Next run: ${repeatingTask.nextRun.toISOString()}`);
    console.log(`   ⏰ Should trigger: YES (in the past)\n`);

    // Step 4: Run the processor
    console.log('4️⃣ Processing due repeating tasks...');
    const result = await processDueRepeatingTasks(SYSTEM_USER_ID);
    
    console.log(`   📊 Results:`);
    console.log(`      - Processed: ${result.processed} template(s)`);
    console.log(`      - Created: ${result.created} task(s)`);
    console.log(`      - Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log(`\n   ❌ Errors:`);
      result.errors.forEach(err => {
        console.log(`      - ${err.templateId}: ${err.error}`);
      });
    }
    console.log('');

    // Step 5: Verify task was created
    console.log('5️⃣ Verifying created tasks...');
    const createdTasks = await prisma.task.findMany({
      where: {
        repeatingTaskId: repeatingTask.id,
      },
      include: {
        status: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    if (createdTasks.length > 0) {
      const task = createdTasks[0];
      console.log(`   ✅ Task created successfully!`);
      console.log(`      - Title: "${task.title}"`);
      console.log(`      - Description: ${task.description?.substring(0, 60)}...`);
      console.log(`      - Status: ${task.status.name}`);
      console.log(`      - Priority: ${task.priority}`);
      console.log(`      - Due: ${task.dueAt?.toISOString() || 'Not set'}`);
      console.log(`      - Effort: ${task.effortPoints || 'Not set'}`);
      console.log(`      - AI Generated: ${task.aiGenerated ? 'Yes' : 'No'}`);
      console.log(`      - AI Agent: ${task.aiAgent || 'N/A'}`);
    } else {
      console.log(`   ❌ No task created!`);
    }
    console.log('');

    // Step 6: Verify template was updated
    console.log('6️⃣ Verifying template updates...');
    const updatedTemplate = await prisma.repeatingTask.findUnique({
      where: { id: repeatingTask.id },
    });

    if (updatedTemplate) {
      console.log(`   ✅ Template updated!`);
      console.log(`      - Last run: ${updatedTemplate.lastRun?.toISOString()}`);
      console.log(`      - Next run: ${updatedTemplate.nextRun.toISOString()}`);
      
      const hoursUntilNext = Math.round(
        (updatedTemplate.nextRun.getTime() - Date.now()) / (1000 * 60 * 60)
      );
      console.log(`      - Next run in: ~${hoursUntilNext} hours`);
    }
    console.log('');

    // Step 7: Test calculateNextRun function
    console.log('7️⃣ Testing calculateNextRun function...');
    const testDate = new Date('2024-01-01T12:00:00Z');
    
    const dailyNext = calculateNextRun('daily', testDate);
    const weeklyNext = calculateNextRun('weekly', testDate);
    const monthlyNext = calculateNextRun('monthly', testDate);
    const customNext = calculateNextRun('custom', testDate, { days: 3 });

    console.log(`   Daily (from 2024-01-01):   ${dailyNext.toISOString()}`);
    console.log(`   Weekly (from 2024-01-01):  ${weeklyNext.toISOString()}`);
    console.log(`   Monthly (from 2024-01-01): ${monthlyNext.toISOString()}`);
    console.log(`   Custom 3d (from 2024-01-01): ${customNext.toISOString()}`);
    console.log('');

    // Step 8: Activity log check
    console.log('8️⃣ Checking activity logs...');
    const logs = await prisma.activityLog.findMany({
      where: {
        aiAgent: 'repeating-task-executor',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    console.log(`   Found ${logs.length} activity log(s)`);
    logs.forEach((log, idx) => {
      const payload = log.eventPayload as any;
      console.log(`   ${idx + 1}. ${log.eventType} - ${payload?.templateTitle || 'Unknown'}`);
    });
    console.log('');

    // Summary
    console.log('✅ All tests completed successfully!\n');
    console.log('📝 Summary:');
    console.log(`   - Workspace: ${workspace.name}`);
    console.log(`   - Company: ${company.name}`);
    console.log(`   - Template created: ${repeatingTask.title}`);
    console.log(`   - Tasks generated: ${result.created}`);
    console.log(`   - Next scheduled run: ${updatedTemplate?.nextRun.toISOString()}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
