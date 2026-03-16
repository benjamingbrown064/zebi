import { PrismaClient } from '@prisma/client';
import { processBrainDumpSession } from './lib/brain-dump/processor.ts';

const prisma = new PrismaClient();

async function main() {
  // Get latest stuck session
  const session = await prisma.brainDumpSession.findFirst({
    where: { status: 'transcribed' },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!session) {
    console.log('✅ No stuck sessions found');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`\n📝 Found stuck session: ${session.id}`);
  console.log(`Transcript: "${session.transcriptClean?.substring(0, 80)}..."`);
  console.log('\n🔄 Processing...\n');
  
  try {
    const result = await processBrainDumpSession(session.id);
    
    console.log('\n✅ Processing complete!');
    console.log(`- Actions generated: ${result.actionsGenerated}`);
    console.log(`- High confidence: ${result.highConfidenceActions}`);
    console.log(`- Needs review: ${result.needsReviewActions}`);
    
    console.log(`\n👉 View at: http://localhost:3000/brain-dump/review/${session.id}`);
  } catch (error) {
    console.error('\n❌ Processing failed:');
    console.error(error.message);
    console.error(error.stack);
  }
  
  await prisma.$disconnect();
}

main();
