const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';
const COMPANY_ID = '9530228c-c4d0-4820-9246-d71339653ceb'; // One Beyond

const OBJECTIVE_DATA = {
  title: 'Doug AI Automation Fully Operational',
  description: 'Set up all API integrations to enable Doug to run automated outbound sales, content marketing, pipeline tracking, and customer research - unlocking path to £100k/month revenue.',
  deadline: '2026-03-20',
  projects: [
    {
      name: 'Tier 1: Core Revenue Systems (START TODAY)',
      description: 'Critical integrations for outbound sales, demo booking, content distribution, and pipeline tracking. These 4 integrations unlock 80% of automation value.',
      tasks: [
        {
          title: 'Gmail API Access Setup',
          description: 'Set up Gmail API access to enable Doug to send cold emails, follow-ups, and nurture sequences automatically. Steps: (1) Go to console.cloud.google.com (2) Create project "Doug AI Assistant" (3) Enable Gmail API (4) Create OAuth 2.0 credentials OR generate App Password. Impact: 100+ personalized cold emails per week → 20-30 qualified conversations/month.',
          priority: 5,
          deadline: '2026-03-14'
        },
        {
          title: 'Google Calendar API Access',
          description: 'Enable Doug to check availability and book demo calls automatically when prospects reply interested. Steps: (1) Same Google Cloud project (2) Enable Google Calendar API (3) Use same OAuth credentials OR share Calendly link. Impact: Zero back-and-forth scheduling, demos booked instantly.',
          priority: 5,
          deadline: '2026-03-14'
        },
        {
          title: 'X (Twitter) API Access',
          description: 'Give Doug ability to post content, reply to threads, and build personal brand on X - driving inbound leads. Steps: (1) Go to developer.twitter.com/en/portal (2) Create App (3) Generate API Key, API Secret, Access Token, Access Token Secret (4) Set permissions to Read and Write. Impact: 3-5 posts/day, replies to relevant threads → 10-15 qualified leads/month at scale.',
          priority: 5,
          deadline: '2026-03-15'
        },
        {
          title: 'Google Sheets API Access (Pipeline Tracking)',
          description: 'Enable Doug to track sales pipeline, update deal values, log touchpoints, and create revenue dashboards in real-time. Steps: (1) Enable Google Sheets API (2) Create Service Account (3) Create CRM spreadsheet with columns: Prospect Name, Company, Email, Status, Last Contact, Next Action, Deal Value, Notes (4) Share sheet with service account email. Impact: Full visibility into sales pipeline, data-driven decisions.',
          priority: 5,
          deadline: '2026-03-15'
        }
      ]
    },
    {
      name: 'Tier 2: Scale Infrastructure (Week 2)',
      description: 'Email marketing, analytics, and customer research tools to scale from 10 to 100 customers.',
      tasks: [
        {
          title: 'Email Marketing Platform Setup',
          description: 'Set up automated email nurture sequences for the 8,000 contacts in Focus App/Taskbox database. Choose platform (ConvertKit/Loops/Mailchimp), get API key, import 8k contacts. Impact: 1-2% conversion = 80-160 paying users = £12-24k/month MRR.',
          priority: 4,
          deadline: '2026-03-18'
        },
        {
          title: 'Google Analytics + Mixpanel Setup',
          description: 'Track product metrics (signups, usage, conversions) to optimize growth and reduce churn. Set up GA4 for each app, optionally add Mixpanel for better SaaS tracking. Impact: Data-driven product decisions, higher conversion, lower churn.',
          priority: 4,
          deadline: '2026-03-19'
        },
        {
          title: 'Survey Tool Setup (Typeform/Tally)',
          description: 'Enable Doug to run customer research continuously - validating pricing, features, and messaging. Choose platform, get API access, create survey templates. Impact: Better product-market fit, higher conversion, accurate pricing.',
          priority: 4,
          deadline: '2026-03-20'
        }
      ]
    },
    {
      name: 'Tier 3: Growth Systems (Month 2)',
      description: 'Payment tracking, paid ads, and customer support integrations for scaling past £50k/month.',
      tasks: [
        {
          title: 'Stripe API Access (Revenue Tracking)',
          description: 'Give Doug real-time access to MRR, churn, failed payments, and revenue forecasts. Create Restricted Key with read-only access to Customers, Subscriptions, Invoices, Charges. Impact: Real-time financial visibility, faster decision-making.',
          priority: 3,
          deadline: '2026-03-25'
        },
        {
          title: 'Meta Ads API Setup',
          description: 'Enable Doug to run Facebook/Instagram ad campaigns targeting compliance officers and GRC consultants for Security App. Create Business Manager, add Ad Account, create System User, generate token. Set monthly budget limit. Impact: Predictable lead flow, paid acquisition channel validated.',
          priority: 3,
          deadline: '2026-03-27'
        },
        {
          title: 'Google Ads API Setup',
          description: 'Run Google Search ads for high-intent keywords like "ISO 42001 compliance software" and "AI governance platform". Request Developer Token, set up OAuth 2.0. Impact: High-intent leads, lower CAC than cold outbound.',
          priority: 3,
          deadline: '2026-03-28'
        },
        {
          title: 'Customer Support Tool Integration',
          description: 'Monitor customer support tickets to identify common issues and product improvement opportunities. Choose platform (Intercom/Crisp/Zendesk), get API access. Impact: Faster issue resolution, product roadmap informed by real user pain.',
          priority: 3,
          deadline: '2026-03-30'
        }
      ]
    },
    {
      name: 'Tier 4: Operations Polish (Optional)',
      description: 'Nice-to-have integrations for internal efficiency and collaboration.',
      tasks: [
        {
          title: 'Google Drive API Access',
          description: 'Enable Doug to store, organize, and share sales collateral, proposals, and documents. Create folder structure for Sales/Proposals, Sales/Collateral, Sales/Case-Studies. Impact: Professional collateral, faster proposal creation.',
          priority: 2,
          deadline: '2026-04-05'
        },
        {
          title: 'Notion/Linear API Access',
          description: 'If using Notion/Linear for project management, Doug can create tasks and update project status automatically. Get API token, set up integration. Impact: Tighter sales ↔ product loop, less manual admin.',
          priority: 2,
          deadline: '2026-04-10'
        },
        {
          title: 'WhatsApp Business API Access',
          description: 'Enable Doug to send product updates and answer support queries via WhatsApp. Apply for API access via Meta Business Account. Note: verification takes 1-2 weeks. Impact: Better customer communication, higher engagement (market-dependent).',
          priority: 1,
          deadline: '2026-04-15'
        }
      ]
    }
  ]
};

