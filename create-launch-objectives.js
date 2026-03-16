/**
 * Create comprehensive 30-day launch objectives for Zebi
 * 2026-03-07 to 2026-04-06
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';
const START_DATE = new Date('2026-03-07');
const END_DATE = new Date('2026-04-06');

// Outcome-focused objectives for 30-day launch
const objectives = [
  // 1. PRODUCT DEVELOPMENT & CORE FEATURES
  {
    title: 'Product ready for first paying customers',
    description: 'Complete all core v1 features needed for business owners to manage their execution system independently. This includes user/team management, email notifications, collaboration features, and essential AI capabilities. Without this foundation, we cannot onboard paying customers or generate revenue.',
    objectiveType: 'product',
    metricType: 'percentage',
    targetValue: 100,
    currentValue: 70, // Based on current progress
    unit: '%',
    startDate: START_DATE,
    deadline: new Date('2026-04-05'),
    priority: 5,
    status: 'active',
    checkFrequency: 'daily'
  },

  // 2. BRAND & POSITIONING
  {
    title: 'Brand positioned for overwhelmed business owners',
    description: 'Finalize brand identity, messaging framework, and value proposition that clearly speaks to non-technical, overwhelmed business owners (baby boomers, solopreneurs, 1-25 staff) who need clarity and time back. Strong positioning is critical to differentiate from broad work management tools and attract ideal customers.',
    objectiveType: 'brand',
    metricType: 'percentage',
    targetValue: 100,
    currentValue: 40,
    unit: '%',
    startDate: START_DATE,
    deadline: new Date('2026-03-20'),
    priority: 5,
    status: 'active',
    checkFrequency: 'weekly'
  },

  // 3. MARKETING FOUNDATION
  {
    title: 'Landing page converting visitors to early access signups',
    description: 'Launch homepage that clearly communicates Zebi\'s value proposition ("A simple AI-powered execution system for overwhelmed business owners") and converts visitors to early access signups. This is the primary channel for lead generation and must be live before any outbound campaigns.',
    objectiveType: 'marketing',
    metricType: 'count',
    targetValue: 1,
    currentValue: 0,
    unit: 'page',
    startDate: START_DATE,
    deadline: new Date('2026-03-25'),
    priority: 5,
    status: 'active',
    checkFrequency: 'daily'
  },

  // 4. SALES STRATEGY
  {
    title: 'Sales materials ready to close first customers',
    description: 'Finalize pricing (£49/£149/£299 tiers), create pitch deck, one-pagers, and demo environment that sales team can use to close first paying customers. Without clear sales materials, we cannot effectively convert interested leads or justify pricing.',
    objectiveType: 'sales',
    metricType: 'percentage',
    targetValue: 100,
    currentValue: 30, // Pricing exists but materials incomplete
    unit: '%',
    startDate: START_DATE,
    deadline: new Date('2026-03-28'),
    priority: 4,
    status: 'active',
    checkFrequency: 'weekly'
  },

  // 5. OPERATIONS
  {
    title: 'Customer onboarding enables self-service success',
    description: 'Build complete onboarding flow, support system, and documentation that enables new customers to get value from Zebi within 30 minutes without hand-holding. Poor onboarding leads to churn; great onboarding creates advocates. Target: customers can create their first goal and tasks independently.',
    objectiveType: 'operations',
    metricType: 'percentage',
    targetValue: 100,
    currentValue: 20,
    unit: '%',
    startDate: START_DATE,
    deadline: new Date('2026-04-02'),
    priority: 4,
    status: 'active',
    checkFrequency: 'weekly'
  },

  // 6. LEAD GENERATION & OUTREACH
  {
    title: '100 qualified leads engaged and interested',
    description: 'Segment 8,000-contact database, launch outbound campaign targeting overwhelmed business owners, and secure 100 qualified leads who express clear interest in early access. This pipeline is critical for beta testing and first paying customers. Focus on ideal customer profile: non-technical, 1-25 staff, struggling with execution.',
    objectiveType: 'leadgen',
    metricType: 'count',
    targetValue: 100,
    currentValue: 0,
    unit: 'leads',
    startDate: new Date('2026-03-20'), // After brand/marketing foundation
    deadline: END_DATE,
    priority: 5,
    status: 'active',
    checkFrequency: 'daily'
  },

  // 7. LAUNCH READINESS
  {
    title: '10 beta customers actively using product daily',
    description: 'Recruit, onboard, and activate 10 beta customers from target segment who use Zebi daily to manage their business execution. Their feedback validates product-market fit, identifies critical bugs, and provides testimonials for launch. Beta customers must represent ideal customer profile (overwhelmed business owners, not tech-savvy).',
    objectiveType: 'launch',
    metricType: 'count',
    targetValue: 10,
    currentValue: 0,
    unit: 'customers',
    startDate: new Date('2026-03-28'), // After product ready
    deadline: END_DATE,
    priority: 5,
    status: 'active',
    checkFrequency: 'daily'
  },

  // 8. PRODUCT STABILITY (Additional critical objective)
  {
    title: 'Product stable with zero critical bugs',
    description: 'Achieve product stability with zero critical bugs (data loss, auth failures, RLS breaches) and <5 minor bugs. Product stability directly impacts customer trust and retention. One critical bug during launch can destroy reputation with early adopters. Target: 7 consecutive days with zero critical bugs reported.',
    objectiveType: 'product',
    metricType: 'count',
    targetValue: 0,
    currentValue: 2, // Assume some critical bugs exist
    unit: 'bugs',
    startDate: START_DATE,
    deadline: new Date('2026-04-01'),
    priority: 5,
    status: 'active',
    checkFrequency: 'daily'
  },

  // 9. EARLY REVENUE (Launch outcome)
  {
    title: '£5,000 MRR from first paying customers',
    description: 'Convert beta customers and early leads into £5,000 Monthly Recurring Revenue by end of 30 days. This validates that customers see enough value to pay for Zebi and proves business viability. Revenue target based on: 10-20 customers × £49-£299/month average. First revenue is the ultimate validation of product-market fit.',
    objectiveType: 'sales',
    metricType: 'currency',
    targetValue: 5000,
    currentValue: 0,
    unit: '£',
    startDate: new Date('2026-03-28'), // After sales materials ready
    deadline: END_DATE,
    priority: 4,
    status: 'active',
    checkFrequency: 'daily'
  }
];

async function createObjectives() {
  console.log('🚀 Creating 30-day launch objectives for Zebi...\n');
  console.log(`Workspace: ${WORKSPACE_ID}`);
  console.log(`Timeline: ${START_DATE.toISOString().split('T')[0]} to ${END_DATE.toISOString().split('T')[0]}`);
  console.log(`Total objectives: ${objectives.length}\n`);

  const created = [];
  const errors = [];

  for (const obj of objectives) {
    try {
      const result = await prisma.objective.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          title: obj.title,
          description: obj.description,
          objectiveType: obj.objectiveType,
          metricType: obj.metricType,
          targetValue: obj.targetValue,
          currentValue: obj.currentValue,
          unit: obj.unit,
          startDate: obj.startDate,
          deadline: obj.deadline,
          status: obj.status,
          priority: obj.priority,
          checkFrequency: obj.checkFrequency,
          createdBy: USER_ID,
          progressPercent: obj.currentValue > 0 ? (obj.currentValue / obj.targetValue) * 100 : 0
        }
      });

      created.push({
        id: result.id,
        title: result.title,
        type: result.objectiveType,
        priority: result.priority,
        deadline: result.deadline.toISOString().split('T')[0]
      });

      console.log(`✅ Created: ${result.title}`);
      console.log(`   ID: ${result.id}`);
      console.log(`   Type: ${result.objectiveType} | Priority: ${result.priority}/5`);
      console.log(`   Target: ${result.targetValue}${result.unit} | Deadline: ${result.deadline.toISOString().split('T')[0]}`);
      console.log('');

    } catch (error) {
      errors.push({ title: obj.title, error: error.message });
      console.error(`❌ Failed to create: ${obj.title}`);
      console.error(`   Error: ${error.message}\n`);
    }
  }

  console.log('\n📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully created: ${created.length}`);
  console.log(`❌ Failed: ${errors.length}`);
  console.log('');

  if (created.length > 0) {
    console.log('✅ CREATED OBJECTIVES:');
    console.log('');
    
    const byType = created.reduce((acc, obj) => {
      if (!acc[obj.type]) acc[obj.type] = [];
      acc[obj.type].push(obj);
      return acc;
    }, {});

    for (const [type, objs] of Object.entries(byType)) {
      console.log(`${type.toUpperCase()}:`);
      objs.forEach(obj => {
        console.log(`  - ${obj.title}`);
        console.log(`    Priority: ${obj.priority}/5 | Deadline: ${obj.deadline} | ID: ${obj.id}`);
      });
      console.log('');
    }
  }

  if (errors.length > 0) {
    console.log('❌ ERRORS:');
    errors.forEach(err => {
      console.log(`  - ${err.title}: ${err.error}`);
    });
  }

  return { created, errors };
}

// Run the script
createObjectives()
  .then(({ created, errors }) => {
    console.log('\n✨ Done!');
    console.log(`\nNext steps:`);
    console.log(`1. Review objectives in Zebi dashboard`);
    console.log(`2. Break down high-priority objectives into projects/tasks`);
    console.log(`3. Assign owners to each objective`);
    console.log(`4. Set up daily check-ins for critical objectives`);
    console.log(`\nDatabase: Supabase`);
    console.log(`Workspace ID: ${WORKSPACE_ID}`);
    
    process.exit(errors.length > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
