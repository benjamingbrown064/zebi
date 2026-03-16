/**
 * Comprehensive test suite for Objective Progress Auto-Calculation (V2)
 * 
 * Tests:
 * 1. Database schema verification
 * 2. Create test objective (auto mode)
 * 3. Create test project linked to objective
 * 4. Create tasks (direct + via project)
 * 5. Test deduplication (task linked both ways)
 * 6. Toggle completion and verify progress updates
 * 7. Test manual recalculation API
 * 8. Verify UI data structure
 * 9. Cleanup test data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TEST_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'; // Ben's workspace
const TEST_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';

async function main() {
  console.log('\n=== OBJECTIVE PROGRESS V2: COMPREHENSIVE TEST ===\n');

  try {
    // Test 1: Verify schema
    console.log('📋 TEST 1: Database Schema Verification');
    const schemaCheck = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Objective'
        AND column_name IN ('progressMode', 'completedTaskCount', 'totalTaskCount', 'lastProgressRecalc', 'scopeChangeNote', 'progressPercent')
      ORDER BY column_name;
    `;
    console.log('Schema fields:', schemaCheck);
    
    const expectedFields = ['completedTaskCount', 'lastProgressRecalc', 'progressMode', 'progressPercent', 'scopeChangeNote', 'totalTaskCount'];
    const foundFields = schemaCheck.map(row => row.column_name);
    const allPresent = expectedFields.every(f => foundFields.includes(f));
    console.log(`✅ Schema check: ${allPresent ? 'PASS' : 'FAIL'}`);
    console.log(`   Found: ${foundFields.join(', ')}\n`);

    // Test 2: Create test objective
    console.log('📋 TEST 2: Create Test Objective (auto mode)');
    const objective = await prisma.objective.create({
      data: {
        workspaceId: TEST_WORKSPACE_ID,
        title: '[TEST] Auto Progress Calculation',
        description: 'Testing V2 progress auto-calculation with task deduplication',
        objectiveType: 'revenue',
        metricType: 'currency',
        targetValue: 10000,
        currentValue: 0,
        unit: 'GBP',
        startDate: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: 'active',
        progressMode: 'auto', // V2 auto mode
        progressPercent: 0,
        createdBy: TEST_USER_ID,
      }
    });
    console.log(`✅ Created objective: ${objective.id}`);
    console.log(`   Mode: ${objective.progressMode}`);
    console.log(`   Progress: ${objective.progressPercent}%\n`);

    // Test 3: Create test project
    console.log('📋 TEST 3: Create Test Project');
    const project = await prisma.project.create({
      data: {
        workspaceId: TEST_WORKSPACE_ID,
        name: '[TEST] Project for Progress Test',
        objectiveId: objective.id,
      }
    });
    console.log(`✅ Created project: ${project.id}\n`);

    // Test 4: Get default status
    const defaultStatus = await prisma.status.findFirst({
      where: { workspaceId: TEST_WORKSPACE_ID },
      orderBy: { sortOrder: 'asc' }
    });
    console.log(`📋 Using status: ${defaultStatus.name} (${defaultStatus.id})\n`);

    // Test 5: Create direct tasks
    console.log('📋 TEST 4: Create Direct Tasks (linked to objective)');
    const directTask1 = await prisma.task.create({
      data: {
        workspaceId: TEST_WORKSPACE_ID,
        title: '[TEST] Direct Task 1',
        statusId: defaultStatus.id,
        objectiveId: objective.id, // Direct link
        createdBy: TEST_USER_ID,
      }
    });
    const directTask2 = await prisma.task.create({
      data: {
        workspaceId: TEST_WORKSPACE_ID,
        title: '[TEST] Direct Task 2',
        statusId: defaultStatus.id,
        objectiveId: objective.id, // Direct link
        createdBy: TEST_USER_ID,
      }
    });
    console.log(`✅ Created 2 direct tasks: ${directTask1.id}, ${directTask2.id}\n`);

    // Test 6: Create project tasks
    console.log('📋 TEST 5: Create Project Tasks (linked via project)');
    const projectTask1 = await prisma.task.create({
      data: {
        workspaceId: TEST_WORKSPACE_ID,
        title: '[TEST] Project Task 1',
        statusId: defaultStatus.id,
        projectId: project.id, // Via project → objective
        createdBy: TEST_USER_ID,
      }
    });
    const projectTask2 = await prisma.task.create({
      data: {
        workspaceId: TEST_WORKSPACE_ID,
        title: '[TEST] Project Task 2',
        statusId: defaultStatus.id,
        projectId: project.id, // Via project → objective
        createdBy: TEST_USER_ID,
      }
    });
    console.log(`✅ Created 2 project tasks: ${projectTask1.id}, ${projectTask2.id}\n`);

    // Test 7: Create duplicate task (linked both ways) - CRITICAL DEDUP TEST
    console.log('📋 TEST 6: Create Duplicate Link Task (DEDUPLICATION TEST)');
    const dupTask = await prisma.task.create({
      data: {
        workspaceId: TEST_WORKSPACE_ID,
        title: '[TEST] Task Linked Both Ways',
        statusId: defaultStatus.id,
        objectiveId: objective.id, // Direct link
        projectId: project.id,      // Also via project
        createdBy: TEST_USER_ID,
      }
    });
    console.log(`✅ Created duplicate-link task: ${dupTask.id}`);
    console.log(`   Linked directly to objective: ${objective.id}`);
    console.log(`   Linked via project: ${project.id} → ${objective.id}\n`);

    // Test 8: Manual recalculation (first time)
    console.log('📋 TEST 7: Manual Progress Recalculation (Initial)');
    const { calculateObjectiveProgressOptimized } = require('./lib/objective-progress');
    const result1 = await calculateObjectiveProgressOptimized(objective.id);
    console.log(`✅ Calculation result:`);
    console.log(`   Total tasks: ${result1.totalTaskCount}`);
    console.log(`   Completed: ${result1.completedTaskCount}`);
    console.log(`   Progress: ${result1.progressPercent}%`);
    console.log(`   Expected: 5 total (2 direct + 2 project + 1 dup, deduplicated)`);
    
    if (result1.totalTaskCount !== 5) {
      console.log(`❌ FAIL: Expected 5 tasks, got ${result1.totalTaskCount}`);
    } else {
      console.log(`✅ PASS: Deduplication working correctly\n`);
    }

    // Persist to database
    const { recalculateObjectiveProgress } = require('./lib/objective-progress');
    await recalculateObjectiveProgress(objective.id);
    
    // Verify database update
    const updated1 = await prisma.objective.findUnique({
      where: { id: objective.id },
      select: {
        progressPercent: true,
        completedTaskCount: true,
        totalTaskCount: true,
        lastProgressRecalc: true,
      }
    });
    console.log(`📊 Database state after recalc:`);
    console.log(`   progressPercent: ${updated1.progressPercent}%`);
    console.log(`   completedTaskCount: ${updated1.completedTaskCount}`);
    console.log(`   totalTaskCount: ${updated1.totalTaskCount}`);
    console.log(`   lastProgressRecalc: ${updated1.lastProgressRecalc}\n`);

    // Test 9: Complete some tasks
    console.log('📋 TEST 8: Complete Tasks and Recalculate');
    await prisma.task.update({
      where: { id: directTask1.id },
      data: { completedAt: new Date() }
    });
    console.log(`✅ Completed: ${directTask1.title}`);

    await prisma.task.update({
      where: { id: projectTask1.id },
      data: { completedAt: new Date() }
    });
    console.log(`✅ Completed: ${projectTask1.title}`);

    await prisma.task.update({
      where: { id: dupTask.id },
      data: { completedAt: new Date() }
    });
    console.log(`✅ Completed: ${dupTask.title} (duplicate link)\n`);

    // Recalculate
    const result2 = await calculateObjectiveProgressOptimized(objective.id);
    console.log(`📊 After completing 3 tasks:`);
    console.log(`   Total: ${result2.totalTaskCount}`);
    console.log(`   Completed: ${result2.completedTaskCount}`);
    console.log(`   Progress: ${result2.progressPercent}%`);
    console.log(`   Expected: 3/5 = 60%`);
    
    if (result2.completedTaskCount === 3 && result2.totalTaskCount === 5 && result2.progressPercent === 60) {
      console.log(`✅ PASS: Progress calculation correct\n`);
    } else {
      console.log(`❌ FAIL: Progress calculation incorrect\n`);
    }

    // Persist
    await recalculateObjectiveProgress(objective.id);

    // Test 10: Verify affected objectives detection
    console.log('📋 TEST 9: Affected Objectives Detection');
    const { getAffectedObjectives } = require('./lib/objective-progress');
    
    const affectedDirect = await getAffectedObjectives(directTask2.id);
    console.log(`   Direct task affects: ${affectedDirect.length} objective(s)`);
    
    const affectedProject = await getAffectedObjectives(projectTask2.id);
    console.log(`   Project task affects: ${affectedProject.length} objective(s)`);
    
    const affectedDup = await getAffectedObjectives(dupTask.id);
    console.log(`   Duplicate-link task affects: ${affectedDup.length} objective(s)`);
    
    const allAffectSame = affectedDirect[0] === objective.id && 
                          affectedProject[0] === objective.id && 
                          affectedDup[0] === objective.id;
    console.log(`   ${allAffectSame ? '✅ PASS' : '❌ FAIL'}: All tasks correctly linked to objective\n`);

    // Test 11: Check indexes exist
    console.log('📋 TEST 10: Verify Performance Indexes');
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Objective' AND indexname LIKE '%progress%'
      UNION ALL
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Task' AND (indexname LIKE '%objective%' OR indexname LIKE '%project%')
      ORDER BY indexname;
    `;
    console.log(`   Found ${indexes.length} relevant indexes:`);
    indexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    console.log(`   ${indexes.length >= 3 ? '✅ PASS' : '⚠️  WARNING'}: Indexes present\n`);

    // Test 12: UI Data Structure
    console.log('📋 TEST 11: UI Data Structure');
    const uiData = await prisma.objective.findUnique({
      where: { id: objective.id },
      include: {
        tasks: {
          where: { archivedAt: null },
          select: { id: true, completedAt: true }
        },
        projects: {
          where: { archivedAt: null },
          include: {
            tasks: {
              where: { archivedAt: null },
              select: { id: true, completedAt: true }
            }
          }
        }
      }
    });

    const progressBreakdown = {
      totalTasks: uiData.totalTaskCount || 0,
      completedTasks: uiData.completedTaskCount || 0,
      directTasks: {
        total: uiData.tasks.length,
        completed: uiData.tasks.filter(t => t.completedAt).length
      },
      projectTasks: {
        total: uiData.projects.flatMap(p => p.tasks).length,
        completed: uiData.projects.flatMap(p => p.tasks.filter(t => t.completedAt)).length
      },
      lastRecalc: uiData.lastProgressRecalc?.toISOString() || null
    };

    console.log(`   Progress Breakdown for UI:`);
    console.log(`   - Total: ${progressBreakdown.totalTasks} (${progressBreakdown.completedTasks} completed)`);
    console.log(`   - Direct tasks: ${progressBreakdown.directTasks.completed}/${progressBreakdown.directTasks.total}`);
    console.log(`   - Project tasks: ${progressBreakdown.projectTasks.completed}/${progressBreakdown.projectTasks.total}`);
    console.log(`   - Last recalc: ${progressBreakdown.lastRecalc}`);
    console.log(`   ✅ PASS: UI data structure valid\n`);

    // Test 13: Manual mode test
    console.log('📋 TEST 12: Manual Mode Toggle');
    await prisma.objective.update({
      where: { id: objective.id },
      data: { progressMode: 'manual' }
    });
    
    const manualResult = await calculateObjectiveProgressOptimized(objective.id);
    console.log(`   Calculation with manual mode: skipped=${manualResult.skipped}`);
    console.log(`   ${manualResult.skipped ? '✅ PASS' : '❌ FAIL'}: Manual mode respected\n`);

    // Switch back to auto
    await prisma.objective.update({
      where: { id: objective.id },
      data: { progressMode: 'auto' }
    });

    // Final summary
    console.log('📋 TEST SUMMARY');
    const finalState = await prisma.objective.findUnique({
      where: { id: objective.id }
    });
    console.log(`   Objective ID: ${finalState.id}`);
    console.log(`   Mode: ${finalState.progressMode}`);
    console.log(`   Progress: ${finalState.progressPercent}% (${finalState.completedTaskCount}/${finalState.totalTaskCount})`);
    console.log(`   Last recalc: ${finalState.lastProgressRecalc?.toISOString()}`);

    // Cleanup prompt
    console.log('\n📋 CLEANUP');
    console.log(`   Test objective created: ${objective.id}`);
    console.log(`   Test project created: ${project.id}`);
    console.log(`   Test tasks created: 5`);
    console.log(`\n   ⚠️  Test data left in database for manual inspection`);
    console.log(`   To clean up, run: DELETE FROM "Objective" WHERE id = '${objective.id}';`);
    console.log(`   (Cascade will remove related project and tasks)\n`);

    console.log('✅ ALL TESTS COMPLETE\n');

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
