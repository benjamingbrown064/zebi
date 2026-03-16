const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkContent() {
  const doc = await prisma.document.findUnique({
    where: { id: 'a42252b4-f1ed-4af6-8bc2-dddd9b5c1e59' } // Technical Spec
  });
  
  if (!doc) {
    console.log('Document not found');
    return;
  }
  
  console.log(`Document: ${doc.title}`);
  console.log(`Content blocks: ${doc.contentRich.content?.length || 0}\n`);
  
  // Show first 10 content blocks
  console.log('First 10 content blocks:\n');
  doc.contentRich.content.slice(0, 10).forEach((block, i) => {
    console.log(`${i + 1}. Type: ${block.type}`);
    if (block.type === 'heading') {
      const text = block.content?.[0]?.text || '';
      console.log(`   Level: ${block.attrs?.level}`);
      console.log(`   Text: ${text}`);
    } else if (block.type === 'paragraph') {
      const text = block.content?.[0]?.text || '';
      console.log(`   Text: ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`);
    } else if (block.type === 'bulletList') {
      console.log(`   Items: ${block.content?.length || 0}`);
      const firstItem = block.content?.[0]?.content?.[0]?.content?.[0]?.text || '';
      console.log(`   First: ${firstItem.substring(0, 60)}...`);
    }
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkContent().catch(console.error);
