/**
 * Manual recalculation test
 */

import { recalculateObjectiveProgress } from './lib/objective-progress';

const OBJECTIVE_ID = 'cf267a3e-aca6-4925-80b2-5ed825104cbc';

async function main() {
  console.log('\n=== MANUAL RECALCULATION ===\n');
  console.log(`Objective ID: ${OBJECTIVE_ID}\n`);

  try {
    const result = await recalculateObjectiveProgress(OBJECTIVE_ID);
    
    if (result.skipped) {
      console.log(`⚠️  Skipped: ${result.reason}\n`);
    } else {
      console.log('✅ Recalculation complete:');
      console.log(`   Progress: ${result.objective!.progressPercent}%`);
      console.log(`   Completed: ${result.objective!.completedTaskCount}`);
      console.log(`   Total: ${result.objective!.totalTaskCount}`);
      console.log(`   Last recalc: ${result.objective!.lastProgressRecalc}\n`);
      
      const isCorrect = result.objective!.completedTaskCount === 5 &&
                        result.objective!.totalTaskCount === 5 &&
                        Number(result.objective!.progressPercent) === 100;
      
      console.log(`${isCorrect ? '✅ PASS' : '❌ FAIL'}: Expected 5/5 = 100%\n`);
    }
  } catch (error) {
    console.error('❌ Failed:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
