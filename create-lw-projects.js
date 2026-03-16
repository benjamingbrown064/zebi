const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';
const COMPANY_ID = 'a50c15be-afec-49fa-81d3-0bb34570b74b'; // Love Warranty
const OBJECTIVE_1_ID = '3d08e84c-b5a6-4cdd-b772-98e245049d8f'; // Launch (July)
const OBJECTIVE_2_ID = '1b650a18-602a-4ec5-be7b-40e358a48f13'; // Scale (Oct)
const STATUS_PLANNED = '30c11082-336b-4f19-9868-89764bc945bc';

const projects = [
  {
    name: 'Legal & Entity Setup',
    objectiveId: OBJECTIVE_1_ID,
    description: 'Delaware entity formation, California qualification, insurance, tax registration',
    priority: 5,
    tasks: [
      { title: 'Form Delaware LLC (Love Warranty Inc)', dueDate: '2026-03-31', priority: 5 },
      { title: 'California foreign qualification filing', dueDate: '2026-04-15', priority: 5 },
      { title: 'Research insurance/bonding requirements (California)', dueDate: '2026-04-10', priority: 5 },
      { title: 'Obtain required business insurance', dueDate: '2026-05-15', priority: 5 },
      { title: 'Federal EIN registration', dueDate: '2026-04-05', priority: 5 },
      { title: 'California tax registration (sales tax, payroll)', dueDate: '2026-04-20', priority: 4 },
      { title: 'Open US business bank account', dueDate: '2026-05-01', priority: 5 },
    ]
  },
  {
    name: 'Dealer Partnership Program',
    objectiveId: OBJECTIVE_1_ID,
    description: 'Target California dealers, create pitch materials, pilot partnerships',
    priority: 5,
    tasks: [
      { title: 'Identify 10-15 target dealers in California (specialist/performance)', dueDate: '2026-04-15', priority: 4 },
      { title: 'Create US dealer pitch deck', dueDate: '2026-04-30', priority: 5 },
      { title: 'Draft US partnership agreement template', dueDate: '2026-05-10', priority: 4 },
      { title: 'Create dealer onboarding materials', dueDate: '2026-05-20', priority: 4 },
      { title: 'Initial outreach to top 5 target dealers', dueDate: '2026-05-31', priority: 5 },
      { title: 'Close first pilot dealer partnership', dueDate: '2026-06-30', priority: 5 },
      { title: 'Close 2nd and 3rd pilot partnerships', dueDate: '2026-07-31', priority: 4 },
    ]
  },
  {
    name: 'Platform Productization',
    objectiveId: OBJECTIVE_1_ID,
    description: 'Multi-tenant architecture, white-label capabilities, client dashboards',
    priority: 5,
    tasks: [
      { title: 'Design multi-tenant architecture (database schema)', dueDate: '2026-04-15', priority: 5 },
      { title: 'Build white-label configuration system', dueDate: '2026-05-15', priority: 5 },
      { title: 'Create admin dashboard for platform clients', dueDate: '2026-05-31', priority: 5 },
      { title: 'Build configurable warranty rules engine', dueDate: '2026-06-15', priority: 5 },
      { title: 'Build per-client reporting + analytics', dueDate: '2026-06-30', priority: 4 },
      { title: 'Platform demo environment setup', dueDate: '2026-07-10', priority: 4 },
      { title: 'QA + security review', dueDate: '2026-07-25', priority: 5 },
    ]
  },
  {
    name: 'B2B Platform Sales & Licensing',
    objectiveId: OBJECTIVE_1_ID,
    description: 'Target automotive + non-automotive warranty providers, licensing model, sales materials',
    priority: 4,
    tasks: [
      { title: 'Define target customer profiles (automotive + non-auto sectors)', dueDate: '2026-05-01', priority: 4 },
      { title: 'Create platform licensing model + pricing tiers', dueDate: '2026-05-15', priority: 5 },
      { title: 'Build sales deck + demo script', dueDate: '2026-05-31', priority: 4 },
      { title: 'Create case study materials (UK operations)', dueDate: '2026-06-10', priority: 3 },
      { title: 'Write platform onboarding documentation', dueDate: '2026-06-20', priority: 4 },
      { title: 'Identify 20 target platform prospects', dueDate: '2026-06-30', priority: 4 },
      { title: 'Initial outreach to first 10 prospects', dueDate: '2026-07-31', priority: 4 },
    ]
  },
  {
    name: 'Operations Infrastructure',
    objectiveId: OBJECTIVE_1_ID,
    description: 'US claims process, garage network, payment processing, support',
    priority: 4,
    tasks: [
      { title: 'Research California warranty regulations', dueDate: '2026-05-01', priority: 5 },
      { title: 'Design US claims handling process', dueDate: '2026-05-20', priority: 5 },
      { title: 'Identify 10-15 California garage/service partners', dueDate: '2026-06-10', priority: 4 },
      { title: 'Set up US payment processing (Stripe)', dueDate: '2026-05-31', priority: 5 },
      { title: 'Configure Zendesk for US support (timezone coverage)', dueDate: '2026-06-20', priority: 4 },
      { title: 'Build US warranty registration flow', dueDate: '2026-06-30', priority: 4 },
      { title: 'Train team on US-specific processes', dueDate: '2026-07-20', priority: 3 },
    ]
  },
  {
    name: 'Personal Relocation',
    objectiveId: OBJECTIVE_1_ID,
    description: 'Housing, family move, visa finalization, local networking',
    priority: 5,
    tasks: [
      { title: 'Finalize L1A visa approval', dueDate: '2026-06-15', priority: 5 },
      { title: 'Secure housing in Laguna Beach area', dueDate: '2026-06-30', priority: 5 },
      { title: 'Arrange school enrollment for Rupert', dueDate: '2026-07-10', priority: 5 },
      { title: 'Plan family move logistics', dueDate: '2026-07-15', priority: 4 },
      { title: 'Execute move to California', dueDate: '2026-07-31', priority: 5 },
      { title: 'Initial local business networking (3-5 meetings)', dueDate: '2026-08-15', priority: 3 },
    ]
  },
  {
    name: 'Platform Client Expansion',
    objectiveId: OBJECTIVE_2_ID,
    description: 'Outreach to automotive + non-automotive warranty providers, case studies',
    priority: 4,
    tasks: [
      { title: 'Create case study from first 3 platform clients', dueDate: '2026-08-31', priority: 4 },
      { title: 'Outreach to 10 automotive warranty providers', dueDate: '2026-09-15', priority: 4 },
      { title: 'Outreach to 10 non-automotive sectors (appliances, electronics, construction)', dueDate: '2026-09-30', priority: 4 },
      { title: 'Close 2 additional platform clients', dueDate: '2026-10-15', priority: 5 },
      { title: 'Design referral/partner program', dueDate: '2026-09-10', priority: 3 },
      { title: 'Launch partner referral program', dueDate: '2026-10-31', priority: 3 },
    ]
  },
  {
    name: 'Dealer Network Expansion',
    objectiveId: OBJECTIVE_2_ID,
    description: 'Additional California dealers, geographic expansion, referral program',
    priority: 3,
    tasks: [
      { title: 'Identify 10 additional California dealers', dueDate: '2026-08-15', priority: 3 },
      { title: 'Outreach to LA/San Diego/Bay Area dealers', dueDate: '2026-09-15', priority: 3 },
      { title: 'Close 3-5 additional dealer partnerships', dueDate: '2026-10-31', priority: 4 },
      { title: 'Launch dealer referral incentive program', dueDate: '2026-09-30', priority: 3 },
    ]
  },
  {
    name: 'Platform Feature Development',
    objectiveId: OBJECTIVE_2_ID,
    description: 'Claims Scanner integration, API access, analytics, fraud detection',
    priority: 4,
    tasks: [
      { title: 'Integrate Claims Scanner for all platform clients', dueDate: '2026-08-31', priority: 5 },
      { title: 'Build REST API for platform integrations', dueDate: '2026-09-15', priority: 4 },
      { title: 'Build advanced analytics dashboard', dueDate: '2026-09-30', priority: 4 },
      { title: 'Implement fraud detection rules engine', dueDate: '2026-10-15', priority: 4 },
      { title: 'Design mobile app support (iOS/Android)', dueDate: '2026-10-31', priority: 3 },
    ]
  }
];

