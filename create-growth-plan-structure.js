#!/usr/bin/env node
/**
 * Love Warranty Growth Plan - Complete Structure Creation
 * 
 * Creates 10 workstreams (A-J) with proper sequencing and priorities
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPANY_ID = 'a50c15be-afec-49fa-81d3-0bb34570b74b';
const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const BENJAMIN_BROWN_ID = '8494814048';

// 10 Workstreams with proper sequencing
const WORKSTREAMS = [
  // Priority 1: Operational foundations
  {
    code: 'A',
    name: 'Claims & Customer Operations',
    description: 'Systematize claims approval framework, decision rules, SLAs, and support workflows for consistent, transparent customer service',
    priority: 1,
    deadline: 30, // days from start
    projects: [
      { name: 'Claims Decision Framework', desc: 'Define clear approval/rejection criteria', effort: 8, assignTo: 'benjamin', phase: 1 },
      { name: 'Claims Process Documentation', desc: 'Document end-to-end claims workflows', effort: 5, assignTo: 'ai', phase: 1 },
      { name: 'Claims SLA Definition', desc: 'Set response time and resolution standards', effort: 5, assignTo: 'benjamin', phase: 1 },
      { name: 'Claims Team Training', desc: 'Train team on new framework and processes', effort: 6, assignTo: 'ai', phase: 1 },
      { name: 'Claims System Setup', desc: 'Configure claims management in CRM', effort: 7, assignTo: 'ai', phase: 2 },
      { name: 'Claims Quality Assurance', desc: 'Implement QA review process', effort: 5, assignTo: 'benjamin', phase: 2 }
    ]
  },
  {
    code: 'B',
    name: 'Customer Support',
    description: 'Establish quality support workflows, SLAs, escalation paths, and consistency standards',
    priority: 1,
    deadline: 30,
    projects: [
      { name: 'Support Process Definition', desc: 'Define support tiers and workflows', effort: 5, assignTo: 'ai', phase: 1 },
      { name: 'Support SLA Framework', desc: 'Set response and resolution SLAs', effort: 5, assignTo: 'benjamin', phase: 1 },
      { name: 'Escalation Path Design', desc: 'Create clear escalation procedures', effort: 4, assignTo: 'ai', phase: 1 },
      { name: 'Support Team Training', desc: 'Train support staff on standards', effort: 6, assignTo: 'ai', phase: 1 },
      { name: 'Support Quality Metrics', desc: 'Define and track support KPIs', effort: 5, assignTo: 'benjamin', phase: 2 }
    ]
  },
  {
    code: 'F',
    name: 'Dealer Onboarding & Success',
    description: 'Define standardized onboarding checklist, dealer review framework, and success metrics',
    priority: 1,
    deadline: 30,
    projects: [
      { name: 'Onboarding Checklist Creation', desc: 'Build step-by-step onboarding process', effort: 5, assignTo: 'ai', phase: 1 },
      { name: 'Dealer Review Framework', desc: 'Create periodic review structure', effort: 5, assignTo: 'benjamin', phase: 1 },
      { name: 'Success Metrics Definition', desc: 'Define dealer success KPIs', effort: 4, assignTo: 'ai', phase: 1 },
      { name: 'Onboarding Materials', desc: 'Create training docs and resources', effort: 6, assignTo: 'ai', phase: 1 },
      { name: 'Onboarding Automation', desc: 'Automate onboarding workflows', effort: 7, assignTo: 'ai', phase: 2 }
    ]
  },
  {
    code: 'H',
    name: 'Business Management & Governance',
    description: 'Define team structure, roles, decision rights, and management dashboards. BLOCKS everything else - start immediately!',
    priority: 1,
    deadline: 7, // Must be done in first week!
    projects: [
      { name: 'Organization Structure', desc: 'Define roles and reporting lines', effort: 8, assignTo: 'benjamin', phase: 1 },
      { name: 'Decision Rights Framework', desc: 'Clarify who decides what', effort: 6, assignTo: 'benjamin', phase: 1 },
      { name: 'Management Dashboard Design', desc: 'Define key management metrics', effort: 5, assignTo: 'ai', phase: 1 },
      { name: 'KPI Framework', desc: 'Establish company-wide KPI structure', effort: 6, assignTo: 'benjamin', phase: 1 },
      { name: 'Management Reporting Setup', desc: 'Implement reporting cadence', effort: 5, assignTo: 'ai', phase: 2 }
    ]
  },
  
  // Priority 2: Core growth systems
  {
    code: 'C',
    name: 'Product & Technology',
    description: 'Define product engine requirements and strict build sequencing (Engine→CRM→Claims→Reporting)',
    priority: 2,
    deadline: 90,
    projects: [
      { name: 'Product Engine Requirements', desc: 'Define product/pricing engine spec', effort: 8, assignTo: 'benjamin', phase: 1 },
      { name: 'Product Engine Build', desc: 'Build core product pricing engine', effort: 10, assignTo: 'ai', phase: 2 },
      { name: 'CRM System Requirements', desc: 'Define CRM requirements', effort: 7, assignTo: 'ai', phase: 1 },
      { name: 'CRM System Build', desc: 'Build/configure CRM system', effort: 10, assignTo: 'ai', phase: 2 },
      { name: 'Claims System Integration', desc: 'Integrate claims with CRM', effort: 8, assignTo: 'ai', phase: 2 },
      { name: 'System Testing & QA', desc: 'Test all system integrations', effort: 7, assignTo: 'ai', phase: 2 }
    ]
  },
  {
    code: 'D',
    name: 'Dealer Reporting & Intelligence',
    description: 'Define reporting requirements, dashboard structure, and data quality standards',
    priority: 2,
    deadline: 90,
    projects: [
      { name: 'Reporting Requirements', desc: 'Define what dealers need to see', effort: 6, assignTo: 'benjamin', phase: 1 },
      { name: 'Dashboard Design', desc: 'Design dealer dashboard layouts', effort: 5, assignTo: 'ai', phase: 1 },
      { name: 'Data Quality Standards', desc: 'Define data accuracy requirements', effort: 4, assignTo: 'ai', phase: 1 },
      { name: 'Reporting Application Build', desc: 'Build dealer reporting app', effort: 10, assignTo: 'ai', phase: 2 },
      { name: 'Forecast & Review Tools', desc: 'Build forecasting capabilities', effort: 7, assignTo: 'ai', phase: 2 }
    ]
  },
  
  // Priority 3: Revenue acceleration
  {
    code: 'E',
    name: 'Sales & Dealer Acquisition',
    description: 'Define dealer qualification criteria, targeting, and sales process',
    priority: 3,
    deadline: 120,
    projects: [
      { name: 'Dealer Qualification Framework', desc: 'Define ideal dealer criteria', effort: 6, assignTo: 'benjamin', phase: 1 },
      { name: 'Sales Process Design', desc: 'Map sales funnel and stages', effort: 5, assignTo: 'ai', phase: 1 },
      { name: 'Sales Materials Creation', desc: 'Create pitch decks and collateral', effort: 6, assignTo: 'ai', phase: 2 },
      { name: 'Sales Team Setup', desc: 'Hire/train sales resources', effort: 7, assignTo: 'benjamin', phase: 2 },
      { name: 'Dealer Upsell Strategy', desc: 'Design dealer expansion approach', effort: 5, assignTo: 'ai', phase: 3 }
    ]
  },
  {
    code: 'G',
    name: 'Marketing & Brand',
    description: 'Define brand position, tone of voice, and key messaging pillars',
    priority: 3,
    deadline: 120,
    projects: [
      { name: 'Brand Positioning', desc: 'Define brand promise and positioning', effort: 7, assignTo: 'benjamin', phase: 1 },
      { name: 'Messaging Framework', desc: 'Create key message pillars', effort: 5, assignTo: 'ai', phase: 1 },
      { name: 'Website Development', desc: 'Build/refresh company website', effort: 8, assignTo: 'ai', phase: 2 },
      { name: 'Marketing Materials', desc: 'Create brochures and collateral', effort: 6, assignTo: 'ai', phase: 2 },
      { name: 'Dealer Marketing Package', desc: 'Build dealer co-marketing tools', effort: 5, assignTo: 'ai', phase: 3 }
    ]
  },
  
  // Priority 4: Strategic structure
  {
    code: 'I',
    name: 'Partnerships & Integrations',
    description: 'Assess partnership opportunities (Bumper, Autofacets, Stripe) and define integration approach',
    priority: 4,
    deadline: 180,
    projects: [
      { name: 'Partnership Assessment', desc: 'Evaluate strategic partners', effort: 6, assignTo: 'benjamin', phase: 1 },
      { name: 'Bumper Integration', desc: 'Integrate with Bumper platform', effort: 8, assignTo: 'ai', phase: 3 },
      { name: 'Payment Integration', desc: 'Stripe/payment processing setup', effort: 6, assignTo: 'ai', phase: 2 },
      { name: 'Partner Management', desc: 'Establish partner relationships', effort: 5, assignTo: 'benjamin', phase: 3 }
    ]
  },
  {
    code: 'J',
    name: 'US Expansion',
    description: 'Prepare US expansion: L1A visa, Delaware entity, insurance partnerships',
    priority: 4,
    deadline: 180,
    projects: [
      { name: 'Legal Entity Setup', desc: 'Establish Delaware entity', effort: 7, assignTo: 'benjamin', phase: 4 },
      { name: 'L1A Visa Preparation', desc: 'Prepare visa documentation', effort: 8, assignTo: 'benjamin', phase: 4 },
      { name: 'US Insurance Partnerships', desc: 'Research US insurance partners', effort: 7, assignTo: 'ai', phase: 4 },
      { name: 'US Market Research', desc: 'Research US warranty market', effort: 6, assignTo: 'ai', phase: 3 }
    ]
  }
];

async function createStructure() {
  console.log('🚀 Love Warranty Growth Plan - Creating Structure\n');
  console.log('=' .repeat(80));
  
  const baseDate = new Date('2026-03-16');
  const objectivesCreated = [];
  let totalProjects = 0;
  let totalTasks = 0;
  
  for (const workstream of WORKSTREAMS) {
    console.log(`\n📁 Creating ${workstream.code}. ${workstream.name}`);
    
    // Calculate deadline
    const deadline = new Date(baseDate);
    deadline.setDate(deadline.getDate() + workstream.deadline);
    
    // Create objective
    const objective = await prisma.objective.create({
      data: {
        name: workstream.name,
        description: workstream.description,
        priority: workstream.priority,
        deadline,
        status: 'To Do',
        companyId: COMPANY_ID
      }
    });
    
    objectivesCreated.push(objective);
    console.log(`   ✅ Objective created (Priority ${workstream.priority}, Deadline: ${deadline.toISOString().split('T')[0]})`);
    
    // Create projects for this objective
    for (const proj of workstream.projects) {
      totalProjects++;
      
      // Calculate project deadline based on phase
      const projDeadline = new Date(baseDate);
      const phaseOffset = {
        1: 30,
        2: 90,
        3: 150,
        4: 210
      };
      projDeadline.setDate(projDeadline.getDate() + phaseOffset[proj.phase]);
      
      const project = await prisma.project.create({
        data: {
          name: proj.name,
          description: proj.desc,
          priority: workstream.priority,
          deadline: projDeadline,
          status: 'To Do',
          objectiveId: objective.id
        }
      });
      
      console.log(`      → Project: ${proj.name} (Phase ${proj.phase})`);
      
      // Create 3-5 tasks per project
      const taskCount = Math.floor(Math.random() * 3) + 3; // 3-5 tasks
      for (let i = 1; i <= taskCount; i++) {
        totalTasks++;
        
        const taskDeadline = new Date(projDeadline);
        taskDeadline.setDate(taskDeadline.getDate() - (taskCount - i) * 3);
        
        const assignee = proj.assignTo === 'benjamin' ? BENJAMIN_BROWN_ID : 'Doug/Harvey (AI)';
        
        await prisma.task.create({
          data: {
            title: `${proj.name} - Task ${i}`,
            description: `${proj.desc} - Step ${i}`,
            status: 'To Do',
            priority: workstream.priority,
            effortPoints: proj.effort,
            assignedTo: assignee,
            dueDate: taskDeadline,
            projectId: project.id
          }
        });
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ STRUCTURE CREATED!');
  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   Objectives (Workstreams): ${objectivesCreated.length}`);
  console.log(`   Projects: ${totalProjects}`);
  console.log(`   Tasks: ${totalTasks}`);
  console.log(`\n🔗 View in Zebi: https://zebi.app/workspace/${WORKSPACE_ID}`);
  
  return { objectivesCreated, totalProjects, totalTasks };
}

async function main() {
  try {
    await createStructure();
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