async function createObjectiveWithProjectsAndTasks() {
  try {
    console.log('🚀 Creating Doug AI Automation objective...\n');

    // 0. Get Inbox status
    const inboxStatus = await prisma.status.findFirst({
      where: {
        workspaceId: WORKSPACE_ID,
        name: 'Inbox'
      }
    });

    if (!inboxStatus) {
      throw new Error('Inbox status not found!');
    }

    console.log(`✅ Found Inbox status: ${inboxStatus.id}\n`);

    // 1. Create the objective
    const objective = await prisma.objective.create({
      data: {
        title: OBJECTIVE_DATA.title,
        description: OBJECTIVE_DATA.description,
        workspaceId: WORKSPACE_ID,
        companyId: COMPANY_ID,
        createdBy: USER_ID,
        objectiveType: 'operational',
        metricType: 'percentage',
        targetValue: 100,
        currentValue: 0,
        unit: '%',
        startDate: new Date('2026-03-13T00:00:00.000Z'),
        deadline: new Date(OBJECTIVE_DATA.deadline + 'T23:59:59.000Z'),
        status: 'active',
        progressPercent: 0,
        progressMode: 'auto'
      }
    });

    console.log(`✅ Created objective: ${objective.title}`);
    console.log(`   ID: ${objective.id}\n`);

    let totalProjects = 0;
    let totalTasks = 0;

    // 2. Create projects and tasks for each project
    for (const projectData of OBJECTIVE_DATA.projects) {
      const project = await prisma.project.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          objective: { connect: { id: objective.id } },
          company: { connect: { id: COMPANY_ID } },
          name: projectData.name,
          description: projectData.description,
          priority: 3,
          owner: USER_ID
        }
      });

      totalProjects++;
      console.log(`  📁 Created project: ${project.name}`);

      // 3. Create tasks for this project
      for (const taskData of projectData.tasks) {
        const task = await prisma.task.create({
          data: {
            workspace: { connect: { id: WORKSPACE_ID } },
            status: { connect: { id: inboxStatus.id } },
            project: { connect: { id: project.id } },
            objective: { connect: { id: objective.id } },
            company: { connect: { id: COMPANY_ID } },
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            assigneeId: USER_ID,
            createdBy: USER_ID,
            dueAt: taskData.deadline ? new Date(taskData.deadline + 'T23:59:59.000Z') : null
          }
        });

        totalTasks++;
        console.log(`    ✓ Created task: ${task.title}`);
      }

      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📊 Summary:`);
    console.log(`   • 1 objective created: "${objective.title}"`);
    console.log(`   • ${totalProjects} projects created`);
    console.log(`   • ${totalTasks} tasks created`);
    console.log(`   • Company: One Beyond`);
    console.log(`   • Deadline: ${OBJECTIVE_DATA.deadline}`);
    console.log('');
    console.log(`🔗 View in Zebi: https://zebi.app/companies/${COMPANY_ID}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error creating objective:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run it
createObjectiveWithProjectsAndTasks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