async function main() {
  console.log('Creating Love Warranty US projects + tasks...\n');

  for (const proj of projects) {
    // Create project
    const project = await prisma.project.create({
      data: {
        workspaceId: WORKSPACE_ID,
        companyId: COMPANY_ID,
        objectiveId: proj.objectiveId,
        name: proj.name,
        description: proj.description,
        priority: proj.priority,
      }
    });

    console.log(`✅ Created project: ${project.name}`);

    // Create tasks for project
    for (const task of proj.tasks) {
      await prisma.task.create({
        data: {
          workspaceId: WORKSPACE_ID,
          companyId: COMPANY_ID,
          objectiveId: proj.objectiveId,
          projectId: project.id,
          title: task.title,
          statusId: STATUS_PLANNED,
          priority: task.priority,
          dueAt: new Date(task.dueDate),
          createdBy: USER_ID,
        }
      });
    }

    console.log(`   → Created ${proj.tasks.length} tasks\n`);
  }

  console.log(`\n✨ Success! Created ${projects.length} projects with tasks`);
  
  const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0);
  console.log(`\nTotal breakdown:`);
  console.log(`  Projects: ${projects.length}`);
  console.log(`  Tasks: ${totalTasks}`);
  console.log(`\nObjective 1 (Launch by July): 6 projects`);
  console.log(`Objective 2 (Scale by Oct): 3 projects`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
