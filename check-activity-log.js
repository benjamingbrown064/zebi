#!/usr/bin/env node
/**
 * Check if daily summary is stored in ActivityLog
 */

// Run from focus-app directory where @prisma/client is installed
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkActivityLog() {
  try {
    console.log('Checking ActivityLog for daily_summary entries...\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const entries = await prisma.activityLog.findMany({
      where: {
        eventType: 'daily_summary',
        createdAt: {
          gte: today
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    });
    
    console.log(`Found ${entries.length} daily_summary entries today\n`);
    
    if (entries.length > 0) {
      console.log('✅ Latest entry:');
      const latest = entries[0];
      console.log('  - ID:', latest.id);
      console.log('  - Created:', latest.createdAt);
      console.log('  - Event Type:', latest.eventType);
      console.log('  - AI Agent:', latest.aiAgent);
      
      if (latest.eventPayload) {
        const payload = latest.eventPayload;
        console.log('  - Has summary text:', !!payload.text);
        console.log('  - Has data:', !!payload.data);
        console.log('  - Generated at:', payload.generatedAt);
        
        if (payload.text) {
          console.log('\n--- Summary Preview ---');
          console.log(payload.text.substring(0, 200) + '...');
        }
      }
      
      console.log('\n✅ ActivityLog storage confirmed!');
    } else {
      console.log('❌ No daily_summary entries found today');
      console.log('   (This is expected if you haven\'t called the endpoint yet)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkActivityLog();
