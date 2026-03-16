const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres'
    }
  }
});

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';

// Company IDs from earlier API call
const COMPANIES = {
  loveWarranty: 'a50c15be-afec-49fa-81d3-0bb34570b74b',
  dgs: '8aead663-013c-4212-826e-60eb96684073',
  taskbox: 'f6f20df3-12f9-4b31-89ea-feb54f520fdd',
  dealerEngine: '317f1b77-4bd6-4ea7-a353-7b8bec6ae7d6',
  clarityOS: '81272402-fab7-4879-b066-c64dfdaee61e',
  theDMS: '5bee868c-fc1c-435c-aecb-057a49856fe5',
  hatSafe: '740849c1-6f6d-42c8-87ca-de7bb042644f',
  securityApp: '124804c1-0703-48ec-811b-754d80769e64'
};

async function main() {
  console.log('Creating revenue goal structure...\n');

  // 1. Create main Goal
  const goal = await prisma.goal.create({
    data: {
      workspaceId: WORKSPACE_ID,
      createdBy: USER_ID,
      name: 'Hit £100k Monthly Personal Revenue',
      metricType: 'revenue',
      targetValue: 100000,
      currentValue: 21500, // Current baseline
      unit: 'GBP/month',
      startDate: new Date('2026-03-06'),
      endDate: new Date('2026-12-31'),
      status: 'active',
      descriptionRich: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Grow from £21.5k/month baseline to £100k/month by December 2026.' }
            ]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Current: Love Warranty £12.5k + DGS £9k = £21.5k/month' }
            ]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Gap to close: £78.5k/month through product launches, US expansion, and strategic sales.' }
            ]
          }
        ]
      }
    }
  });

  console.log(`✅ Goal created: ${goal.name} (ID: ${goal.id})\n`);

  // 2. Create Tier 1 Objectives (Locked Revenue - by July: +£12.5k)
  const tier1Objectives = [
    {
      title: 'Security App: £2.5k/month',
      companyId: COMPANIES.securityApp,
      targetValue: 2500,
      deadline: '2026-03-31',
      description: 'Client lined up, delivery by end of March. First consulting engagement.',
      priority: 5
    },
    {
      title: 'Love Warranty US Launch: +£5k/month',
      companyId: COMPANIES.loveWarranty,
      targetValue: 5000,
      deadline: '2026-07-31',
      description: 'L1A visa approved, California setup, dealer partnerships. Takes personal income from £12.5k → £17.5k/month.',
      priority: 5
    },
    {
      title: 'Claims Scanner Rental: £5k/month',
      companyId: COMPANIES.loveWarranty,
      targetValue: 5000,
      deadline: '2026-07-31',
      description: 'Rent Claims Scanner to competitor dealers. Needs pitch deck and competitor outreach.',
      priority: 4
    }
  ];

  // 3. Create Tier 2 Objectives (Launch Products - by Sept: +£27.5k)
  const tier2Objectives = [
    {
      title: 'HatSafe: £10k/month',
      companyId: COMPANIES.hatSafe,
      targetValue: 10000,
      deadline: '2026-09-30',
      description: 'Certificate management SaaS. Needs iOS app (7-10 days build), then launch + sales.',
      priority: 4
    },
    {
      title: 'Dealer Engine: £7.5k/month',
      companyId: COMPANIES.dealerEngine,
      targetValue: 7500,
      deadline: '2026-09-30',
      description: 'Dealership intelligence platform. 30 dealers @ £250/month. Needs lead gen system + sales process.',
      priority: 4
    },
    {
      title: 'Taskbox GTM Push: £10k/month',
      companyId: COMPANIES.taskbox,
      targetValue: 10000,
      deadline: '2026-09-30',
      description: '50 users @ £200/month. Needs GTM strategy + sales process. Product ready, bottleneck is lead gen.',
      priority: 4
    }
  ];

  // 4. Create Tier 3 Objectives (Scale & Heavy Lifts - by Dec: +£38.5k)
  const tier3Objectives = [
    {
      title: 'Love Warranty US Scale: +£5k more (£22.5k total)',
      companyId: COMPANIES.loveWarranty,
      targetValue: 5000,
      deadline: '2026-10-31',
      description: 'Scale from £17.5k → £22.5k/month. California dealer growth + operational efficiency.',
      priority: 3
    },
    {
      title: 'Security App Scale: +£7.5k (£10k total)',
      companyId: COMPANIES.securityApp,
      targetValue: 7500,
      deadline: '2026-12-31',
      description: 'Progress from £2.5k → £10k/month through Q3-Q4. Additional consulting clients.',
      priority: 3
    },
    {
      title: 'The DMS Launch: £5k/month',
      companyId: COMPANIES.theDMS,
      targetValue: 5000,
      deadline: '2026-12-31',
      description: 'Dealer management SaaS. 14-day build + lead gen + sales. 20 dealers @ £250/month.',
      priority: 3
    },
    {
      title: 'Clarity OS Launch: £7.5k/month',
      companyId: COMPANIES.clarityOS,
      targetValue: 7500,
      deadline: '2026-12-31',
      description: 'Accounting intelligence platform. 14-day build + lead gen + sales. 50 businesses @ £150/month.',
      priority: 3
    },
    {
      title: 'Claims Scanner Scale: +£5k (£10k total)',
      companyId: COMPANIES.loveWarranty,
      targetValue: 5000,
      deadline: '2026-12-31',
      description: 'Scale competitor rentals from £5k → £10k/month. 10+ dealer clients.',
      priority: 3
    }
  ];

  // Create all objectives
  const allObjectives = [...tier1Objectives, ...tier2Objectives, ...tier3Objectives];
  
  for (const obj of allObjectives) {
    const objective = await prisma.objective.create({
      data: {
        workspaceId: WORKSPACE_ID,
        companyId: obj.companyId,
        goalId: goal.id,
        title: obj.title,
        description: obj.description,
        objectiveType: 'revenue',
        metricType: 'revenue',
        targetValue: obj.targetValue,
        currentValue: 0,
        unit: 'GBP/month',
        startDate: new Date('2026-03-06'),
        deadline: new Date(obj.deadline),
        status: 'active',
        priority: obj.priority,
        createdBy: USER_ID
      }
    });
    
    console.log(`✅ Created: ${objective.title}`);
  }

  console.log(`\n✨ Success! Created 1 goal + ${allObjectives.length} objectives`);
  console.log(`\nRevenue breakdown:`);
  console.log(`  Tier 1 (Locked, by July):    +£12.5k/month`);
  console.log(`  Tier 2 (Launch, by Sept):    +£27.5k/month`);
  console.log(`  Tier 3 (Scale, by Dec):      +£38.5k/month`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Total new revenue:           +£78.5k/month`);
  console.log(`  Current baseline:             £21.5k/month`);
  console.log(`  Target by Dec 2026:          £100k/month ✓`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
