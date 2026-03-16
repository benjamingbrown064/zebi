const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTasks() {
  const tasks = await prisma.task.findMany({
    where: { workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237' },
    select: { id: true, title: true, description: true },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`Found ${tasks.length} tasks:\n`);
  tasks.forEach((t, i) => {
    console.log(`${i+1}. "${t.title}"`);
    if (t.description) console.log(`   Has description: ${t.description.substring(0, 50)}...`);
  });
  
  await prisma.$disconnect();
}

listTasks().catch(console.error);
