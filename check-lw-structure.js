const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPANY_ID = 'a50c15be-afec-49fa-81d3-0bb34570b74b';

async function checkStructure() {
  // Get company
  const company = await prisma.company.findUnique({
    where: { id: COMPANY_ID }
  });
  
  console.log('Company:', company);
  
  // Get objectives
  const objectives = await prisma.objective.findMany({
    where: {
      companyId: COMPANY_ID
    },
    include: {
      _count: {
        select: {
          projects: true
        }
      }
    }
  });
  
  console.log(`\n Found ${objectives.length} objectives:`);
  objectives.forEach(obj => {
    console.log(`- ${obj.name || obj.title || 'NO NAME'} (ID: ${obj.id}, Projects: ${obj._count.projects})`);
  });
  
  // Get projects
  const projects = await prisma.project.findMany({
    where: {
      objective: {
        companyId: COMPANY_ID
      }
    },
    include: {
      _count: {
        select: {
          tasks: true
        }
      }
    }
  });
  
  console.log(`\nFound ${projects.length} projects total`);
  if (projects.length > 0) {
    console.log('Sample projects:');
    projects.slice(0, 5).forEach(proj => {
      console.log(`- ${proj.name || proj.title || 'NO NAME'} (Tasks: ${proj._count.tasks})`);
    });
  }
  
  // Get total tasks
  const tasks = await prisma.task.findMany({
    where: {
      project: {
        objective: {
          companyId: COMPANY_ID
        }
      }
    },
    take: 5
  });
  
  console.log(`\nSample tasks (first 5):`);
  tasks.forEach(task => {
    console.log(`- ${task.title || task.name || 'NO NAME'}`);
    console.log(`  Assigned to: ${task.assignedTo || 'NONE'}`);
    console.log(`  Status: ${task.status}`);
  });
  
  await prisma.$disconnect();
}

checkStructure().catch(console.error);
