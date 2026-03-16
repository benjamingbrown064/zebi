const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSessions() {
  const sessions = await prisma.brainDumpSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      status: true,
      summary: true,
      transcriptClean: true,
      createdAt: true,
      processingStartedAt: true,
      processingCompletedAt: true
    }
  });
  
  console.log('Recent sessions:', JSON.stringify(sessions, null, 2));
  
  if (sessions.length > 0) {
    const latestId = sessions[0].id;
    
    const actions = await prisma.brainDumpProposedAction.count({
      where: { brainDumpSessionId: latestId }
    });
    
    const mentions = await prisma.brainDumpEntityMention.count({
      where: { brainDumpSessionId: latestId }
    });
    
    console.log(`\nLatest session (${latestId}):`);
    console.log(`- Actions: ${actions}`);
    console.log(`- Entity mentions: ${mentions}`);
  }
  
  await prisma.$disconnect();
}

checkSessions().catch(console.error);
