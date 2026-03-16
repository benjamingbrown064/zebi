#!/usr/bin/env tsx
/**
 * Apply RLS Policies - Final Version
 * 
 * Properly parses and executes SQL statements with better error handling
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Direct connection (not PgBouncer)
const originalUrl = process.env.DATABASE_URL || ''
const directUrl = originalUrl
  .replace(':6543', ':5432')
  .replace('?pgbouncer=true', '')

const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } }
})

interface RLSStatus {
  tablename: string
  rowsecurity: boolean
}

// Better SQL parser - handles multi-line statements
function parseSQL(content: string): string[] {
  const statements: string[] = []
  let currentStatement = ''
  let inComment = false
  
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Skip empty lines
    if (!trimmed) continue
    
    // Handle multi-line comments
    if (trimmed.startsWith('/*')) {
      inComment = true
      continue
    }
    if (trimmed.endsWith('*/')) {
      inComment = false
      continue
    }
    if (inComment) continue
    
    // Skip single-line comments
    if (trimmed.startsWith('--')) continue
    
    // Add line to current statement
    currentStatement += ' ' + trimmed
    
    // If line ends with semicolon, we have a complete statement
    if (trimmed.endsWith(';')) {
      const stmt = currentStatement.trim().slice(0, -1).trim() // Remove semicolon
      if (stmt.length > 0) {
        statements.push(stmt)
      }
      currentStatement = ''
    }
  }
  
  // Add any remaining statement
  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim())
  }
  
  return statements
}

