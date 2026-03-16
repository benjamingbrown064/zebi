#!/usr/bin/env tsx
/**
 * Apply and Verify RLS Policies
 * 
 * This script:
 * 1. Checks current RLS status
 * 2. Applies complete RLS policies from rls-policies-complete.sql
 * 3. Verifies all tables have RLS enabled
 * 4. Generates a report
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

interface RLSStatus {
  tablename: string
  rowsecurity: boolean
}

async function checkCurrentRLS(): Promise<RLSStatus[]> {
  console.log('\n🔍 Checking current RLS status...\n')
  
  const result = await prisma.$queryRaw<RLSStatus[]>`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename;
  `
  
  return result
}

async function applyRLSPolicies(): Promise<void> {
  console.log('\n📝 Applying RLS policies from rls-policies-complete.sql...\n')
  
  const sqlPath = path.join(process.cwd(), 'prisma', 'rls-policies-complete.sql')
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8')
  
  // Split by semicolons and filter out comments and empty lines
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`Found ${statements.length} SQL statements to execute\n`)
  
  let successCount = 0
  let errorCount = 0
  
  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement + ';')
      successCount++
      
      // Show progress for major operations
      if (statement.includes('ALTER TABLE') && statement.includes('ENABLE ROW LEVEL SECURITY')) {
        const match = statement.match(/ALTER TABLE "(\w+)"/)
        if (match) {
          console.log(`✅ Enabled RLS on: ${match[1]}`)
        }
      }
    } catch (error: any) {
      // Some errors are expected (like "policy already exists")
      if (!error.message?.includes('already exists')) {
        console.error(`❌ Error executing statement: ${statement.substring(0, 100)}...`)
        console.error(`   ${error.message}`)
        errorCount++
      }
    }
  }
  
  console.log(`\n✅ Successfully executed ${successCount} statements`)
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} statements had errors (may be expected)`)
  }
}

async function verifyRLS(): Promise<{ enabled: RLSStatus[], disabled: RLSStatus[] }> {
  console.log('\n🔍 Verifying RLS is enabled on all tables...\n')
  
  const tables = await checkCurrentRLS()
  const enabled = tables.filter(t => t.rowsecurity)
  const disabled = tables.filter(t => !t.rowsecurity)
  
  return { enabled, disabled }
}

async function countPolicies(): Promise<number> {
  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM pg_policies
    WHERE schemaname = 'public';
  `
  
  return Number(result[0].count)
}

async function listPoliciesByTable(): Promise<Record<string, number>> {
  const result = await prisma.$queryRaw<{ tablename: string, policy_count: bigint }[]>`
    SELECT tablename, COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
    ORDER BY tablename;
  `
  
  return Object.fromEntries(
    result.map(r => [r.tablename, Number(r.policy_count)])
  )
}

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  RLS POLICY APPLICATION & VERIFICATION')
  console.log('═══════════════════════════════════════════')
  
  try {
    // Step 1: Check current status
    const beforeRLS = await checkCurrentRLS()
    const beforeEnabled = beforeRLS.filter(t => t.rowsecurity).length
    const beforeDisabled = beforeRLS.filter(t => !t.rowsecurity).length
    
    console.log(`📊 Before: ${beforeEnabled} tables with RLS, ${beforeDisabled} without\n`)
    
    if (beforeDisabled > 0) {
      console.log('Tables WITHOUT RLS:')
      beforeRLS.filter(t => !t.rowsecurity).forEach(t => {
        console.log(`  ❌ ${t.tablename}`)
      })
    }
    
    // Step 2: Apply policies
    await applyRLSPolicies()
    
    // Step 3: Verify
    const { enabled, disabled } = await verifyRLS()
    
    console.log(`\n✅ Tables with RLS enabled: ${enabled.length}`)
    enabled.forEach(t => {
      console.log(`   ✓ ${t.tablename}`)
    })
    
    if (disabled.length > 0) {
      console.log(`\n❌ Tables WITHOUT RLS: ${disabled.length}`)
      disabled.forEach(t => {
        console.log(`   ✗ ${t.tablename}`)
      })
    }
    
    // Step 4: Count policies
    const totalPolicies = await countPolicies()
    console.log(`\n📋 Total RLS policies created: ${totalPolicies}`)
    
    const policiesByTable = await listPoliciesByTable()
    console.log('\n📊 Policies per table:')
    Object.entries(policiesByTable).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} policies`)
    })
    
    // Step 5: Summary
    console.log('\n═══════════════════════════════════════════')
    console.log('  SUMMARY')
    console.log('═══════════════════════════════════════════')
    console.log(`✅ Tables with RLS: ${enabled.length}/${beforeRLS.length}`)
    console.log(`📋 Total policies: ${totalPolicies}`)
    
    if (disabled.length === 0) {
      console.log('\n🎉 SUCCESS! All tables now have RLS enabled!')
    } else {
      console.log(`\n⚠️  WARNING: ${disabled.length} tables still without RLS`)
      console.log('   Review and apply policies for these tables.')
    }
    
    console.log('\n═══════════════════════════════════════════\n')
    
    // Generate report file
    const report = {
      timestamp: new Date().toISOString(),
      before: {
        enabled: beforeEnabled,
        disabled: beforeDisabled,
        total: beforeRLS.length
      },
      after: {
        enabled: enabled.length,
        disabled: disabled.length,
        total: beforeRLS.length
      },
      totalPolicies,
      policiesByTable,
      tablesWithoutRLS: disabled.map(t => t.tablename)
    }
    
    const reportPath = path.join(process.cwd(), 'RLS_APPLICATION_REPORT.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📄 Report saved to: ${reportPath}\n`)
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
