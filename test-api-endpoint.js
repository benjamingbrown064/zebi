/**
 * Test the deployed API endpoint
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OBJECTIVE_ID = 'cf267a3e-aca6-4925-80b2-5ed825104cbc';
const DIRECT_TASK1_ID = '64ce6ea7-6d93-4ef8-9a91-eadf21590009';
const PROJECT_TASK1_ID = '7078834a-5abb-4b98-a4a8-26799e1e48bb';
const DUP_TASK_ID = 'eb1b05a5-2915-46fe-9a8f-752eb6127dd2';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

async function main() {
  console.log('\n=== API ENDPOINT TEST ===\n');

  try {
    // Complete remaining tasks
    console.log('📋 Completing all remaining tasks...');
    
    await prisma.task.update({
      where: { id: DIRECT_TASK1_ID },
      data: { completedAt: new Date() }
    });
    console.log('✅ Completed: Direct Task 1');

    await prisma.task.update({
      where: { id: PROJECT_TASK1_ID },
      data: { completedAt: new Date() }
    });
    console.log('✅ Completed: Project Task 1');

    await prisma.task.update({
      where: { id: DUP_TASK_ID },
      data: { completedAt: new Date() }
    });
    console.log('✅ Completed: Duplicate Link Task');

    console.log('\n📋 All 5 tasks now completed\n');

    // Check current state
    console.log('📋 Checking current database state...');
    const before = await prisma.objective.findUnique({
      where: { id: OBJECTIVE_ID },
      select: {
        progressPercent: true,
        completedTaskCount: true,
        totalTaskCount: true,
        lastProgressRecalc: true,
      }
    });
    console.log(`Before recalc: ${before.completedTaskCount}/${before.totalTaskCount} = ${before.progressPercent}%`);

    // Call API endpoint
    console.log('\n📋 Calling API: POST /api/objectives/[id]/recalculate-progress');
    
    if (!INTERNAL_API_TOKEN) {
      console.log('❌ INTERNAL_API_TOKEN not set - skipping API call');
      console.log('   Set it in .env file\n');
    } else {
      const response = await fetch(`http://localhost:3000/api/objectives/${OBJECTIVE_ID}/recalculate-progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${INTERNAL_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ API Response:', JSON.stringify(result, null, 2));
      } else {
        const error = await response.text();
        console.log(`❌ API Error (${response.status}): ${error}`);
      }
    }

    // Check final state
    console.log('\n📋 Checking final database state...');
    const after = await prisma.objective.findUnique({
      where: { id: OBJECTIVE_ID },
      select: {
        progressPercent: true,
        completedTaskCount: true,
        totalTaskCount: true,
        lastProgressRecalc: true,
      }
    });
    console.log(`After recalc: ${after.completedTaskCount}/${after.totalTaskCount} = ${after.progressPercent}%`);
    console.log(`Last recalc: ${after.lastProgressRecalc?.toISOString()}`);

    const isCorrect = after.completedTaskCount === 5 && 
                      after.totalTaskCount === 5 && 
                      Number(after.progressPercent) === 100;

    console.log(`\n${isCorrect ? '✅ PASS' : '❌ FAIL'}: Expected 5/5 = 100%\n`);

  } catch (error) {
    console.error('❌ Test failed:', error);
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
