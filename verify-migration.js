/**
 * Verify InboxItem table and RLS policies are correctly applied
 */

const { PrismaClient } = require('@prisma/client')
const { Client } = require('pg')

const prisma = new PrismaClient()

async function verifyMigration() {
  const connectionString = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace('?pgbouncer=true', '').replace(':6543', ':5432')
    : 'postgresql://postgres:patxev-sodhyn-2oa90a@db.btuphkievfekuwkfqnib.supabase.co:5432/postgres'

  const client = new Client({ connectionString })

  try {
    await client.connect()
    
    console.log('🔍 Verifying InboxItem table...\n')
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'InboxItem'
      );
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ InboxItem table exists')
    } else {
      console.log('❌ InboxItem table NOT found')
      return
    }
    
    // Check RLS is enabled
    const rlsCheck = await client.query(`
      SELECT relrowsecurity 
      FROM pg_class 
      WHERE relname = 'InboxItem';
    `)
    
    if (rlsCheck.rows[0] && rlsCheck.rows[0].relrowsecurity) {
      console.log('✅ Row Level Security is enabled')
    } else {
      console.log('⚠️  Row Level Security is NOT enabled')
    }
    
    // Check policies
    const policiesCheck = await client.query(`
      SELECT policyname 
      FROM pg_policies 
      WHERE tablename = 'InboxItem';
    `)
    
    console.log(`\n✅ ${policiesCheck.rows.length} RLS policies found:`)
    policiesCheck.rows.forEach(row => {
      console.log(`   - ${row.policyname}`)
    })
    
    // Check columns
    const columnsCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'InboxItem'
      ORDER BY ordinal_position;
    `)
    
    console.log(`\n✅ ${columnsCheck.rows.length} columns found:`)
    columnsCheck.rows.slice(0, 10).forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`)
    })
    if (columnsCheck.rows.length > 10) {
      console.log(`   ... and ${columnsCheck.rows.length - 10} more`)
    }
    
    // Try to count rows (should be 0)
    const countCheck = await prisma.inboxItem.count()
    console.log(`\n✅ Table is queryable (${countCheck} rows)`)
    
    console.log('\n🎉 Migration verification complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Start dev server: npm run dev')
    console.log('   2. Open: http://localhost:3000/inbox')
    console.log('   3. Test Quick Add → Create inbox item')
    
  } catch (error) {
    console.error('❌ Verification error:', error.message)
  } finally {
    await client.end()
    await prisma.$disconnect()
  }
}

verifyMigration()
