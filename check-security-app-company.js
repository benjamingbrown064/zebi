// Check Security App company data
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const companyId = '124804c1-0703-48ec-811b-754d80769e64';
    
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        objectives: true,
        projects: true,
        documents: true,
        memories: true,
        insights: true,
      }
    });

    if (company) {
      console.log('Security App Company Found:');
      console.log(JSON.stringify(company, null, 2));
    } else {
      console.log('Company not found. Checking all companies in workspace...');
      
      const companies = await prisma.company.findMany({
        where: {
          workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
        }
      });
      
      console.log('\nAll companies in workspace:');
      console.log(JSON.stringify(companies, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
