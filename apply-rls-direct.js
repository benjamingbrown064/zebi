/**
 * Apply RLS Policies directly using pg client
 * This bypasses Prisma and connects directly to execute raw SQL
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function applyRLSPolicies() {
  const connectionString = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace('?pgbouncer=true', '').replace(':6543', ':5432')
    : 'postgresql://postgres:patxev-sodhyn-2oa90a@db.btuphkievfekuwkfqnib.supabase.co:5432/postgres'

  const client = new Client({ connectionString })

  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('✓ Connected\n')

    console.log('Reading RLS policies SQL file...')
    const sqlFile = path.join(__dirname, 'prisma', 'inbox-rls-policies.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')
    
    console.log('Executing RLS policies SQL...\n')
    await client.query(sql)
    
    console.log('✅ All RLS policies applied successfully!')
  } catch (error) {
    console.error('❌ Error applying RLS policies:', error.message)
    if (error.message.includes('already exists')) {
      console.log('\n⚠ Note: Some policies may already exist - this is OK')
    } else {
      process.exit(1)
    }
  } finally {
    await client.end()
  }
}

applyRLSPolicies()
