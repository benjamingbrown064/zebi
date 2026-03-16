/**
 * Create the missing "Product stable" objective
 * Fix: Handle reverse metric (fewer bugs = better)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';

async function createMissingObjective() {
  console.log('🔧 Creating missing objective: Product stability...\n');

  try {
    // For "bugs" metric, we want to REDUCE from currentValue to targetValue
    // So progressPercent = (startValue - currentValue) / (startValue - targetValue) * 100
    const startValue = 2; // We started with 2 critical bugs
    const currentValue = 2; // Still have 2
    const targetValue = 0; // Want 0
    
    // Progress = how much we've reduced bugs
    const progressPercent = startValue > targetValue 
      ? ((startValue - currentValue) / (startValue - targetValue)) * 100
      : 0;

    const result = await prisma.objective.create({
      data: {
        workspace: { connect: { id: WORKSPACE_ID } },
        title: 'Product stable with zero critical bugs',
        description: 'Achieve product stability with zero critical bugs (data loss, auth failures, RLS breaches) and <5 minor bugs. Product stability directly impacts customer trust and retention. One critical bug during launch can destroy reputation with early adopters. Target: 7 consecutive days with zero critical bugs reported.',
        objectiveType: 'product',
        metricType: 'count',
        targetValue: 0,
        currentValue: 2,
        unit: 'bugs',
        startDate: new Date('2026-03-07'),
        deadline: new Date('2026-04-01'),
        status: 'active',
        priority: 5,
        checkFrequency: 'daily',
        createdBy: USER_ID,
        progressPercent: Math.max(0, Math.min(100, progressPercent))
      }
    });

    console.log('✅ Successfully created objective!');
    console.log(`   ID: ${result.id}`);
    console.log(`   Title: ${result.title}`);
    console.log(`   Type: ${result.objectiveType} | Priority: ${result.priority}/5`);
    console.log(`   Current: ${result.currentValue} bugs → Target: ${result.targetValue} bugs`);
    console.log(`   Progress: ${result.progressPercent}%`);
    console.log(`   Deadline: ${result.deadline.toISOString().split('T')[0]}`);
    console.log('\n✨ All 9 launch objectives now created!\n');

    return result;

  } catch (error) {
    console.error('❌ Failed to create objective:', error.message);
    throw error;
  }
}

createMissingObjective()
  .then(() => {
    console.log('🎉 Complete! All 9 objectives created in database.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
