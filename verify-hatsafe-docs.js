const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPANY_ID = '740849c1-6f6d-42c8-87ca-de7bb042644f';

async function verify() {
  console.log('Verifying HatSafe documents...\n');
  
  const company = await prisma.company.findUnique({
    where: { id: COMPANY_ID },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1
          }
        }
      }
    }
  });
  
  if (!company) {
    console.log('❌ Company not found!');
    return;
  }
  
  console.log(`Company: ${company.name}`);
  console.log(`Documents found: ${company.documents.length}\n`);
  
  company.documents.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.title}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Type: ${doc.documentType}`);
    console.log(`   Created: ${doc.createdAt}`);
    console.log(`   Content blocks: ${doc.contentRich.content?.length || 0}`);
    console.log(`   Versions: ${doc.versions.length}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

verify().catch(console.error);
