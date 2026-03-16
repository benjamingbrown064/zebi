// Manual processing script for stuck sessions
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processStuckSessions() {
  // Get latest stuck session
  const session = await prisma.brainDumpSession.findFirst({
    where: { status: 'transcribed' },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!session) {
    console.log('No stuck sessions found');
    return;
  }
  
  console.log(`Found stuck session: ${session.id}`);
  console.log(`Transcript: ${session.transcriptClean?.substring(0, 100)}...`);
  
  // Import and run processor
  console.log('\nTriggering processing...');
  
  try {
    // Dynamically import the processor
    const { processBrainDumpSession } = await import('./lib/brain-dump/processor.ts');
    const result = await processBrainDumpSession(session.id);
    
    console.log('\nProcessing complete!');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\nProcessing failed:');
    console.error(error);
  }
  
  await prisma.$disconnect();
}

processStuckSessions();
