// Run the bot attribution migration manually
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Running bot attribution migration...')
  
  try {
    // Change AIMemory createdBy from UUID to TEXT
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "AIMemory" ALTER COLUMN "createdBy" DROP NOT NULL;
    `)
    console.log('✓ AIMemory createdBy nullable')
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "AIMemory" ALTER COLUMN "createdBy" TYPE TEXT;
    `)
    console.log('✓ AIMemory createdBy → TEXT')
    
    // Add createdBy to AIInsight
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "AIInsight" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
    `)
    console.log('✓ AIInsight createdBy added')
    
    // Add botAssignee to Task
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "botAssignee" TEXT;
    `)
    console.log('✓ Task botAssignee added')
    
    // Add indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AIMemory_createdBy_idx" ON "AIMemory"("createdBy");
    `)
    console.log('✓ AIMemory index created')
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AIInsight_createdBy_idx" ON "AIInsight"("createdBy");
    `)
    console.log('✓ AIInsight index created')
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Task_botAssignee_idx" ON "Task"("botAssignee");
    `)
    console.log('✓ Task index created')
    
    // Update existing records
    await prisma.$executeRawUnsafe(`
      UPDATE "AIMemory" SET "createdBy" = 'system' WHERE "createdBy" IS NULL;
    `)
    console.log('✓ AIMemory updated (null → system)')
    
    await prisma.$executeRawUnsafe(`
      UPDATE "AIInsight" SET "createdBy" = 'system' WHERE "createdBy" IS NULL;
    `)
    console.log('✓ AIInsight updated (null → system)')
    
    console.log('\n✅ Migration complete!')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
