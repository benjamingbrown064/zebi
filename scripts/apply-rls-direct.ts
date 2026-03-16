#!/usr/bin/env tsx
/**
 * Apply RLS Policies Using Direct Connection
 * 
 * PgBouncer doesn't support DDL (ALTER TABLE, CREATE POLICY).
 * This script uses the direct Postgres connection (port 5432).
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Get the direct database URL (port 5432 instead of 6543)
const originalUrl = process.env.DATABASE_URL || ''
const directUrl = originalUrl
  .replace(':6543', ':5432')
  .replace('?pgbouncer=true', '')

console.log('📡 Original URL port:', originalUrl.includes(':6543') ? '6543 (PgBouncer)' : '5432 (Direct)')
console.log('📡 Direct URL port: 5432 (Direct connection)\n')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl
    }
  }
})

interface RLSStatus {
  tablename: string
  rowsecurity: boolean
}

async function checkCurrentRLS(): Promise<RLSStatus[]> {
  const result = await prisma.$queryRaw<RLSStatus[]>`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename;
  `
  
  return result
}

async function applyRLSPolicies(): Promise<void> {
  console.log('📝 Applying RLS policies from rls-policies-complete.sql...\n')
  
  const sqlPath = path.join(process.cwd(), 'prisma', 'rls-policies-complete.sql')
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8')
  
  // Split by semicolons, filter comments and empty lines
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/))
  
  console.log(`Found ${statements.length} SQL statements\n`)
  
  let successCount = 0
  let skipCount = 0
  const errors: string[] = []
  
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
      } else if (statement.includes('CREATE POLICY')) {
        const match = statement.match(/CREATE POLICY "(\w+)" ON "(\w+)"/)
        if (match) {
          process.stdout.write('.') // Progress dot for policies
        }
      }
    } catch (error: any) {
      // Some errors are expected (policy already exists)
      if (error.message?.includes('already exists')) {
        skipCount++
      } else {
        const shortStmt = statement.substring(0, 80).replace(/\s+/g, ' ')
        errors.push(`${shortStmt}... → ${error.message}`)
      }
    }
  }
  
  console.log(`\n\n✅ Successfully executed ${successCount} statements`)
  console.log(`⏭️  Skipped ${skipCount} (already exist)`)
  
  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`)
    errors.slice(0, 5).forEach(err => console.log(`   ${err}`))
    if (errors.length > 5) {
      console.log(`   ... and ${errors.length - 5} more`)
    }
  }
}

async function verifyRLS(): Promise<{ enabled: RLSStatus[], disabled: RLSStatus[] }> {
  console.log('\n\n🔍 Verifying RLS status...\n')
  
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
  console.log('═══════════════════════════════════════════════════')
  console.log('  RLS POLICY APPLICATION (DIRECT CONNECTION)')
  console.log('═══════════════════════════════════════════════════\n')
  
  try {
    // Step 1: Check current status
    const beforeRLS = await checkCurrentRLS()
    const beforeEnabled = beforeRLS.filter(t => t.rowsecurity).length
    const beforeDisabled = beforeRLS.filter(t => !t.rowsecurity).length
    
    console.log(`📊 Before: ${beforeEnabled} tables with RLS, ${beforeDisabled} without\n`)
    
    if (beforeDisabled > 0) {
      console.log('Tables WITHOUT RLS:')
      beforeRLS
        .filter(t => !t.rowsecurity && t.tablename !== '_prisma_migrations')
        .slice(0, 10)
        .forEach(t => console.log(`  ❌ ${t.tablename}`))
      
      if (beforeDisabled > 10) {
        console.log(`  ... and ${beforeDisabled - 10} more\n`)
      }
    }
    
    // Step 2: Apply policies
    await applyRLSPolicies()
    
    // Step 3: Verify
    const { enabled, disabled } = await verifyRLS()
    
    console.log(`✅ Tables with RLS enabled: ${enabled.length}`)
    if (enabled.length <= 30) {
      enabled.forEach(t => {
        console.log(`   ✓ ${t.tablename}`)
      })
    }
    
    if (disabled.length > 0) {
      const relevantDisabled = disabled.filter(t => t.tablename !== '_prisma_migrations')
      if (relevantDisabled.length > 0) {
        console.log(`\n❌ Tables WITHOUT RLS: ${relevantDisabled.length}`)
        relevantDisabled.forEach(t => {
          console.log(`   ✗ ${t.tablename}`)
        })
      }
    }
    
    // Step 4: Count policies
    const totalPolicies = await countPolicies()
    console.log(`\n📋 Total RLS policies: ${totalPolicies}`)
    
    const policiesByTable = await listPoliciesByTable()
    console.log('\n📊 Policies per table:')
    Object.entries(policiesByTable)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([table, count]) => {
        const checkmark = enabled.some(t => t.tablename === table) ? '✅' : '❌'
        console.log(`   ${checkmark} ${table}: ${count} policies`)
      })
    
    // Step 5: Summary
    const relevantTables = beforeRLS.filter(t => t.tablename !== '_prisma_migrations')
    const relevantEnabled = enabled.filter(t => t.tablename !== '_prisma_migrations')
    
    console.log('\n═══════════════════════════════════════════════════')
    console.log('  SUMMARY')
    console.log('═══════════════════════════════════════════════════')
    console.log(`✅ Tables with RLS: ${relevantEnabled.length}/${relevantTables.length}`)
    console.log(`📋 Total policies: ${totalPolicies}`)
    
    if (relevantEnabled.length === relevantTables.length) {
      console.log('\n🎉 SUCCESS! All tables now have RLS enabled!')
      console.log('   Database is now secured with Row-Level Security.\n')
    } else {
      const missing = relevantTables.length - relevantEnabled.length
      console.log(`\n⚠️  WARNING: ${missing} tables still without RLS`)
      console.log('   Review and manually enable RLS for these tables.\n')
    }
    
    console.log('═══════════════════════════════════════════════════\n')
    
    // Generate report
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
      tablesWithRLS: enabled.map(t => t.tablename),
      tablesWithoutRLS: disabled.map(t => t.tablename)
    }
    
    const reportPath = path.join(process.cwd(), 'RLS_APPLICATION_REPORT.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📄 Report saved to: RLS_APPLICATION_REPORT.json\n`)
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
