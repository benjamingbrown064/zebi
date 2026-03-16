const { processBrainDumpSession } = require('./lib/brain-dump/processor.ts');

async function fixStuckSessions() {
  const sessionIds = [
    '6e59a67c-3546-4e52-bafe-f7328f22daa3',
    '6c8273f3-1ee0-4c19-9b14-c2114ac62918',
    '408ed16d-a12d-4572-9f60-29e43e7bbbe4'
  ];
  
  for (const sessionId of sessionIds) {
    console.log(`Processing session: ${sessionId}`);
    try {
      const result = await processBrainDumpSession(sessionId);
      console.log('Result:', result);
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

fixStuckSessions().catch(console.error);