async function checkRLS(): Promise<RLSStatus[]> {
  const result = await prisma.$queryRaw<RLSStatus[]>`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename;
  `
  return result
}

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  APPLYING RLS POLICIES TO ZEBI DATABASE')
  console.log('═══════════════════════════════════════════════════\n')
  
  try {
    // Step 1: Check before
    console.log('📊 Checking current RLS status...\n')
    const before = await checkRLS()
    const beforeEnabled = before.filter(t => t.rowsecurity && t.tablename !== '_prisma_migrations')
    const beforeDisabled = before.filter(t => !t.rowsecurity && t.tablename !== '_prisma_migrations')
    
    console.log(`Before: ${beforeEnabled.length} tables with RLS, ${beforeDisabled.length} without\n`)
    
    // Step 2: Read and parse SQL file
    const sqlPath = path.join(process.cwd(), 'prisma', 'rls-policies-complete.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8')
    const statements = parseSQL(sqlContent)
    
    console.log(`📝 Parsed ${statements.length} SQL statements from file\n`)
    
    // Step 3: Group statements by type
    const alterStatements = statements.filter(s => s.includes('ALTER TABLE') && s.includes('ENABLE ROW LEVEL SECURITY'))
    const dropStatements = statements.filter(s => s.includes('DROP POLICY'))
    const createStatements = statements.filter(s => s.includes('CREATE POLICY'))
    
    console.log(`   ${alterStatements.length} ALTER TABLE statements`)
    console.log(`   ${dropStatements.length} DROP POLICY statements`)
    console.log(`   ${createStatements.length} CREATE POLICY statements\n`)
    
    // Step 4: Execute ALTER TABLE statements first
    console.log('🔐 Enabling RLS on all tables...\n')
    let alterSuccess = 0
    let alterFailed = 0
    
    for (const stmt of alterStatements) {
      try {
        await prisma.$executeRawUnsafe(stmt)
        const match = stmt.match(/ALTER TABLE "(\w+)"/)
        if (match) {
          console.log(`   ✅ ${match[1]}`)
          alterSuccess++
        }
      } catch (error: any) {
        alterFailed++
        console.error(`   ❌ Error: ${error.message}`)
      }
    }
    
    console.log(`\nAlter tables: ${alterSuccess} success, ${alterFailed} failed\n`)
    
    // Step 5: Drop existing policies (if any) - ignore errors
    console.log('🗑️  Dropping existing policies (if any)...')
    for (const stmt of dropStatements) {
      try {
        await prisma.$executeRawUnsafe(stmt)
      } catch {
        // Ignore errors - policy might not exist
      }
    }
    console.log('   Done\n')
    
    // Step 6: Create policies
    console.log('📋 Creating RLS policies...\n')
    let policySuccess = 0
    let policyFailed = 0
    const policyErrors: string[] = []
    
    for (const stmt of createStatements) {
      try {
        await prisma.$executeRawUnsafe(stmt)
        policySuccess++
        process.stdout.write('.')
        if (policySuccess % 50 === 0) process.stdout.write(` ${policySuccess}\n`)
      } catch (error: any) {
        policyFailed++
        const match = stmt.match(/CREATE POLICY "(\w+)" ON "(\w+)"/)
        if (match) {
          policyErrors.push(`${match[2]}.${match[1]}: ${error.message}`)
        }
      }
    }
    
    console.log(`\n\nPolicies: ${policySuccess} created, ${policyFailed} failed`)
    if (policyErrors.length > 0) {
      console.log('\nPolicy errors (first 5):')
      policyErrors.slice(0, 5).forEach(err => console.log(`   ❌ ${err}`))
    }
    
    // Step 7: Verify final status
    console.log('\n\n🔍 Verifying final RLS status...\n')
    const after = await checkRLS()
    const afterEnabled = after.filter(t => t.rowsecurity && t.tablename !== '_prisma_migrations')
    const afterDisabled = after.filter(t => !t.rowsecurity && t.tablename !== '_prisma_migrations')
    
    console.log('✅ Tables WITH RLS:')
    afterEnabled.forEach(t => console.log(`   ✓ ${t.tablename}`))
    
    if (afterDisabled.length > 0) {
      console.log('\n❌ Tables WITHOUT RLS:')
      afterDisabled.forEach(t => console.log(`   ✗ ${t.tablename}`))
    }
    
    // Step 8: Count policies
    const policyCount = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM pg_policies WHERE schemaname = 'public';
    `
    const totalPolicies = Number(policyCount[0].count)
    
    // Step 9: Summary
    console.log('\n═══════════════════════════════════════════════════')
    console.log('  SUMMARY')
    console.log('═══════════════════════════════════════════════════')
    console.log(`Tables with RLS: ${afterEnabled.length}/${after.length - 1} (excluding _prisma_migrations)`)
    console.log(`Total policies: ${totalPolicies}`)
    console.log(`ALTER statements executed: ${alterSuccess}/${alterStatements.length}`)
    console.log(`CREATE POLICY statements executed: ${policySuccess}/${createStatements.length}`)
    
    if (afterDisabled.length === 0) {
      console.log('\n✅ SUCCESS! All application tables now have RLS enabled!')
      console.log('   Your database is now protected with Row-Level Security.\n')
    } else {
      console.log(`\n⚠️  WARNING: ${afterDisabled.length} tables still without RLS`)
      console.log('   Manual intervention may be required.\n')
    }
    
    console.log('═══════════════════════════════════════════════════\n')
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      success: afterDisabled.length === 0,
      before: {
        enabled: beforeEnabled.length,
        disabled: beforeDisabled.length
      },
      after: {
        enabled: afterEnabled.length,
        disabled: afterDisabled.length
      },
      statements: {
        alter: { total: alterStatements.length, success: alterSuccess, failed: alterFailed },
        create: { total: createStatements.length, success: policySuccess, failed: policyFailed }
      },
      totalPolicies,
      tablesWithRLS: afterEnabled.map(t => t.tablename),
      tablesWithoutRLS: afterDisabled.map(t => t.tablename)
    }
    
    fs.writeFileSync(
      path.join(process.cwd(), 'RLS_APPLICATION_REPORT.json'),
      JSON.stringify(report, null, 2)
    )
    console.log('📄 Report saved to: RLS_APPLICATION_REPORT.json\n')
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
