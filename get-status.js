const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';

async function main() {
  const statuses = await prisma.status.findMany({
    where: { workspaceId: WORKSPACE_ID }
  });
  
  console.log('Task Statuses:');
  statuses.forEach(s => console.log(`  ${s.name}: ${s.id}`));
  
  await prisma.$disconnect();
}

main();
