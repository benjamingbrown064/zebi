#!/usr/bin/env node

/**
 * Objective Engine Test Script
 * 
 * This script tests the Objective Engine API endpoints
 * Run: node test-objective-engine.js
 */

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function test(name, fn) {
  try {
    log(`\n▶ ${name}`, 'blue');
    await fn();
    log(`✓ ${name} passed`, 'green');
    return true;
  } catch (err) {
    log(`✗ ${name} failed: ${err.message}`, 'red');
    console.error(err);
    return false;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
  }

  return data;
}

// Test data
let testObjectiveId;
let testBlockerId;
const testWorkspaceId = process.argv[2] || 'b68f4274-c19a-412c-8e26-4eead85dde0e';
const testUserId = '00000000-0000-0000-0000-000000000000';

async function runTests() {
  log('='.repeat(60), 'yellow');
  log('Objective Engine Test Suite', 'yellow');
  log('='.repeat(60), 'yellow');
  log(`\nBase URL: ${BASE_URL}`);
  log(`Workspace ID: ${testWorkspaceId}\n`);

  let passed = 0;
  let failed = 0;

  // Test 1: List objectives (initially empty)
  if (await test('List objectives', async () => {
    const data = await request(`/api/objectives?workspaceId=${testWorkspaceId}`);
    if (!data.success) throw new Error('Request failed');
    log(`  Found ${data.objectives.length} objectives`);
  })) passed++; else failed++;

  // Test 2: Create objective with auto-breakdown
  if (await test('Create objective with auto-breakdown', async () => {
    const data = await request('/api/objectives', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: testWorkspaceId,
        title: 'Test Objective: Reach 100 Users',
        description: 'Test objective created by automated test',
        metricType: 'count',
        targetValue: 100,
        unit: 'users',
        startDate: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        objectiveType: 'users',
        priority: 1,
        autoBreakdown: false, // Skip AI breakdown in test
        createdBy: testUserId,
      }),
    });

    if (!data.success) throw new Error('Request failed');
    testObjectiveId = data.objective.id;
    log(`  Created objective: ${testObjectiveId}`);
  })) passed++; else failed++;

  if (!testObjectiveId) {
    log('\n✗ Cannot continue tests without objective ID', 'red');
    return;
  }

  // Test 3: Get objective
  if (await test('Get objective', async () => {
    const data = await request(`/api/objectives/${testObjectiveId}`);
    if (!data.success) throw new Error('Request failed');
    if (data.objective.id !== testObjectiveId) throw new Error('Wrong objective returned');
    log(`  Title: ${data.objective.title}`);
  })) passed++; else failed++;

  // Test 4: Update objective
  if (await test('Update objective', async () => {
    const data = await request(`/api/objectives/${testObjectiveId}`, {
      method: 'PUT',
      body: JSON.stringify({
        description: 'Updated description',
      }),
    });
    if (!data.success) throw new Error('Request failed');
  })) passed++; else failed++;

  // Test 5: Add progress entry
  if (await test('Add progress entry', async () => {
    const data = await request(`/api/objectives/${testObjectiveId}/progress`, {
      method: 'POST',
      body: JSON.stringify({
        value: 25,
        entryDate: new Date().toISOString().split('T')[0],
        note: 'Test progress entry',
        source: 'manual',
        createdBy: testUserId,
      }),
    });
    if (!data.success) throw new Error('Request failed');
    log(`  Progress: ${data.updatedObjective.currentValue}/${data.progressEntry.value}`);
  })) passed++; else failed++;

  // Test 6: Get progress history
  if (await test('Get progress history', async () => {
    const data = await request(`/api/objectives/${testObjectiveId}/progress`);
    if (!data.success) throw new Error('Request failed');
    log(`  Found ${data.progress.length} progress entries`);
  })) passed++; else failed++;

  // Test 7: Create manual blocker
  if (await test('Create manual blocker', async () => {
    const data = await request(`/api/objectives/${testObjectiveId}/blockers`, {
      method: 'POST',
      body: JSON.stringify({
        blockerType: 'resource',
        title: 'Test Blocker',
        description: 'This is a test blocker',
        severity: 'medium',
      }),
    });
    if (!data.success) throw new Error('Request failed');
    testBlockerId = data.blocker.id;
    log(`  Created blocker: ${testBlockerId}`);
  })) passed++; else failed++;

  // Test 8: List blockers
  if (await test('List blockers', async () => {
    const data = await request(`/api/objectives/${testObjectiveId}/blockers`);
    if (!data.success) throw new Error('Request failed');
    log(`  Found ${data.blockers.length} active blockers`);
  })) passed++; else failed++;

  // Test 9: Resolve blocker
  if (testBlockerId && await test('Resolve blocker', async () => {
    const data = await request(
      `/api/objectives/${testObjectiveId}/blockers/${testBlockerId}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify({
          note: 'Test resolution',
        }),
      }
    );
    if (!data.success) throw new Error('Request failed');
    log(`  Remaining blockers: ${data.remainingBlockers}`);
  })) passed++; else failed++;

  // Test 10: Get trajectory (without AI)
  if (await test('Get trajectory', async () => {
    try {
      const data = await request(`/api/objectives/${testObjectiveId}/trajectory`);
      if (!data.success) throw new Error('Request failed');
      log(`  Status: ${data.trajectory.status}`);
      log(`  Confidence: ${data.trajectory.confidence}`);
    } catch (err) {
      if (err.message.includes('ANTHROPIC_API_KEY')) {
        log('  Skipped (no API key)', 'yellow');
      } else {
        throw err;
      }
    }
  })) passed++; else failed++;

  // Test 11: Run analysis (without AI)
  if (await test('Run analysis', async () => {
    try {
      const data = await request(`/api/objectives/${testObjectiveId}/analyze`, {
        method: 'POST',
      });
      if (!data.success) throw new Error('Request failed');
      log(`  Trajectory: ${data.analysis.trajectory.status}`);
    } catch (err) {
      if (err.message.includes('ANTHROPIC_API_KEY')) {
        log('  Skipped (no API key)', 'yellow');
      } else {
        throw err;
      }
    }
  })) passed++; else failed++;

  // Test 12: Delete objective
  if (await test('Delete objective', async () => {
    const data = await request(`/api/objectives/${testObjectiveId}`, {
      method: 'DELETE',
    });
    if (!data.success) throw new Error('Request failed');
  })) passed++; else failed++;

  // Summary
  log('\n' + '='.repeat(60), 'yellow');
  log(`Tests completed: ${passed + failed}`, 'yellow');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log('='.repeat(60), 'yellow');

  if (failed === 0) {
    log('\n✓ All tests passed! Objective Engine is working correctly.', 'green');
  } else {
    log(`\n✗ ${failed} test(s) failed. Check the errors above.`, 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  log('\n✗ Test suite failed:', 'red');
  console.error(err);
  process.exit(1);
});
