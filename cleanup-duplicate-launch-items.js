const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';

async function cleanup() {
  console.log('🧹 Cleaning up duplicate launch projects and tasks...\n');

  // Get all launch objectives
  const launchObjectives = await prisma.objective.findMany({
    where: {
      workspaceId: WORKSPACE_ID,
      title: {
        in: [
          'Brand positioned for overwhelmed business owners',
          'Landing page converting visitors to early access signups',
          'Sales materials ready to close first customers',
          'Product stable with zero critical bugs',
          'Customer onboarding enables self-service success',
          'Product ready for first paying customers',
          '100 qualified leads engaged and interested',
          '10 beta customers actively using product daily',
          '£5,000 MRR from first paying customers'
        ]
      }
    }
  });

  console.log(`Found ${launchObjectives.length} launch objectives\n`);

  let deletedProjects = 0;
  let deletedTasks = 0;

  // For each objective, find duplicate projects
  for (const objective of launchObjectives) {
    console.log(`\n📌 Processing: ${objective.title}`);

    // Get all projects for this objective
    const projects = await prisma.project.findMany({
      where: {
        objectiveId: objective.id
      },
      orderBy: {
        createdAt: 'desc' // Most recent first
      }
    });

    // Group projects by name
    const projectsByName = {};
    for (const project of projects) {
      if (!projectsByName[project.name]) {
        projectsByName[project.name] = [];
      }
      projectsByName[project.name].push(project);
    }

    // For each project name, keep only the most recent one
    for (const [name, projectList] of Object.entries(projectsByName)) {
      if (projectList.length > 1) {
        console.log(`   Found ${projectList.length} duplicates of "${name}"`);
        
        // Keep the first one (most recent), delete the rest
        const toKeep = projectList[0];
        const toDelete = projectList.slice(1);

        for (const project of toDelete) {
          // Delete all tasks for this project
          const taskDeleteResult = await prisma.task.deleteMany({
            where: {
              projectId: project.id
            }
          });
          deletedTasks += taskDeleteResult.count;

          // Delete the project
          await prisma.project.delete({
            where: {
              id: project.id
            }
          });
          deletedProjects++;

          console.log(`      ❌ Deleted duplicate project and ${taskDeleteResult.count} tasks`);
        }

        console.log(`      ✅ Kept most recent version (created ${toKeep.createdAt.toISOString()})`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 CLEANUP COMPLETE!');
  console.log('='.repeat(80));
  console.log(`   • Deleted projects: ${deletedProjects}`);
  console.log(`   • Deleted tasks: ${deletedTasks}`);
  console.log('='.repeat(80));

  console.log('\n📊 Running verification...\n');

  // Re-run verification
  const finalObjectives = await prisma.objective.findMany({
    where: {
      workspaceId: WORKSPACE_ID,
      title: {
        in: [
          'Brand positioned for overwhelmed business owners',
          'Landing page converting visitors to early access signups',
          'Sales materials ready to close first customers',
          'Product stable with zero critical bugs',
          'Customer onboarding enables self-service success',
          'Product ready for first paying customers',
          '100 qualified leads engaged and interested',
          '10 beta customers actively using product daily',
          '£5,000 MRR from first paying customers'
        ]
      }
    },
    include: {
      projects: {
        include: {
          tasks: true
        }
      }
    },
    orderBy: {
      deadline: 'asc'
    }
  });

  let totalProjects = 0;
  let totalTasks = 0;

  for (const objective of finalObjectives) {
    totalProjects += objective.projects.length;
    totalTasks += objective.projects.reduce((sum, p) => sum + p.tasks.length, 0);

    console.log(`✅ ${objective.title}: ${objective.projects.length} projects, ${objective.projects.reduce((sum, p) => sum + p.tasks.length, 0)} tasks`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('FINAL TOTALS:');
  console.log('='.repeat(80));
  console.log(`   • Objectives: ${finalObjectives.length}`);
  console.log(`   • Projects: ${totalProjects}`);
  console.log(`   • Tasks: ${totalTasks}`);
  console.log('='.repeat(80));
}

cleanup()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
