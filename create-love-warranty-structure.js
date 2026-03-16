#!/usr/bin/env node

/**
 * Create comprehensive Love Warranty project structure in Zebi
 * 
 * Hierarchy:
 * - 3 Goals
 * - 10 Objectives (one per workstream)
 * - Projects per Objective (organized by phase)
 * - Tasks per Project (with dependencies, success criteria, KPIs)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'; // Ben's user ID

// Start date for planning (March 15, 2026)
const START_DATE = new Date('2026-03-15');

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function getOrCreateCompany() {
  console.log('\n📋 Getting Love Warranty company...');
  
  // Look for Love Warranty company
  let company = await prisma.company.findFirst({
    where: {
      workspaceId: WORKSPACE_ID,
      name: 'Love Warranty',
    },
  });
  
  if (!company) {
    console.log('Creating Love Warranty company...');
    company = await prisma.company.create({
      data: {
        workspaceId: WORKSPACE_ID,
        name: 'Love Warranty',
        description: 'Extended warranty provider for automotive dealers',
      },
    });
  }
  
  console.log(`✅ Love Warranty company ID: ${company.id}`);
  return company.id;
}

async function createGoals(companyId) {
  console.log('\n🎯 Creating 3 Goals...');
  
  const goalData = [
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      title: 'Double revenue to £60k/month with improved control and margins',
      description: 'Grow Love Warranty from £30k to £60k monthly revenue while improving operational control, claim margins, and business fundamentals. Focus on sustainable growth with better systems.',
      metricType: 'currency',
      targetValue: 60000,
      currentValue: 30000,
      unit: 'GBP',
      deadline: addDays(START_DATE, 365), // 12 months
      priority: 5,
      status: 'active',
    },
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      title: 'Achieve operational excellence: Claims, Support, Onboarding',
      description: 'Systemize and optimize core operations across claims processing, customer support, and dealer onboarding. Establish SLAs, consistent processes, and measurable KPIs for operational excellence.',
      metricType: 'percentage',
      targetValue: 100,
      currentValue: 0,
      unit: '%',
      deadline: addDays(START_DATE, 180), // 6 months
      priority: 5,
      status: 'active',
    },
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      title: 'Commercial growth: 50+ dealers, strong upsell, high retention',
      description: 'Scale dealer base to 50+ active partners, improve upsell rates through better reporting and intelligence, and achieve >90% retention through exceptional dealer success.',
      metricType: 'count',
      targetValue: 50,
      currentValue: 35,
      unit: 'dealers',
      deadline: addDays(START_DATE, 180), // 6 months
      priority: 5,
      status: 'active',
    },
  ];
  
  const goals = [];
  for (const goal of goalData) {
    const created = await prisma.goal.create({ data: goal });
    goals.push(created);
    console.log(`✅ Created: ${goal.title}`);
  }
  
  return goals;
}

async function createObjectives(companyId, goals) {
  console.log('\n🎯 Creating 10 Objectives (one per workstream)...');
  
  const objectiveData = [
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      goalId: goals[1].id, // Operational excellence
      title: 'A. Claims and Customer Operations - Systemize processes',
      description: 'Define and implement systematic claims processing with clear approval frameworks, SLAs, and KPIs. Build claims system and train staff on new processes. TARGET: 95% within SLA, <3 day decision time, <5% reopen rate.',
      objectiveType: 'operations',
      metricType: 'percentage',
      targetValue: 100,
      currentValue: 0,
      unit: '%',
      startDate: START_DATE,
      deadline: addDays(START_DATE, 60),
      priority: 5,
      status: 'active',
      checkFrequency: 'weekly',
    },
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      goalId: goals[1].id,
      title: 'Customer Support - Establish SLAs and consistency',
      description: 'Create customer support framework with defined SLAs, response templates, and escalation procedures. Ensure consistent, high-quality support across all dealer and customer interactions.',
      objectiveType: 'operations',
      metricType: 'percentage',
      targetValue: 100,
      currentValue: 0,
      unit: '%',
      startDate: START_DATE,
      deadline: addDays(START_DATE, 60),
      priority: 4,
      status: 'active',
      checkFrequency: 'weekly',
    },
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      goalId: goals[1].id,
      title: 'Product and Software - Build core infrastructure',
      description: 'Strict sequencing: Product Engine → CRM → Claims System → Reporting → Everything else. Build foundational tech infrastructure to support all operations. Tech owner required for all builds.',
      objectiveType: 'product',
      metricType: 'percentage',
      targetValue: 100,
      currentValue: 0,
      unit: '%',
      startDate: START_DATE,
      deadline: addDays(START_DATE, 75),
      priority: 5,
      status: 'active',
      checkFrequency: 'weekly',
    },
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      goalId: goals[2].id, // Commercial growth
      title: 'Dealer Reporting and Intelligence - Enable visibility',
      description: 'Build comprehensive reporting system to give dealers full visibility into their warranty performance. 90% adoption, 100% accuracy, >80% dealer satisfaction. Enable data-driven upsell.',
      objectiveType: 'product',
      metricType: 'percentage',
      targetValue: 90,
      currentValue: 0,
      unit: '%',
      startDate: START_DATE,
      deadline: addDays(START_DATE, 90),
      priority: 5,
      status: 'active',
      checkFrequency: 'weekly',
    },
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      goalId: goals[2].id,
      title: 'Sales and Dealer Acquisition - Structured growth',
      description: 'Implement structured sales process with qualification framework, professional materials, and scalable systems. Target: New dealers per month, high deal quality scores.',
      objectiveType: 'sales',
      metricType: 'count',
      targetValue: 15,
      currentValue: 0,
      unit: 'dealers',
      startDate: START_DATE,
      deadline: addDays(START_DATE, 180),
      priority: 4,
      status: 'active',
      checkFrequency: 'weekly',
    },
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      goalId: goals[2].id,
      title: 'Onboarding and Dealer Success - Standardized processes',
      description: 'Create systematic onboarding process ensuring every dealer succeeds in first 30 days. KPI: 100% complete within 14 days, >95% first-30-day targets met.',
      objectiveType: 'operations',
      metricType: 'percentage',
      targetValue: 100,
      currentValue: 0,
      unit: '%',
      startDate: START_DATE,
      deadline: addDays(START_DATE, 60),
      priority: 5,
      status: 'active',
      checkFrequency: 'weekly',
    },
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      goalId: goals[2].id,
      title: 'Marketing and Brand - Unified messaging',
      description: 'Develop clear brand positioning, professional marketing materials, and modern web presence. Drive lead generation and support sales efforts.',
      objectiveType: 'marketing',
      metricType: 'percentage',
      targetValue: 100,
      currentValue: 0,
      unit: '%',
      startDate: START_DATE,
      deadline: addDays(START_DATE, 75),
      priority: 4,
      status: 'active',
      checkFrequency: 'weekly',
    },
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      goalId: goals[1].id,
      title: 'Business Management and Governance - Clear ownership',
      description: 'Define team structure, assign workstream owners, establish management rhythms. KPI: 100% projects have owner, decisions made quickly.',
      objectiveType: 'operations',
      metricType: 'percentage',
      targetValue: 100,
      currentValue: 0,
      unit: '%',
      startDate: START_DATE,
      deadline: addDays(START_DATE, 14),
      priority: 5,
      status: 'active',
      checkFrequency: 'daily',
    },
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      goalId: goals[2].id,
      title: 'Partnerships - Enable growth through partners',
      description: 'Develop partnership strategy and infrastructure to enable growth through complementary partners (software, finance, automotive).',
      objectiveType: 'partnerships',
      metricType: 'count',
      targetValue: 5,
      currentValue: 0,
      unit: 'partners',
      startDate: START_DATE,
      deadline: addDays(START_DATE, 180),
      priority: 3,
      status: 'planning',
      checkFrequency: 'monthly',
    },
    {
      workspaceId: WORKSPACE_ID,
      companyId: companyId,
      userId: USER_ID,
      goalId: goals[0].id, // Revenue growth
      title: 'US Expansion - Parallel strategic track',
      description: 'Explore and plan US market entry strategy. Research, partnerships, regulatory requirements, go-to-market approach. Parallel workstream to UK operations.',
      objectiveType: 'expansion',
      metricType: 'percentage',
      targetValue: 100,
      currentValue: 0,
      unit: '%',
      startDate: START_DATE,
      deadline: addDays(START_DATE, 180),
      priority: 3,
      status: 'planning',
      checkFrequency: 'monthly',
    },
  ];
  
  const objectives = [];
  for (const obj of objectiveData) {
    const created = await prisma.objective.create({ data: obj });
    objectives.push(created);
    console.log(`✅ Created: ${obj.title}`);
  }
  
  return objectives;
}

async function createProjectsAndTasks(objectives, companyId) {
  console.log('\n📁 Creating Projects and Tasks...');
  
  let totalProjects = 0;
  let totalTasks = 0;
  
  // Helper to create project with tasks
  async function createProject(objectiveId, projectData) {
    const project = await prisma.project.create({
      data: {
        workspaceId: WORKSPACE_ID,
        companyId: companyId,
        userId: USER_ID,
        objectiveId: objectiveId,
        name: projectData.name,
        description: projectData.description,
        deadline: projectData.deadline,
        status: 'active',
        priority: projectData.priority || 4,
      },
    });
    
    totalProjects++;
    console.log(`  ✅ Project: ${project.name}`);
    
    // Create tasks
    for (const taskData of projectData.tasks) {
      const task = await prisma.task.create({
        data: {
          workspaceId: WORKSPACE_ID,
          companyId: companyId,
          userId: USER_ID,
          projectId: project.id,
          objectiveId: objectiveId,
          title: taskData.title,
          description: taskData.description,
          deadline: taskData.deadline,
          priority: taskData.priority || 4,
          status: 'todo',
        },
      });
      
      totalTasks++;
      console.log(`    📝 Task: ${task.title}`);
    }
  }
  
  // OBJ 1: Claims Operations
  console.log('--- Claims Operations ---');
  await createProject(objectives[0].id, {
    name: 'Phase 1: Claims Process Definition',
    description: 'Define comprehensive claims framework including approval/rejection criteria, workflow, SLAs, and KPIs',
    deadline: addDays(START_DATE, 7),
    priority: 5,
    tasks: [
      {
        title: 'Define approval/rejection framework (document)',
        description: 'Create comprehensive document outlining clear criteria for claim approval vs rejection. Include examples, edge cases, escalation paths.\n\n**Success Criteria:** Document approved by leadership, covers 90%+ of claim scenarios, includes clear decision tree\n\n**Dependencies:** None\n\n**KPIs:** Decision consistency, Claim approval rate\n\n**Effort:** 16 hours',
        deadline: addDays(START_DATE, 3),
        priority: 5,
      },
      {
        title: 'Define claims workflow (document)',
        description: 'Map out end-to-end claims process from submission to resolution. Include all touchpoints, systems, handoffs.\n\n**Success Criteria:** Complete process map with swim lanes, timing, roles/responsibilities documented\n\n**Dependencies:** Define approval/rejection framework\n\n**KPIs:** Process efficiency, Time to resolution\n\n**Effort:** 12 hours',
        deadline: addDays(START_DATE, 5),
        priority: 5,
      },
      {
        title: 'Define SLAs and KPIs (document)',
        description: 'Establish measurable SLAs for claim processing and KPIs for monitoring performance\n\n**Success Criteria:** SLAs: <3 day decision time, 95% within SLA, <5% reopen rate. KPIs documented and measurable.\n\n**Dependencies:** Define claims workflow\n\n**KPIs:** Decision time, SLA compliance, Reopen rate\n\n**Effort:** 8 hours',
        deadline: addDays(START_DATE, 7),
        priority: 5,
      },
    ],
  });
  
  await createProject(objectives[0].id, {
    name: 'Phase 2: Claims System Build and Training',
    description: 'Build claims system and train staff on new systematic processes',
    deadline: addDays(START_DATE, 50),
    priority: 5,
    tasks: [
      {
        title: 'Build claims system',
        description: 'Develop digital claims management system implementing approved workflow and decision framework\n\n**Success Criteria:** System deployed, handles full claim lifecycle, integrated with CRM, reporting functional\n\n**Dependencies:** CRM system build (from Product workstream)\n\n**KPIs:** System uptime, Processing accuracy\n\n**Effort:** 120 hours',
        deadline: addDays(START_DATE, 35),
        priority: 5,
      },
      {
        title: 'Staff training on new process',
        description: 'Train all claims staff on new framework, system, and expectations. Create training materials.\n\n**Success Criteria:** All claims staff certified, training materials documented, practice scenarios completed\n\n**Dependencies:** Build claims system\n\n**KPIs:** Staff certification rate, Confidence score\n\n**Effort:** 24 hours',
        deadline: addDays(START_DATE, 42),
        priority: 5,
      },
      {
        title: 'Process first 100 claims through system',
        description: 'Pilot new system and process with first 100 claims, monitor quality, iterate\n\n**Success Criteria:** 100 claims processed, 95%+ within SLA, <3 day avg decision time, <5% reopen rate\n\n**Dependencies:** Staff training on new process\n\n**KPIs:** SLA compliance, Decision time, Reopen rate\n\n**Effort:** 40 hours',
        deadline: addDays(START_DATE, 50),
        priority: 5,
      },
    ],
  });
  
  // OBJ 2: Customer Support
  console.log('--- Customer Support ---');
  await createProject(objectives[1].id, {
    name: 'Phase 1: Support Framework Definition',
    description: 'Define SLAs, response templates, and escalation procedures',
    deadline: addDays(START_DATE, 14),
    priority: 4,
    tasks: [
      {
        title: 'Define support SLAs',
        description: 'Establish response and resolution time SLAs for different support channels\n\n**Success Criteria:** SLAs defined for email, phone, urgent requests\n\n**Dependencies:** None\n\n**KPIs:** Response time, Resolution time, Customer satisfaction\n\n**Effort:** 6 hours',
        deadline: addDays(START_DATE, 7),
        priority: 4,
      },
      {
        title: 'Create response templates',
        description: 'Build library of professional response templates\n\n**Success Criteria:** 20+ templates covering 80% of support scenarios\n\n**Dependencies:** None\n\n**KPIs:** Response consistency\n\n**Effort:** 16 hours',
        deadline: addDays(START_DATE, 10),
        priority: 4,
      },
      {
        title: 'Define escalation procedures',
        description: 'Document when and how to escalate issues\n\n**Success Criteria:** Clear escalation triggers, paths, response times\n\n**Dependencies:** Define support SLAs\n\n**KPIs:** Escalation rate\n\n**Effort:** 4 hours',
        deadline: addDays(START_DATE, 14),
        priority: 4,
      },
    ],
  });
  
  await createProject(objectives[1].id, {
    name: 'Phase 2: Support Implementation',
    description: 'Train team and implement support framework',
    deadline: addDays(START_DATE, 45),
    priority: 4,
    tasks: [
      {
        title: 'Train support team',
        description: 'Train support staff on new SLAs, templates, escalation\n\n**Success Criteria:** All staff trained and certified\n\n**Dependencies:** Create response templates\n\n**KPIs:** Training completion\n\n**Effort:** 12 hours',
        deadline: addDays(START_DATE, 35),
        priority: 4,
      },
      {
        title: 'Implement support tracking',
        description: 'Set up ticket tracking system to monitor SLAs\n\n**Success Criteria:** System live, SLA tracking automated\n\n**Dependencies:** None\n\n**KPIs:** Ticket tracking accuracy\n\n**Effort:** 20 hours',
        deadline: addDays(START_DATE, 45),
        priority: 4,
      },
    ],
  });
  
  // OBJ 3: Product and Software
  console.log('--- Product and Software ---');
  await createProject(objectives[2].id, {
    name: 'Phase 1: Product Engine Requirements',
    description: 'Define requirements for core product/pricing engine - MUST COMPLETE FIRST',
    deadline: addDays(START_DATE, 7),
    priority: 5,
    tasks: [
      {
        title: 'Product engine requirements',
        description: 'Document all product types, pricing models, calculation rules\n\n**Success Criteria:** Complete product catalog, pricing logic defined\n\n**Dependencies:** None\n\n**KPIs:** Product definition completeness\n\n**Effort:** 24 hours',
        deadline: addDays(START_DATE, 7),
        priority: 5,
      },
    ],
  });
  
  await createProject(objectives[2].id, {
    name: 'Phase 2: Core System Builds (STRICT SEQUENCE)',
    description: 'Build Product Engine → CRM → Claims System → Reporting in STRICT ORDER',
    deadline: addDays(START_DATE, 75),
    priority: 5,
    tasks: [
      {
        title: 'Build Product Engine',
        description: 'Build core product/pricing engine\n\n**Success Criteria:** Engine deployed, pricing 100% accurate\n\n**Dependencies:** Product engine requirements\n\n**KPIs:** Pricing accuracy\n\n**Effort:** 80 hours',
        deadline: addDays(START_DATE, 35),
        priority: 5,
      },
      {
        title: 'Build CRM system',
        description: 'Build dealer/customer CRM with full contact management\n\n**Success Criteria:** CRM deployed, data migrated, integrated with Product Engine\n\n**Dependencies:** Build Product Engine\n\n**KPIs:** Data accuracy, System adoption\n\n**Effort:** 100 hours',
        deadline: addDays(START_DATE, 45),
        priority: 5,
      },
      {
        title: 'Build Claims System',
        description: 'Build digital claims management system\n\n**Success Criteria:** System deployed, integrated with CRM\n\n**Dependencies:** Build CRM system\n\n**KPIs:** System uptime\n\n**Effort:** 120 hours',
        deadline: addDays(START_DATE, 60),
        priority: 5,
      },
      {
        title: 'Build Reporting App',
        description: 'Build comprehensive reporting application\n\n**Success Criteria:** App deployed, automated reports functional\n\n**Dependencies:** Build CRM system\n\n**KPIs:** Report accuracy\n\n**Effort:** 80 hours',
        deadline: addDays(START_DATE, 75),
        priority: 5,
      },
    ],
  });
  
  // OBJ 4: Dealer Reporting
  console.log('--- Dealer Reporting ---');
  await createProject(objectives[3].id, {
    name: 'Phase 1: Reporting Requirements',
    description: 'Define dealer reporting needs',
    deadline: addDays(START_DATE, 7),
    priority: 5,
    tasks: [
      {
        title: 'Reporting requirements definition',
        description: 'Interview dealers, define required reports\n\n**Success Criteria:** Requirements doc approved\n\n**Dependencies:** None\n\n**KPIs:** Requirements completeness\n\n**Effort:** 16 hours',
        deadline: addDays(START_DATE, 7),
        priority: 5,
      },
    ],
  });
  
  await createProject(objectives[3].id, {
    name: 'Phase 2: Reporting System Build',
    description: 'Build and deploy automated dealer reporting',
    deadline: addDays(START_DATE, 90),
    priority: 5,
    tasks: [
      {
        title: 'Reporting app build',
        description: 'Build reporting application\n\n**Success Criteria:** App deployed, reports functional\n\n**Dependencies:** Build CRM system (from Product workstream)\n\n**KPIs:** Report accuracy\n\n**Effort:** 80 hours',
        deadline: addDays(START_DATE, 75),
        priority: 5,
      },
      {
        title: 'Automated dealer email reports',
        description: 'Set up automated monthly/weekly email reports\n\n**Success Criteria:** Automated emails sending to 100% dealers\n\n**Dependencies:** Reporting app build\n\n**KPIs:** Email delivery rate\n\n**Effort:** 16 hours',
        deadline: addDays(START_DATE, 80),
        priority: 4,
      },
      {
        title: '80% dealer engagement with reports',
        description: 'Drive dealer adoption through training\n\n**Success Criteria:** 80%+ dealers viewing monthly reports\n\n**Dependencies:** Automated dealer email reports\n\n**KPIs:** Adoption rate\n\n**Effort:** 24 hours',
        deadline: addDays(START_DATE, 90),
        priority: 4,
      },
    ],
  });
  
  // OBJ 5: Sales
  console.log('--- Sales and Dealer Acquisition ---');
  await createProject(objectives[4].id, {
    name: 'Phase 2: Sales Foundation',
    description: 'Build sales infrastructure',
    deadline: addDays(START_DATE, 30),
    priority: 4,
    tasks: [
      {
        title: 'Dealer qualification framework',
        description: 'Define ideal dealer profile, scoring system\n\n**Success Criteria:** Framework documented, tested on 10 prospects\n\n**Dependencies:** None\n\n**KPIs:** Deal quality score\n\n**Effort:** 12 hours',
        deadline: addDays(START_DATE, 30),
        priority: 4,
      },
    ],
  });
  
  await createProject(objectives[4].id, {
    name: 'Phase 3: Sales Execution',
    description: 'Create materials and execute sales',
    deadline: addDays(START_DATE, 75),
    priority: 4,
    tasks: [
      {
        title: 'Sales materials',
        description: 'Create pitch deck, one-pagers, case studies\n\n**Success Criteria:** Complete sales kit ready\n\n**Dependencies:** Brand positioning (from Marketing)\n\n**KPIs:** Material usage rate\n\n**Effort:** 32 hours',
        deadline: addDays(START_DATE, 60),
        priority: 4,
      },
      {
        title: 'Website sales pages',
        description: 'Create dealer landing pages\n\n**Success Criteria:** Pages live with conversion tracking\n\n**Dependencies:** Sales materials\n\n**KPIs:** Page conversion rate\n\n**Effort:** 24 hours',
        deadline: addDays(START_DATE, 65),
        priority: 4,
      },
      {
        title: 'Onboard new sales reps',
        description: 'Hire and train sales capacity\n\n**Success Criteria:** 2 reps hired, trained, first deals closed\n\n**Dependencies:** Sales materials\n\n**KPIs:** Ramp time\n\n**Effort:** 40 hours',
        deadline: addDays(START_DATE, 75),
        priority: 4,
      },
    ],
  });
  
  // OBJ 6: Onboarding
  console.log('--- Onboarding and Dealer Success ---');
  await createProject(objectives[5].id, {
    name: 'Phase 1: Onboarding Process Definition',
    description: 'Define systematic onboarding process',
    deadline: addDays(START_DATE, 10),
    priority: 5,
    tasks: [
      {
        title: 'Onboarding process definition',
        description: 'Map complete onboarding journey\n\n**Success Criteria:** Process documented, 14-day timeline\n\n**Dependencies:** None\n\n**KPIs:** Onboarding completion time\n\n**Effort:** 12 hours',
        deadline: addDays(START_DATE, 5),
        priority: 5,
      },
      {
        title: 'Onboarding checklist and docs',
        description: 'Create comprehensive onboarding kit\n\n**Success Criteria:** Complete kit ready\n\n**Dependencies:** Onboarding process definition\n\n**KPIs:** Material completeness\n\n**Effort:** 20 hours',
        deadline: addDays(START_DATE, 10),
        priority: 5,
      },
    ],
  });
  
  await createProject(objectives[5].id, {
    name: 'Phase 2: Onboarding Implementation',
    description: 'Train team and execute onboarding',
    deadline: addDays(START_DATE, 60),
    priority: 5,
    tasks: [
      {
        title: 'Onboarding staff training',
        description: 'Train team on new process\n\n**Success Criteria:** Team trained, practice completed\n\n**Dependencies:** Onboarding checklist\n\n**KPIs:** Team readiness\n\n**Effort:** 16 hours',
        deadline: addDays(START_DATE, 40),
        priority: 5,
      },
      {
        title: 'Conduct first structured dealer review',
        description: 'Execute first dealer business review\n\n**Success Criteria:** Review completed, positive feedback\n\n**Dependencies:** Reporting app build\n\n**KPIs:** Dealer satisfaction\n\n**Effort:** 8 hours',
        deadline: addDays(START_DATE, 50),
        priority: 5,
      },
      {
        title: '100% of dealers through new process',
        description: 'Ensure all dealers complete onboarding\n\n**Success Criteria:** All dealers onboarded <14 days\n\n**Dependencies:** Onboarding staff training\n\n**KPIs:** Onboarding completion rate\n\n**Effort:** 60 hours',
        deadline: addDays(START_DATE, 60),
        priority: 5,
      },
    ],
  });
  
  // OBJ 7: Marketing
  console.log('--- Marketing and Brand ---');
  await createProject(objectives[6].id, {
    name: 'Phase 2: Brand Foundation',
    description: 'Establish brand positioning',
    deadline: addDays(START_DATE, 25),
    priority: 4,
    tasks: [
      {
        title: 'Brand positioning and messaging',
        description: 'Define brand position, value props, messaging\n\n**Success Criteria:** Brand book documented\n\n**Dependencies:** None\n\n**KPIs:** Message consistency\n\n**Effort:** 24 hours',
        deadline: addDays(START_DATE, 25),
        priority: 4,
      },
    ],
  });
  
  await createProject(objectives[6].id, {
    name: 'Phase 3: Marketing Execution',
    description: 'Create materials and launch brand',
    deadline: addDays(START_DATE, 75),
    priority: 4,
    tasks: [
      {
        title: 'Sales materials (marketing)',
        description: 'Create branded sales collateral\n\n**Success Criteria:** Complete sales kit\n\n**Dependencies:** Brand positioning\n\n**KPIs:** Material quality\n\n**Effort:** 32 hours',
        deadline: addDays(START_DATE, 60),
        priority: 4,
      },
      {
        title: 'Website redesign',
        description: 'Redesign website with new branding\n\n**Success Criteria:** New site live, mobile responsive\n\n**Dependencies:** Brand positioning\n\n**KPIs:** Site traffic\n\n**Effort:** 60 hours',
        deadline: addDays(START_DATE, 65),
        priority: 4,
      },
      {
        title: 'Dealer mailer campaign',
        description: 'Launch targeted outreach campaign\n\n**Success Criteria:** Campaign sent to 200+ prospects\n\n**Dependencies:** Sales materials\n\n**KPIs:** Response rate\n\n**Effort:** 16 hours',
        deadline: addDays(START_DATE, 75),
        priority: 4,
      },
    ],
  });
  
  // OBJ 8: Business Management
  console.log('--- Business Management and Governance ---');
  await createProject(objectives[7].id, {
    name: 'Phase 1: Organization Definition',
    description: 'Define team structure, roles, ownership',
    deadline: addDays(START_DATE, 14),
    priority: 5,
    tasks: [
      {
        title: 'Define team structure and roles',
        description: 'Document org structure, roles, responsibilities\n\n**Success Criteria:** Org chart documented, gaps identified\n\n**Dependencies:** None\n\n**KPIs:** Role clarity\n\n**Effort:** 12 hours',
        deadline: addDays(START_DATE, 3),
        priority: 5,
      },
      {
        title: 'Assign workstream owners',
        description: 'Assign owner to each workstream\n\n**Success Criteria:** All 10 workstreams have owner\n\n**Dependencies:** Define team structure\n\n**KPIs:** Ownership coverage\n\n**Effort:** 4 hours',
        deadline: addDays(START_DATE, 5),
        priority: 5,
      },
      {
        title: 'Establish weekly/monthly review cadence',
        description: 'Set up management rhythms\n\n**Success Criteria:** Calendar set, agendas defined\n\n**Dependencies:** None\n\n**KPIs:** Meeting attendance\n\n**Effort:** 4 hours',
        deadline: addDays(START_DATE, 5),
        priority: 5,
      },
      {
        title: 'Build management dashboard',
        description: 'Create executive dashboard for KPIs\n\n**Success Criteria:** Dashboard live, all KPIs tracked\n\n**Dependencies:** Assign workstream owners\n\n**KPIs:** Dashboard usage\n\n**Effort:** 24 hours',
        deadline: addDays(START_DATE, 10),
        priority: 5,
      },
      {
        title: 'Dealer relationship audit',
        description: 'Audit all dealer relationships\n\n**Success Criteria:** All dealers scored, action plans created\n\n**Dependencies:** None\n\n**KPIs:** Audit completeness\n\n**Effort:** 32 hours',
        deadline: addDays(START_DATE, 14),
        priority: 5,
      },
    ],
  });
  
  // OBJ 9: Partnerships
  console.log('--- Partnerships ---');
  await createProject(objectives[8].id, {
    name: 'Phase 3: Partnership Strategy',
    description: 'Define partnership approach',
    deadline: addDays(START_DATE, 90),
    priority: 3,
    tasks: [
      {
        title: 'Define partnership strategy',
        description: 'Identify partner types, value exchange\n\n**Success Criteria:** Strategy doc complete\n\n**Dependencies:** None\n\n**KPIs:** Strategy clarity\n\n**Effort:** 16 hours',
        deadline: addDays(START_DATE, 75),
        priority: 3,
      },
      {
        title: 'Identify and approach 10 potential partners',
        description: 'Research and initiate partner conversations\n\n**Success Criteria:** 10 approached, 5+ interested\n\n**Dependencies:** Define partnership strategy\n\n**KPIs:** Response rate\n\n**Effort:** 24 hours',
        deadline: addDays(START_DATE, 90),
        priority: 3,
      },
    ],
  });
  
  await createProject(objectives[8].id, {
    name: 'Phase 4: Partnership Execution',
    description: 'Formalize partnerships',
    deadline: addDays(START_DATE, 180),
    priority: 3,
    tasks: [
      {
        title: 'Close first 2 partnerships',
        description: 'Finalize agreements and integrate\n\n**Success Criteria:** 2 partnerships live, generating value\n\n**Dependencies:** Identify partners\n\n**KPIs:** Partnership value\n\n**Effort:** 40 hours',
        deadline: addDays(START_DATE, 150),
        priority: 3,
      },
    ],
  });
  
  // OBJ 10: US Expansion
  console.log('--- US Expansion ---');
  await createProject(objectives[9].id, {
    name: 'Phase 3: US Market Research',
    description: 'Research US market opportunity',
    deadline: addDays(START_DATE, 120),
    priority: 3,
    tasks: [
      {
        title: 'US market research',
        description: 'Research US warranty market\n\n**Success Criteria:** Research report complete\n\n**Dependencies:** None\n\n**KPIs:** Research completeness\n\n**Effort:** 40 hours',
        deadline: addDays(START_DATE, 90),
        priority: 3,
      },
      {
        title: 'Regulatory and compliance review',
        description: 'Understand US regulatory requirements\n\n**Success Criteria:** Compliance roadmap documented\n\n**Dependencies:** US market research\n\n**KPIs:** Compliance clarity\n\n**Effort:** 24 hours',
        deadline: addDays(START_DATE, 105),
        priority: 3,
      },
      {
        title: 'Define US go-to-market strategy',
        description: 'Define target segment, GTM plan\n\n**Success Criteria:** GTM strategy doc complete\n\n**Dependencies:** US market research, Regulatory review\n\n**KPIs:** Strategy completeness\n\n**Effort:** 20 hours',
        deadline: addDays(START_DATE, 120),
        priority: 3,
      },
    ],
  });
  
  await createProject(objectives[9].id, {
    name: 'Phase 4: US Pilot Planning',
    description: 'Plan pilot program',
    deadline: addDays(START_DATE, 180),
    priority: 3,
    tasks: [
      {
        title: 'Identify pilot partners in US',
        description: 'Find 3-5 potential pilot partners\n\n**Success Criteria:** 5 potential partners identified\n\n**Dependencies:** Define US GTM strategy\n\n**KPIs:** Partner quality\n\n**Effort:** 32 hours',
        deadline: addDays(START_DATE, 150),
        priority: 3,
      },
      {
        title: 'Plan US pilot program',
        description: 'Design 6-month pilot program\n\n**Success Criteria:** Pilot plan complete\n\n**Dependencies:** Identify pilot partners\n\n**KPIs:** Plan completeness\n\n**Effort:** 16 hours',
        deadline: addDays(START_DATE, 180),
        priority: 3,
      },
    ],
  });
  
  return { totalProjects, totalTasks };
}

async function generateSummary(goals, objectives, projectCounts) {
  console.log('\n' + '='.repeat(80));
  console.log('✅ LOVE WARRANTY PROJECT STRUCTURE CREATED');
  console.log('='.repeat(80));
  
  console.log('\n📊 SUMMARY:');
  console.log(`   Goals: ${goals.length}`);
  console.log(`   Objectives: ${objectives.length}`);
  console.log(`   Projects: ${projectCounts.totalProjects}`);
  console.log(`   Tasks: ${projectCounts.totalTasks}`);
  
  console.log('\n🎯 GOALS:');
  goals.forEach((goal, i) => {
    console.log(`   ${i + 1}. ${goal.title}`);
    console.log(`      Target: ${goal.targetValue} ${goal.unit}`);
    console.log(`      Deadline: ${goal.deadline.toISOString().split('T')[0]}`);
  });
  
  console.log('\n🎯 OBJECTIVES:');
  objectives.forEach((obj, i) => {
    console.log(`   ${i + 1}. ${obj.title}`);
    console.log(`      Deadline: ${obj.deadline.toISOString().split('T')[0]}`);
    console.log(`      Priority: ${obj.priority}/5`);
  });
  
  console.log('\n📅 TIMELINE:');
  console.log(`   Start: ${START_DATE.toISOString().split('T')[0]}`);
  console.log(`   Phase 1 (Stabilise/Define): Days 1-14`);
  console.log(`   Phase 2 (Build Core): Days 15-75`);
  console.log(`   Phase 3 (Commercial Acceleration): Days 76-90`);
  console.log(`   Phase 4 (Scale): Days 91-180`);
  
  console.log('\n🔑 KEY DEPENDENCIES:');
  console.log('   1. Business Management (Day 1-14) → Enables all workstreams');
  console.log('   2. Product Engine (Day 1-35) → Blocks CRM, Claims, Reporting');
  console.log('   3. CRM (Day 36-45) → Blocks Claims System, Reporting');
  console.log('   4. Claims System (Day 46-60) → Blocks operational excellence');
  console.log('   5. Reporting (Day 61-90) → Blocks dealer insights and upsell');
  
  console.log('\n✅ NEXT STEPS:');
  console.log('   1. Review structure in Zebi dashboard');
  console.log('   2. Assign owners to all 10 objectives');
  console.log('   3. Assign owners to all projects and tasks');
  console.log('   4. Conduct kickoff meeting');
  console.log('   5. Start Phase 1: Business Management and Claims Definition');
  
  console.log('\n' + '='.repeat(80));
}

async function main() {
  try {
    console.log('🚀 Creating Love Warranty Project Structure in Zebi');
    console.log('='.repeat(80));
    
    const companyId = await getOrCreateCompany();
    const goals = await createGoals(companyId);
    const objectives = await createObjectives(companyId, goals);
    const projectCounts = await createProjectsAndTasks(objectives, companyId);
    await generateSummary(goals, objectives, projectCounts);
    
    await prisma.$disconnect();
    console.log('\n✅ Complete! Disconnected from database.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
