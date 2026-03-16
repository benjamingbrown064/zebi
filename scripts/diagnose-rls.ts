#!/usr/bin/env tsx
/**
 * Diagnose RLS Status
 */

import { PrismaClient } from '@prisma/client'

// Direct connection
const originalUrl = process.env.DATABASE_URL || ''
const directUrl = originalUrl
  .replace(':6543', ':5432')
  .replace('?pgbouncer=true', '')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl
    }
  }
})

async function main() {
  console.log('🔍 RLS Diagnostic Report\n')
  
  // Test 1: Check if we can see pg_tables
  console.log('1. Checking pg_tables access...')
  const tables = await prisma.$queryRaw<any[]>`
    SELECT schemaname, tablename, rowsecurity, hasindexes, hasrules, hastriggers
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'Workspace';
  `
  console.log('Workspace table info:', tables)
  
  // Test 2: Try to manually enable RLS on one table
  console.log('\n2. Attempting to enable RLS on Workspace...')
  try {
    await prisma.$executeRaw`ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;`
    console.log('✅ Command executed successfully')
  } catch (error: any) {
    console.log('❌ Error:', error.message)
  }
  
  // Test 3: Check again
  console.log('\n3. Checking Workspace RLS status after ALTER...')
  const afterAlter = await prisma.$queryRaw<any[]>`
    SELECT tablename, rowsecurity
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'Workspace';
  `
  console.log('After ALTER:', afterAlter)
  
  // Test 4: Check pg_class directly
  console.log('\n4. Checking pg_class.relrowsecurity...')
  const pgClass = await prisma.$queryRaw<any[]>`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'Workspace';
  `
  console.log('pg_class:', pgClass)
  
  // Test 5: Check existing policies
  console.log('\n5. Checking existing policies on Workspace...')
  const policies = await prisma.$queryRaw<any[]>`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'Workspace';
  `
  console.log(`Found ${policies.length} policies:`)
  policies.forEach((p: any) => {
    console.log(`  - ${p.policyname} (${p.cmd})`)
  })
  
  // Test 6: Check database permissions
  console.log('\n6. Checking current user and permissions...')
  const user = await prisma.$queryRaw<any[]>`SELECT current_user, session_user;`
  console.log('Current user:', user)
  
  const permissions = await prisma.$queryRaw<any[]>`
    SELECT has_table_privilege('Workspace', 'SELECT') as can_select,
           has_table_privilege('Workspace', 'INSERT') as can_insert,
           has_table_privilege('Workspace', 'UPDATE') as can_update;
  `
  console.log('Permissions:', permissions)
  
  await prisma.$disconnect()
}

main().catch(console.error)
