const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const suggestions = await prisma.aISuggestion.findMany({
    where: {
      workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  
  console.log('Recent AI Suggestions:')
  console.log('=' .repeat(80))
  
  suggestions.forEach(s => {
    console.log(`\nID: ${s.id}`)
    console.log(`Type: ${s.type} | Status: ${s.status} | Confidence: ${s.confidence}%`)
    console.log(`Title: ${s.title}`)
    console.log(`Created: ${s.createdAt.toISOString()}`)
    console.log(`Expires: ${s.expiresAt.toISOString()}`)
    if (s.implementedAt) console.log(`Implemented: ${s.implementedAt.toISOString()}`)
    if (s.dismissedAt) console.log(`Dismissed: ${s.dismissedAt.toISOString()}`)
  })
  
  console.log('\n' + '='.repeat(80))
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
