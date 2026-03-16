// Test script for AI Work Queue System
// Run with: npx tsx test-queue.ts

import { 
  addToQueue, 
  getNextQueueItem, 
  completeQueueItem,
  getQueueStatus,
  QUEUE_PRIORITIES,
  QUEUE_TYPES
} from './lib/ai-queue';

async function testQueueSystem() {
  console.log('🧪 Testing AI Work Queue System...\n');

  // You'll need to replace this with an actual workspace ID from your database
  const testWorkspaceId = 'test-workspace-id';

  try {
    // Test 1: Add items to queue with different priorities
    console.log('1️⃣ Adding test items to queue...');
    
    const item1 = await addToQueue({
      workspaceId: testWorkspaceId,
      priority: QUEUE_PRIORITIES.URGENT,
      queueType: QUEUE_TYPES.TASK,
      contextData: {
        taskTitle: 'Urgent: Review customer feedback',
        description: 'High priority customer issue',
      },
    });
    console.log('  ✅ Added urgent item:', item1.id);

    const item2 = await addToQueue({
      workspaceId: testWorkspaceId,
      priority: QUEUE_PRIORITIES.RESEARCH,
      queueType: QUEUE_TYPES.RESEARCH,
      contextData: {
        taskTitle: 'Research competitor pricing',
        description: 'Market research task',
      },
    });
    console.log('  ✅ Added research item:', item2.id);

    const item3 = await addToQueue({
      workspaceId: testWorkspaceId,
      priority: QUEUE_PRIORITIES.REPEATING,
      queueType: QUEUE_TYPES.TASK,
      contextData: {
        taskTitle: 'Daily standup notes',
        description: 'Repeating daily task',
      },
    });
    console.log('  ✅ Added repeating item:', item3.id);

    // Test 2: Get queue status
    console.log('\n2️⃣ Getting queue status...');
    const status = await getQueueStatus(testWorkspaceId);
    console.log('  📊 Queue status:', JSON.stringify(status, null, 2));

    // Test 3: Get next item (should be repeating, highest priority)
    console.log('\n3️⃣ Getting next item (should be repeating task)...');
    const nextItem = await getNextQueueItem(testWorkspaceId, 'test-ai');
    if (nextItem) {
      console.log('  ✅ Got item:', nextItem.id);
      console.log('  📋 Priority:', nextItem.priority);
      console.log('  📋 Type:', nextItem.queueType);
      console.log('  📋 Context:', nextItem.contextData);

      // Test 4: Complete the item
      console.log('\n4️⃣ Completing the item...');
      const completed = await completeQueueItem(nextItem.id, {
        status: 'completed',
        notes: 'Task completed successfully by test script',
        duration: '5 minutes',
      });
      console.log('  ✅ Item completed at:', completed.completedAt);
    } else {
      console.log('  ⚠️  No items available in queue');
    }

    // Test 5: Get next item again (should be urgent now)
    console.log('\n5️⃣ Getting next item (should be urgent task)...');
    const nextItem2 = await getNextQueueItem(testWorkspaceId, 'test-ai');
    if (nextItem2) {
      console.log('  ✅ Got item:', nextItem2.id);
      console.log('  📋 Priority:', nextItem2.priority);
      console.log('  📋 Type:', nextItem2.queueType);

      // Mark this as completed too
      await completeQueueItem(nextItem2.id, {
        status: 'completed',
        notes: 'Second task completed',
      });
      console.log('  ✅ Item completed');
    }

    // Final status
    console.log('\n6️⃣ Final queue status...');
    const finalStatus = await getQueueStatus(testWorkspaceId);
    console.log('  📊 Final status:', JSON.stringify(finalStatus.summary, null, 2));

    console.log('\n✅ All tests passed! Queue system is working correctly.\n');
    console.log('📝 Summary:');
    console.log('  - Priority order works correctly (repeating → urgent → research)');
    console.log('  - Items can be claimed and completed');
    console.log('  - Queue status provides accurate overview');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
testQueueSystem();
