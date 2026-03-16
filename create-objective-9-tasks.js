const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';

const OBJECTIVE_9_STRUCTURE = {
  projects: [
    {
      name: 'Pricing & Conversion Optimization',
      description: 'Optimize pricing page and payment flow to maximize conversion from trial to paid.',
      tasks: [
        {
          title: 'Optimize pricing page design',
          description: 'Ensure pricing page is clear, compelling, and answers objections. Test with target users.',
          priority: 5,
          deadline: '2026-03-30'
        },
        {
          title: 'Add social proof elements',
          description: 'Add testimonials, logos, usage stats to build trust. Use beta customer quotes once available.',
          priority: 4,
          deadline: '2026-04-02'
        },
        {
          title: 'Test payment flow',
          description: 'Walk through entire payment process. Ensure smooth, no friction, clear confirmation. Test with Stripe test mode.',
          priority: 5,
          deadline: '2026-04-03'
        },
        {
          title: 'Implement conversion tracking',
          description: 'Track conversion funnel: landing page → signup → trial → paid. Identify drop-off points.',
          priority: 4,
          deadline: '2026-04-01'
        }
      ]
    },
    {
      name: 'First Customer Acquisition',
      description: 'Convert beta users and early leads into first paying customers.',
      tasks: [
        {
          title: 'Close first 5 paying customers',
          description: 'Convert beta users and warm leads to paid plans. Personal outreach, address objections, offer launch discount.',
          priority: 5,
          deadline: '2026-04-05'
        },
        {
          title: 'Collect testimonials',
          description: 'Request testimonials from first customers. Ask about specific results: time saved, clarity gained, stress reduced.',
          priority: 4,
          deadline: '2026-04-06'
        },
        {
          title: 'Document success stories',
          description: 'Create 2-3 detailed success stories from early customers. Include before/after, specific outcomes, quotes.',
          priority: 4,
          deadline: '2026-04-06'
        },
        {
          title: 'Set up referral program',
          description: 'Create simple referral incentive: refer a customer, get 1 month free. Make it easy to share.',
          priority: 3,
          deadline: '2026-04-06'
        }
      ]
    },
    {
      name: 'Retention & Success',
      description: 'Ensure first customers succeed and stick around, building foundation for growth.',
      tasks: [
        {
          title: 'Schedule customer success check-ins',
          description: 'Book weekly calls with first customers. Help them succeed, gather feedback, build relationships.',
          priority: 5,
          deadline: '2026-04-05'
        },
        {
          title: 'Monitor usage patterns',
          description: 'Track daily active users, feature usage, completion rates. Identify at-risk customers early.',
          priority: 4,
          deadline: '2026-04-05'
        },
        {
          title: 'Build churn prevention process',
          description: 'Create early warning system for churn risk: low usage, support tickets, no logins. Proactive outreach plan.',
          priority: 4,
          deadline: '2026-04-06'
        },
        {
          title: 'Create upsell strategy',
          description: 'Identify when customers are ready to upgrade: team growth, feature needs, usage patterns. Soft upsell approach.',
          priority: 3,
          deadline: '2026-04-06'
        }
      ]
    }
  ]
};

async function main() {
  console.log('🚀 Creating Objective 9 projects and tasks...\n');

  // Find the objective
  const objective = await prisma.objective.findFirst({
    where: {
      workspaceId: WORKSPACE_ID,
      title: '£5,000 MRR from first paying customers'
    }
  });

  if (!objective) {
    console.error('❌ Objective not found!');
    process.exit(1);
  }

  console.log(`✅ Found objective: ${objective.title}`);
  console.log(`   Deadline: ${objective.deadline}\n`);

  // Get inbox status
  const inboxStatus = await prisma.status.findFirst({
    where: {
      workspaceId: WORKSPACE_ID,
      name: 'Inbox'
    }
  });

  let projectCount = 0;
  let taskCount = 0;

  // Create each project
  for (const projectData of OBJECTIVE_9_STRUCTURE.projects) {
    console.log(`\n📁 Creating project: ${projectData.name}`);

    const project = await prisma.project.create({
      data: {
        workspace: { connect: { id: WORKSPACE_ID } },
        objective: { connect: { id: objective.id } },
        name: projectData.name,
        description: projectData.description,
        priority: 3,
        owner: USER_ID
      }
    });

    projectCount++;
    console.log(`   ✅ Project created: ${project.id}`);

    // Create each task for this project
    for (const taskData of projectData.tasks) {
      const task = await prisma.task.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          status: { connect: { id: inboxStatus.id } },
          project: { connect: { id: project.id } },
          objective: { connect: { id: objective.id } },
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          dueAt: taskData.deadline ? new Date(taskData.deadline) : null,
          assigneeId: USER_ID,
          createdBy: USER_ID
        }
      });

      taskCount++;
      console.log(`      ✅ Task created: ${task.title}`);
    }

    console.log(`   📊 Created ${projectData.tasks.length} tasks for ${projectData.name}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 OBJECTIVE 9 COMPLETE!');
  console.log('='.repeat(80));
  console.log(`   • Projects created: ${projectCount}`);
  console.log(`   • Tasks created: ${taskCount}`);
  console.log('='.repeat(80));
}

main()
  .catch((e) => {
    console.error('\n❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
