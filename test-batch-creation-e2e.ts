/**
 * E2E test: Batch task creation
 * Handoff from Harvey - verify batch creation works end-to-end
 */

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const ZEBI_COMPANY_ID = 'af1a0aa5-4bb8-4fd0-a9f8-5788838b52af';
const TOKEN = '0efecdc75b163372fc2063b7f97fe57f176de14ead17a16c6a02b2350ea5f06f';

async function testBatchCreation() {
  console.log('🧪 E2E Test: Batch Task Creation\n');
  
  // Test 1: Create batch of tasks
  console.log('📝 Creating batch of 3 test tasks...');
  const batchPayload = {
    workspaceId: WORKSPACE_ID,
    companyId: ZEBI_COMPANY_ID,
    tasks: [
      {
        title: 'E2E Test Task B-1',
        description: 'First test task in batch',
        status: 'ready',
        priority: 3,
        taskType: 'build'
      },
      {
        title: 'E2E Test Task B-2',
        description: 'Second test task in batch',
        status: 'ready',
        priority: 3,
        taskType: 'build'
      },
      {
        title: 'E2E Test Task B-3',
        description: 'Third test task in batch',
        status: 'ready',
        priority: 3,
        taskType: 'build'
      }
    ]
  };

  const createResponse = await fetch('https://zebi.app/api/tasks/batch', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(batchPayload)
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    console.log('❌ Batch creation failed:', error);
    return false;
  }

  const createResult = await createResponse.json();
  console.log(`✅ Batch created: ${createResult.count || 0} tasks`);
  
  if (!createResult.tasks || createResult.tasks.length === 0) {
    console.log('❌ No tasks were created');
    console.log('Response:', JSON.stringify(createResult, null, 2));
    return false;
  }

  const taskIds = createResult.tasks.map((t: any) => t.id);
  console.log(`   Task IDs: ${taskIds.join(', ')}\n`);

  // Test 2: Verify tasks exist and are retrievable
  console.log('🔍 Verifying tasks are retrievable...');
  for (const taskId of taskIds) {
    const getResponse = await fetch(`https://zebi.app/api/tasks/${taskId}?workspaceId=${WORKSPACE_ID}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    if (!getResponse.ok) {
      console.log(`❌ Task ${taskId} not found`);
      return false;
    }

    const task = await getResponse.json();
    console.log(`✅ ${task.task.title} - status: ${task.task.status}`);
  }

  // Test 3: Clean up (mark as done)
  console.log('\n🧹 Cleaning up test tasks...');
  for (const taskId of taskIds) {
    const updateResponse = await fetch(`https://zebi.app/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workspaceId: WORKSPACE_ID,
        status: 'done',
        completionNote: 'E2E test cleanup'
      })
    });

    if (updateResponse.ok) {
      console.log(`✅ Cleaned up task ${taskId}`);
    }
  }

  console.log('\n✅ E2E Test PASSED: Batch creation works!\n');
  return true;
}

testBatchCreation().catch(console.error);
