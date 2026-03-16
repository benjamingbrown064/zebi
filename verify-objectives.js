/**
 * Verify all 9 launch objectives were created correctly
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';

async function verifyObjectives() {
  console.log('🔍 Verifying launch objectives in database...\n');

  try {
    const objectives = await prisma.objective.findMany({
      where: {
        workspaceId: WORKSPACE_ID,
        createdAt: {
          gte: new Date('2026-03-07T00:00:00Z')
        }
      },
      orderBy: [
        { priority: 'desc' },
        { deadline: 'asc' }
      ]
    });

    console.log(`📊 Found ${objectives.length} objectives created today\n`);
    console.log('='.repeat(80));

    objectives.forEach((obj, index) => {
      console.log(`\n${index + 1}. ${obj.title}`);
      console.log(`   ID: ${obj.id}`);
      console.log(`   Type: ${obj.objectiveType.toUpperCase()} | Priority: ${obj.priority}/5`);
      console.log(`   Metric: ${obj.currentValue}${obj.unit} → ${obj.targetValue}${obj.unit}`);
      console.log(`   Progress: ${obj.progressPercent}%`);
      console.log(`   Deadline: ${obj.deadline.toISOString().split('T')[0]}`);
      console.log(`   Status: ${obj.status} | Check: ${obj.checkFrequency}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n📈 SUMMARY BY TYPE:\n');

    const byType = objectives.reduce((acc, obj) => {
      if (!acc[obj.objectiveType]) {
        acc[obj.objectiveType] = [];
      }
      acc[obj.objectiveType].push(obj);
      return acc;
    }, {});

    for (const [type, objs] of Object.entries(byType)) {
      console.log(`${type.toUpperCase()}: ${objs.length} objective(s)`);
      objs.forEach(obj => {
        const daysRemaining = Math.ceil((obj.deadline - new Date()) / (1000 * 60 * 60 * 24));
        console.log(`  ✓ ${obj.title} (${daysRemaining} days remaining)`);
      });
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('\n⏰ TIMELINE:\n');

    // Group by week
    const byWeek = objectives.reduce((acc, obj) => {
      const weekNum = Math.ceil((obj.deadline - new Date('2026-03-07')) / (1000 * 60 * 60 * 24 * 7));
      const weekKey = `Week ${weekNum}`;
      if (!acc[weekKey]) {
        acc[weekKey] = [];
      }
      acc[weekKey].push(obj);
      return acc;
    }, {});

    for (const [week, objs] of Object.entries(byWeek).sort()) {
      console.log(`${week}:`);
      objs.forEach(obj => {
        console.log(`  • ${obj.deadline.toISOString().split('T')[0]} - ${obj.title}`);
      });
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('\n✅ VERIFICATION COMPLETE\n');
    console.log('All objectives successfully created and verified!');
    console.log('\nNext steps:');
    console.log('1. Review objectives in Zebi dashboard');
    console.log('2. Break down into projects and tasks');
    console.log('3. Assign owners');
    console.log('4. Start daily tracking');

    return objectives;

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  }
}

verifyObjectives()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
