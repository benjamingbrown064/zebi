#!/usr/bin/env ts-node
/**
 * Test script for the alert detection system
 * 
 * Usage:
 *   npx ts-node test-alert-system.ts
 *   npx ts-node test-alert-system.ts --type=new_insight
 *   npx ts-node test-alert-system.ts --priority=critical,high
 */

import { detectAlerts, getAlertsByType, formatAlertsForTelegram } from './lib/alert-system.js';

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';

async function testAlertSystem() {
  console.log('🔍 Testing Alert Detection System\n');
  console.log('=================================\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const typeArg = args.find((arg) => arg.startsWith('--type='));
  const priorityArg = args.find((arg) => arg.startsWith('--priority='));
  const hoursAgoArg = args.find((arg) => arg.startsWith('--hours='));

  const alertType = typeArg ? typeArg.split('=')[1] : null;
  const priorityFilter = priorityArg
    ? (priorityArg.split('=')[1].split(',') as any[])
    : undefined;
  const hoursAgo = hoursAgoArg ? parseInt(hoursAgoArg.split('=')[1]) : 6;

  try {
    if (alertType) {
      // Test specific alert type
      console.log(`Testing: ${alertType}`);
      console.log(`Time range: Last ${hoursAgo} hours\n`);

      const alerts = await getAlertsByType(DEFAULT_WORKSPACE_ID, alertType, hoursAgo);

      console.log(`Found ${alerts.length} alerts:\n`);
      alerts.forEach((alert, index) => {
        console.log(`${index + 1}. [${alert.priority.toUpperCase()}] ${alert.title}`);
        console.log(`   ${alert.message}`);
        console.log(`   URL: ${alert.actionUrl}`);
        console.log(`   Time: ${alert.timestamp}\n`);
      });
    } else {
      // Test all alert types
      console.log('Testing: All alert types');
      console.log(`Time range: Last ${hoursAgo} hours`);
      if (priorityFilter) {
        console.log(`Priority filter: ${priorityFilter.join(', ')}`);
      }
      console.log();

      const result = await detectAlerts({
        workspaceId: DEFAULT_WORKSPACE_ID,
        hoursAgo,
        priorityFilter,
      });

      if (!result.success) {
        console.error('❌ Error:', result.error);
        return;
      }

      console.log(`✅ Success! Found ${result.count} alerts\n`);
      console.log('Alerts by type:');

      const byType = result.alerts.reduce((acc, alert) => {
        if (!acc[alert.type]) acc[alert.type] = 0;
        acc[alert.type]++;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(byType).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });

      console.log('\nAlerts by priority:');
      const byPriority = result.alerts.reduce((acc, alert) => {
        if (!acc[alert.priority]) acc[alert.priority] = 0;
        acc[alert.priority]++;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(byPriority).forEach(([priority, count]) => {
        console.log(`  - ${priority}: ${count}`);
      });

      console.log('\n' + '='.repeat(50) + '\n');
      console.log('Detailed Alerts:\n');

      result.alerts.forEach((alert, index) => {
        console.log(`${index + 1}. [${alert.priority.toUpperCase()}] ${alert.type}`);
        console.log(`   ${alert.message}`);
        console.log(`   URL: ${alert.actionUrl}`);
        console.log(`   Time: ${alert.timestamp}\n`);
      });

      console.log('\n' + '='.repeat(50) + '\n');
      console.log('Telegram Format:\n');
      console.log(formatAlertsForTelegram(result.alerts));
      console.log('\n' + '='.repeat(50) + '\n');
    }

    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAlertSystem().catch(console.error);
