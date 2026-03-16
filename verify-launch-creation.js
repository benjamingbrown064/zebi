const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';

async function verify() {
  console.log('🔍 Verifying Zebi Launch Projects and Tasks Creation\n');
  console.log('='.repeat(80));

  // Get the 9 launch objectives (by deadline <= April 6)
  const launchObjectives = await prisma.objective.findMany({
    where: {
      workspaceId: WORKSPACE_ID,
      deadline: {
        lte: new Date('2026-04-06')
      },
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
      },
      tasks: true
    },
    orderBy: {
      deadline: 'asc'
    }
  });

  console.log(`\n📋 Launch Objectives Found: ${launchObjectives.length}\n`);

  let totalProjects = 0;
  let totalTasks = 0;

  for (const objective of launchObjectives) {
    const projectCount = objective.projects.length;
    const taskCount = objective.tasks.length;
    
    totalProjects += projectCount;
    totalTasks += taskCount;

    console.log(`\n✅ ${objective.title}`);
    console.log(`   Deadline: ${objective.deadline.toLocaleDateString()}`);
    console.log(`   Projects: ${projectCount}`);
    console.log(`   Tasks: ${taskCount}`);

    if (projectCount > 0) {
      console.log(`   Project breakdown:`);
      for (const project of objective.projects) {
        const projectTaskCount = project.tasks.length;
        console.log(`      • ${project.name}: ${projectTaskCount} tasks`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 TOTALS:');
  console.log('='.repeat(80));
  console.log(`   • Objectives: ${launchObjectives.length}`);
  console.log(`   • Projects: ${totalProjects}`);
  console.log(`   • Tasks: ${totalTasks}`);
  console.log(`   • Average tasks per project: ${(totalTasks / totalProjects).toFixed(2)}`);
  console.log('='.repeat(80));

  // Verify all tasks are in Inbox
  const inboxStatus = await prisma.status.findFirst({
    where: {
      workspaceId: WORKSPACE_ID,
      name: 'Inbox'
    }
  });

  const inboxTaskCount = await prisma.task.count({
    where: {
      workspaceId: WORKSPACE_ID,
      statusId: inboxStatus.id,
      objectiveId: {
        in: launchObjectives.map(o => o.id)
      }
    }
  });

  console.log(`\n✅ Tasks in Inbox status: ${inboxTaskCount} / ${totalTasks}`);

  // Verify all tasks are assigned to Ben
  const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';
  const assignedTaskCount = await prisma.task.count({
    where: {
      workspaceId: WORKSPACE_ID,
      assigneeId: USER_ID,
      objectiveId: {
        in: launchObjectives.map(o => o.id)
      }
    }
  });

  console.log(`✅ Tasks assigned to Ben: ${assignedTaskCount} / ${totalTasks}`);

  // Check for tasks with due dates
  const tasksWithDueDates = await prisma.task.count({
    where: {
      workspaceId: WORKSPACE_ID,
      dueAt: {
        not: null
      },
      objectiveId: {
        in: launchObjectives.map(o => o.id)
      }
    }
  });

  console.log(`✅ Tasks with due dates: ${tasksWithDueDates} / ${totalTasks}`);

  console.log('\n✨ VERIFICATION COMPLETE!\n');
}

verify()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
