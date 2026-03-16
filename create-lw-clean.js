#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';
const START_DATE = new Date('2026-03-15');

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

let stats = { goals: 0, objectives: 0, projects: 0, tasks: 0 };

async function main() {
  try {
    console.log('🚀 Creating Love Warranty Structure in Zebi\n');
    
    // Get/Create Company
    let company = await prisma.company.findFirst({
      where: { workspaceId: WORKSPACE_ID, name: 'Love Warranty' }
    });
    
    if (!company) {
      company = await prisma.company.create({
        data: {
          workspaceId: WORKSPACE_ID,
          name: 'Love Warranty',
          description: 'Extended warranty provider for automotive dealers',
          createdBy: USER_ID,
        }
      });
    }
    console.log(`✅ Company: ${company.name}\n`);
    
    // Create Goals
    console.log('🎯 Creating 3 Goals...');
    const goal1 = await prisma.goal.create({
      data: {
        workspaceId: WORKSPACE_ID,
        createdBy: USER_ID,
        name: 'Double revenue to £60k/month with improved control and margins',
        metricType: 'revenue',
        targetValue: 60000,
        currentValue: 30000,
        unit: 'GBP/month',
        startDate: START_DATE,
        endDate: addDays(START_DATE, 365),
        status: 'active',
        companyIds: [company.id],
        descriptionRich: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Grow from £30k to £60k monthly revenue with better systems.' }] }] },
      }
    });
    
    const goal2 = await prisma.goal.create({
      data: {
        workspaceId: WORKSPACE_ID,
        createdBy: USER_ID,
        name: 'Achieve operational excellence: Claims, Support, Onboarding',
        metricType: 'completion',
        targetValue: 100,
        currentValue: 0,
        unit: '%',
        startDate: START_DATE,
        endDate: addDays(START_DATE, 180),
        status: 'active',
        companyIds: [company.id],
        descriptionRich: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Systemize core operations.' }] }] },
      }
    });
    
    const goal3 = await prisma.goal.create({
      data: {
        workspaceId: WORKSPACE_ID,
        createdBy: USER_ID,
        name: 'Commercial growth: 50+ dealers, strong upsell, high retention',
        metricType: 'count',
        targetValue: 50,
        currentValue: 35,
        unit: 'dealers',
        startDate: START_DATE,
        endDate: addDays(START_DATE, 180),
        status: 'active',
        companyIds: [company.id],
        descriptionRich: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Scale dealer base with excellent retention.' }] }] },
      }
    });
    
    stats.goals = 3;
    console.log('  ✅ Goal 1: Revenue growth');
    console.log('  ✅ Goal 2: Operational excellence');
    console.log('  ✅ Goal 3: Commercial growth\n');
    
    // Create Objectives
    console.log('🎯 Creating 10 Objectives...');
    
    const objectives = await Promise.all([
      prisma.objective.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          goal: { connect: { id: goal2.id } },
          title: 'A. Claims and Customer Operations - Systemize processes',
          description: 'Define and implement systematic claims processing. TARGET: 95% within SLA, <3 day decision time.',
          objectiveType: 'operations',
          metricType: 'percentage',
          targetValue: 100,
          currentValue: 0,
          unit: '%',
          startDate: START_DATE,
          deadline: addDays(START_DATE, 60),
          status: 'active',
          priority: 5,
          checkFrequency: 'weekly',
          createdBy: USER_ID,
          progressPercent: 0,
        }
      }),
      prisma.objective.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          goal: { connect: { id: goal2.id } },
          title: 'Customer Support - Establish SLAs and consistency',
          description: 'Create customer support framework with defined SLAs, response templates, and escalation procedures.',
          objectiveType: 'operations',
          metricType: 'percentage',
          targetValue: 100,
          currentValue: 0,
          unit: '%',
          startDate: START_DATE,
          deadline: addDays(START_DATE, 60),
          status: 'active',
          priority: 4,
          checkFrequency: 'weekly',
          createdBy: USER_ID,
          progressPercent: 0,
        }
      }),
      prisma.objective.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          goal: { connect: { id: goal2.id } },
          title: 'Product and Software - Build core infrastructure',
          description: 'Build Product Engine → CRM → Claims System → Reporting in STRICT ORDER.',
          objectiveType: 'product',
          metricType: 'percentage',
          targetValue: 100,
          currentValue: 0,
          unit: '%',
          startDate: START_DATE,
          deadline: addDays(START_DATE, 75),
          status: 'active',
          priority: 5,
          checkFrequency: 'weekly',
          createdBy: USER_ID,
          progressPercent: 0,
        }
      }),
      prisma.objective.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          goal: { connect: { id: goal3.id } },
          title: 'Dealer Reporting and Intelligence - Enable visibility',
          description: 'Build comprehensive reporting system. 90% adoption, 100% accuracy.',
          objectiveType: 'product',
          metricType: 'percentage',
          targetValue: 90,
          currentValue: 0,
          unit: '%',
          startDate: START_DATE,
          deadline: addDays(START_DATE, 90),
          status: 'active',
          priority: 5,
          checkFrequency: 'weekly',
          createdBy: USER_ID,
          progressPercent: 0,
        }
      }),
      prisma.objective.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          goal: { connect: { id: goal3.id } },
          title: 'Sales and Dealer Acquisition - Structured growth',
          description: 'Implement structured sales process with qualification framework.',
          objectiveType: 'sales',
          metricType: 'count',
          targetValue: 15,
          currentValue: 0,
          unit: 'dealers',
          startDate: START_DATE,
          deadline: addDays(START_DATE, 180),
          status: 'active',
          priority: 4,
          checkFrequency: 'weekly',
          createdBy: USER_ID,
          progressPercent: 0,
        }
      }),
      prisma.objective.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          goal: { connect: { id: goal3.id } },
          title: 'Onboarding and Dealer Success - Standardized processes',
          description: 'Create systematic onboarding. KPI: 100% complete within 14 days.',
          objectiveType: 'operations',
          metricType: 'percentage',
          targetValue: 100,
          currentValue: 0,
          unit: '%',
          startDate: START_DATE,
          deadline: addDays(START_DATE, 60),
          status: 'active',
          priority: 5,
          checkFrequency: 'weekly',
          createdBy: USER_ID,
          progressPercent: 0,
        }
      }),
      prisma.objective.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          goal: { connect: { id: goal3.id } },
          title: 'Marketing and Brand - Unified messaging',
          description: 'Develop clear brand positioning and professional materials.',
          objectiveType: 'marketing',
          metricType: 'percentage',
          targetValue: 100,
          currentValue: 0,
          unit: '%',
          startDate: START_DATE,
          deadline: addDays(START_DATE, 75),
          status: 'active',
          priority: 4,
          checkFrequency: 'weekly',
          createdBy: USER_ID,
          progressPercent: 0,
        }
      }),
      prisma.objective.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          goal: { connect: { id: goal2.id } },
          title: 'Business Management and Governance - Clear ownership',
          description: 'Define team structure, assign workstream owners, establish management rhythms.',
          objectiveType: 'operations',
          metricType: 'percentage',
          targetValue: 100,
          currentValue: 0,
          unit: '%',
          startDate: START_DATE,
          deadline: addDays(START_DATE, 14),
          status: 'active',
          priority: 5,
          checkFrequency: 'daily',
          createdBy: USER_ID,
          progressPercent: 0,
        }
      }),
      prisma.objective.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          goal: { connect: { id: goal3.id } },
          title: 'Partnerships - Enable growth through partners',
          description: 'Develop partnership strategy for complementary partners.',
          objectiveType: 'partnerships',
          metricType: 'count',
          targetValue: 5,
          currentValue: 0,
          unit: 'partners',
          startDate: START_DATE,
          deadline: addDays(START_DATE, 180),
          status: 'planning',
          priority: 3,
          checkFrequency: 'monthly',
          createdBy: USER_ID,
          progressPercent: 0,
        }
      }),
      prisma.objective.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          goal: { connect: { id: goal1.id } },
          title: 'US Expansion - Parallel strategic track',
          description: 'Explore and plan US market entry strategy.',
          objectiveType: 'expansion',
          metricType: 'percentage',
          targetValue: 100,
          currentValue: 0,
          unit: '%',
          startDate: START_DATE,
          deadline: addDays(START_DATE, 180),
          status: 'planning',
          priority: 3,
          checkFrequency: 'monthly',
          createdBy: USER_ID,
          progressPercent: 0,
        }
      }),
    ]);
    
    stats.objectives = 10;
    console.log('  ✅ Created 10 objectives\n');
    
    // Get todo status for tasks
    const todoStatus = await prisma.status.findFirst({
      where: { workspaceId: WORKSPACE_ID, type: 'todo' }
    });
    
    // Create key projects for the first 4 objectives
    console.log('📁 Creating Projects and Tasks...\n');
    
    // OBJ 1: Claims - 2 projects
    const p1 = await prisma.project.create({
      data: {
        workspace: { connect: { id: WORKSPACE_ID } },
        objective: { connect: { id: objectives[0].id } },
        name: 'Phase 1: Claims Process Definition',
        description: 'Define claims framework',
        priority: 5,
        owner: USER_ID,
      }
    });
    stats.projects++;
    
    await createTasks(p1.id, objectives[0].id, todoStatus.id, [
      { title: 'Define approval/rejection framework (document)', desc: 'Create criteria for claim approval vs rejection.\n\n**Success:** Document approved, covers 90%+ scenarios\n**Dependencies:** None\n**Effort:** 16 hours', days: 3, priority: 5 },
      { title: 'Define claims workflow (document)', desc: 'Map end-to-end claims process.\n\n**Success:** Complete process map\n**Dependencies:** Approval framework\n**Effort:** 12 hours', days: 5, priority: 5 },
      { title: 'Define SLAs and KPIs (document)', desc: 'Establish measurable SLAs.\n\n**Success:** SLAs: <3 day decision, 95% within SLA\n**Effort:** 8 hours', days: 7, priority: 5 },
    ]);
    
    const p2 = await prisma.project.create({
      data: {
        workspace: { connect: { id: WORKSPACE_ID } },
        objective: { connect: { id: objectives[0].id } },
        name: 'Phase 2: Claims System Build',
        description: 'Build and deploy claims system',
        priority: 5,
        owner: USER_ID,
      }
    });
    stats.projects++;
    
    await createTasks(p2.id, objectives[0].id, todoStatus.id, [
      { title: 'Build claims system', desc: 'Develop digital claims management system.\n\n**Success:** System deployed, integrated with CRM\n**Dependencies:** CRM system\n**Effort:** 120 hours', days: 35, priority: 5 },
      { title: 'Staff training on new process', desc: 'Train claims staff.\n\n**Success:** All staff certified\n**Effort:** 24 hours', days: 42, priority: 5 },
      { title: 'Process first 100 claims', desc: 'Pilot new system.\n\n**Success:** 95%+ within SLA\n**Effort:** 40 hours', days: 50, priority: 5 },
    ]);
    
    // OBJ 2: Support - 2 projects
    const p3 = await prisma.project.create({
      data: {
        workspace: { connect: { id: WORKSPACE_ID } },
        objective: { connect: { id: objectives[1].id } },
        name: 'Phase 1: Support Framework',
        description: 'Define SLAs, templates, escalation',
        priority: 4,
        owner: USER_ID,
      }
    });
    stats.projects++;
    
    await createTasks(p3.id, objectives[1].id, todoStatus.id, [
      { title: 'Define support SLAs', desc: 'Establish response/resolution times.\n\n**Success:** SLAs for all channels\n**Effort:** 6 hours', days: 7, priority: 4 },
      { title: 'Create response templates', desc: 'Build template library.\n\n**Success:** 20+ templates\n**Effort:** 16 hours', days: 10, priority: 4 },
      { title: 'Define escalation procedures', desc: 'Document escalation paths.\n\n**Success:** Clear framework\n**Effort:** 4 hours', days: 14, priority: 4 },
    ]);
    
    // OBJ 3: Product - 2 projects
    const p4 = await prisma.project.create({
      data: {
        workspace: { connect: { id: WORKSPACE_ID } },
        objective: { connect: { id: objectives[2].id } },
        name: 'Phase 1: Product Engine Requirements',
        description: 'Define product/pricing requirements',
        priority: 5,
        owner: USER_ID,
      }
    });
    stats.projects++;
    
    await createTasks(p4.id, objectives[2].id, todoStatus.id, [
      { title: 'Product engine requirements', desc: 'Document product types, pricing models.\n\n**Success:** Complete product catalog\n**Effort:** 24 hours', days: 7, priority: 5 },
    ]);
    
    const p5 = await prisma.project.create({
      data: {
        workspace: { connect: { id: WORKSPACE_ID } },
        objective: { connect: { id: objectives[2].id } },
        name: 'Phase 2: Core System Builds (STRICT SEQUENCE)',
        description: 'Product Engine → CRM → Claims → Reporting',
        priority: 5,
        owner: USER_ID,
      }
    });
    stats.projects++;
    
    await createTasks(p5.id, objectives[2].id, todoStatus.id, [
      { title: 'Build Product Engine', desc: 'Build core pricing engine.\n\n**Success:** Engine deployed, 100% accurate\n**Dependencies:** Requirements\n**Effort:** 80 hours', days: 35, priority: 5 },
      { title: 'Build CRM system', desc: 'Build dealer/customer CRM.\n\n**Success:** CRM deployed, data migrated\n**Dependencies:** Product Engine\n**Effort:** 100 hours', days: 45, priority: 5 },
      { title: 'Build Claims System', desc: 'Build claims management.\n\n**Success:** System deployed\n**Dependencies:** CRM\n**Effort:** 120 hours', days: 60, priority: 5 },
      { title: 'Build Reporting App', desc: 'Build reporting application.\n\n**Success:** App deployed\n**Dependencies:** CRM\n**Effort:** 80 hours', days: 75, priority: 5 },
    ]);
    
    // OBJ 8: Business Management - 1 project
    const p6 = await prisma.project.create({
      data: {
        workspace: { connect: { id: WORKSPACE_ID } },
        objective: { connect: { id: objectives[7].id } },
        name: 'Phase 1: Organization Definition',
        description: 'Define team structure and ownership',
        priority: 5,
        owner: USER_ID,
      }
    });
    stats.projects++;
    
    await createTasks(p6.id, objectives[7].id, todoStatus.id, [
      { title: 'Define team structure and roles', desc: 'Document org structure.\n\n**Success:** Org chart documented\n**Effort:** 12 hours', days: 3, priority: 5 },
      { title: 'Assign workstream owners', desc: 'Assign owners to all workstreams.\n\n**Success:** All 10 workstreams have owner\n**Effort:** 4 hours', days: 5, priority: 5 },
      { title: 'Establish review cadence', desc: 'Set up management rhythms.\n\n**Success:** Calendar set, agendas defined\n**Effort:** 4 hours', days: 5, priority: 5 },
      { title: 'Build management dashboard', desc: 'Create executive dashboard.\n\n**Success:** Dashboard live, all KPIs tracked\n**Effort:** 24 hours', days: 10, priority: 5 },
      { title: 'Dealer relationship audit', desc: 'Audit all dealer relationships.\n\n**Success:** All dealers scored, action plans\n**Effort:** 32 hours', days: 14, priority: 5 },
    ]);
    
    // Summary
    console.log('='.repeat(80));
    console.log('✅ LOVE WARRANTY PROJECT STRUCTURE CREATED');
    console.log('='.repeat(80));
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Goals: ${stats.goals}`);
    console.log(`   Objectives: ${stats.objectives}`);
    console.log(`   Projects: ${stats.projects}`);
    console.log(`   Tasks: ${stats.tasks}`);
    console.log(`\n📅 TIMELINE: 180 days (${START_DATE.toISOString().split('T')[0]} onwards)`);
    console.log(`   Phase 1 (Define): Days 1-14`);
    console.log(`   Phase 2 (Build): Days 15-75`);
    console.log(`   Phase 3 (Accelerate): Days 76-90`);
    console.log(`   Phase 4 (Scale): Days 91-180`);
    console.log(`\n✅ Next: Review in Zebi dashboard and assign owners`);
    console.log('='.repeat(80) + '\n');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

async function createTasks(projectId, objectiveId, statusId, tasks) {
  for (const t of tasks) {
    await prisma.task.create({
      data: {
        workspace: { connect: { id: WORKSPACE_ID } },
        status: { connect: { id: statusId } },
        project: { connect: { id: projectId } },
        objective: { connect: { id: objectiveId } },
        title: t.title,
        description: t.desc,
        priority: t.priority,
        dueAt: t.days ? addDays(START_DATE, t.days) : null,
        assigneeId: USER_ID,
        createdBy: USER_ID,
      }
    });
    stats.tasks++;
    console.log(`    📝 ${t.title}`);
  }
}

main();
