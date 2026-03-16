const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const doc = await prisma.document.create({
      data: {
        workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
        title: 'Test Document',
        documentType: 'notes',
        contentRich: { type: 'doc', content: [] },
        version: 1,
        createdBy: '00000000-0000-0000-0000-000000000000'
      }
    });
    console.log('✅ Document created:', doc.id);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Code:', err.code);
  } finally {
    await prisma.$disconnect();
  }
}

test();
