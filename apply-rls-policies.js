/**
 * Apply RLS Policies for InboxItem table
 * Run this script to apply Row Level Security policies after migration
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function applyRLSPolicies() {
  try {
    console.log('Reading RLS policies SQL file...')
    const sqlFile = path.join(__dirname, 'prisma', 'inbox-rls-policies.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')
    
    // Split SQL file by statements (each ending with semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements to execute\n`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      console.log(statement.substring(0, 80) + '...\n')
      
      try {
        await prisma.$executeRawUnsafe(statement)
        console.log('✓ Success\n')
      } catch (err) {
        // Some statements might fail if already applied (e.g., "ALTER TABLE ENABLE ROW LEVEL SECURITY")
        if (err.message.includes('already exists') || err.message.includes('already enabled')) {
          console.log('⚠ Already exists, skipping\n')
        } else {
          throw err
        }
      }
    }
    
    console.log('✅ All RLS policies applied successfully!')
  } catch (error) {
    console.error('❌ Error applying RLS policies:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

applyRLSPolicies()
