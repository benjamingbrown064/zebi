const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPANY_ID = '124804c1-0703-48ec-811b-754d80769e64';
const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';

// Helper to create ProseMirror nodes
const h = (level, text) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
const p = (text) => text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' };
const ul = (items) => ({ type: 'bulletList', content: items.map(t => ({ type: 'listItem', content: [p(t)] })) });
const doc = (c) => ({ type: 'doc', content: c });

async function createDocument(title, type, content) {
  console.log(`Creating: ${title}...`);
  const document = await prisma.document.create({
    data: {
      workspaceId: WORKSPACE_ID,
      companyId: COMPANY_ID,
      title,
      documentType: type,
      contentRich: content,
      version: 1,
      createdBy: USER_ID
    }
  });
  
  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      version: 1,
      contentRich: content,
      createdBy: USER_ID
    }
  });
  
  console.log(`✅ Created: ${title} (${document.id})\n`);
  return document;
}

async function main() {
  const docs = [];
  
  // Doc 1: Technical Spec
  docs.push(await createDocument(
    'AI-QEF Technical Specification',
    'technical-spec',
    doc([
      h(1, 'AI-QEF Technical Specification'),
      p(''),
      h(2, 'System Architecture Overview'),
      p('AI-QEF is built as a modern, cloud-native platform designed for scalability, security, and real-time data processing. The architecture follows a microservices pattern with clear separation between assessment, analysis, and reporting layers.'),
      h(2, 'Six Governance Modules'),
      p('The platform provides six core governance modules that assess AI and data maturity:'),
      ul([
        '1. Strategic AI Positioning - Measures alignment between AI initiatives and business strategy',
        '2. Data Governance & Single Source of Truth - Evaluates data ownership and system fragmentation',
        '3. AI Risk & Compliance - Identifies governance gaps and regulatory exposure',
        '4. Data Quality Analysis - Assesses data integrity and usability',
        '5. Operational Efficiency & Financial Leakage - Quantifies financial impact of inefficiencies',
        '6. Governance Monitoring - Provides ongoing tracking of governance health'
      ]),
      h(2, 'Technology Stack'),
      ul([
        'Next.js 15 - Frontend framework',
        'Supabase - Backend infrastructure and authentication',
        'PostgreSQL - Primary database',
        'Claude Sonnet 4 - AI insights engine',
        'OpenAI API - Supplementary AI analysis',
        'Vercel - Cloud hosting platform'
      ]),
      h(2, 'Assessment Framework'),
      p('The assessment framework uses structured questionnaires across all six modules, with automated scoring algorithms and AI-generated insights.'),
      h(2, 'Financial Modelling Engine'),
      p('A core differentiator is the financial modelling engine that quantifies governance gaps into monetary terms:'),
      ul([
        'Revenue leakage calculator',
        'Cost of poor data model',
        'Billable time recovery analysis',
        'ROI projection for remediation',
        'Risk exposure valuation'
      ]),
      h(2, 'Data Processing Pipeline'),
      p('The system processes assessments through multiple stages: data validation, module scoring, financial analysis, AI insight generation, and report assembly.')
    ])
  ));
  
  // Doc 2: Product Overview
  docs.push(await createDocument(
    'AI-QEF Product Overview',
    'product-overview',
    doc([
      h(1, 'AI-QEF Product Overview'),
      p(''),
      h(2, 'Product Introduction'),
      p('AI-QEF is a governance and financial exposure platform that helps organizations assess, manage, and monetize their AI and data maturity. It combines structured assessment frameworks, automated scoring, financial modelling, and AI-generated insights.'),
      h(2, 'Core Value Proposition'),
      p('AI-QEF links AI governance directly to data governance and financial performance, enabling organizations to quantify financial exposure from governance gaps and build structured remediation roadmaps.'),
      h(2, 'Core Modules'),
      h(3, 'Strategic AI Positioning'),
      p('Assesses how well AI initiatives align with business strategy.'),
      p('Key outputs: AI Readiness Index, Strategic Alignment Score, Value Potential Estimate'),
      h(3, 'Data Governance & Single Source of Truth'),
      p('Evaluates data ownership, integration quality, and system fragmentation.'),
      p('Key outputs: SoT Confidence Score, Data Integrity Heatmap, Master Data Risk Rating'),
      h(3, 'AI Risk & Compliance'),
      p('Identifies governance gaps and regulatory exposure.'),
      p('Key outputs: AI Risk Exposure Score, Compliance Priority Matrix, Governance Gap Analysis'),
      h(3, 'Data Quality Analysis'),
      p('Assesses data integrity, completeness, and usability.'),
      p('Key outputs: Data Quality Score, Cost of Poor Data Estimate, Remediation Effort Estimate'),
      h(3, 'Operational Efficiency & Financial Leakage'),
      p('Quantifies financial impact of inefficiencies.'),
      p('Key outputs: Revenue Leakage Estimate, Cost Saving Potential, Automation Opportunity Map'),
      h(3, 'Governance Monitoring'),
      p('Provides ongoing tracking of governance health.'),
      p('Key outputs: Governance Health Score, Risk Trend Charts, Executive Dashboards'),
      h(2, 'Commercial Model'),
      p('Three-phase model creates natural revenue expansion:'),
      ul([
        'Phase 1: Discovery Engagements (£5k-£25k)',
        'Phase 2: Remediation Programmes (£10k-£100k)',
        'Phase 3: Managed Governance Subscriptions (£99-£299/month)'
      ])
    ])
  ));
  
  // Doc 3: USP Overview
  docs.push(await createDocument(
    'AI-QEF Unique Selling Propositions',
    'usp-overview',
    doc([
      h(1, 'AI-QEF Unique Selling Propositions'),
      p(''),
      h(2, 'Core Positioning Statement'),
      p('AI governance requires data governance. AI-QEF is the only platform that connects AI maturity directly to data governance quality and translates governance gaps into measurable financial outcomes.'),
      h(2, 'Key Differentiators'),
      h(3, '1. Financial Exposure Quantification'),
      p('Unlike traditional governance tools that focus on compliance checklists, AI-QEF quantifies the financial impact of governance gaps through revenue leakage calculators, cost of poor data models, and ROI projections.'),
      h(3, '2. AI Governance + Data Governance Integration'),
      p('Recognizes that AI governance is impossible without strong data governance foundations. Provides integrated assessment across AI strategy, data quality, and operational efficiency.'),
      h(3, '3. AI-Generated Insights'),
      p('Uses Claude Sonnet 4 and OpenAI to generate contextual, actionable insights with automatic prioritization and executive summaries in business language.'),
      h(3, '4. Consultant-Led Platform Model'),
      p('Combines consultant expertise with platform scalability, ensuring quality inputs and strategic value while maintaining the ability to scale.'),
      h(3, '5. Three-Phase Commercial Model'),
      p('Creates natural progression from consulting engagement to recurring subscription revenue, improving valuation and creating expansion opportunities.'),
      h(3, '6. Operational Efficiency Focus'),
      p('Identifies operational inefficiencies that cost money, not just compliance gaps. Focuses on making money and saving money.'),
      h(2, 'Competitive Positioning'),
      h(3, 'vs Traditional Governance Platforms'),
      ul([
        'They focus on compliance checklists. We focus on financial outcomes.',
        'They assess governance in isolation. We connect AI governance to data governance.',
        'They produce static reports. We generate AI-powered insights.',
        'They sell software. We deliver consulting that transitions to subscriptions.'
      ]),
      h(2, 'Link Between AI Governance and Financial Performance'),
      p('AI-QEF makes the business case for AI governance by quantifying financial impact across five areas:'),
      ul([
        'Revenue leakage from inaccurate data and missed opportunities',
        'Cost of poor data quality from wasted time and rework',
        'Operational inefficiency from manual processes',
        'Regulatory and compliance risk exposure',
        'Missed AI value from poor data foundations'
      ])
    ])
  ));
  
  // Doc 4: Marketing Overview
  docs.push(await createDocument(
    'AI-QEF Marketing Overview',
    'marketing-overview',
    doc([
      h(1, 'AI-QEF Marketing Overview'),
      p(''),
      h(2, 'Market Opportunity'),
      p('The AI governance market is estimated at $5B-$10B globally, driven by rapid AI adoption, regulatory pressure, and recognition that AI governance requires data governance foundations.'),
      h(2, 'Target Customer Segments'),
      h(3, '1. Mid-to-Large Enterprises Deploying AI'),
      p('Organizations with 200-5000+ employees in early AI deployment phase, facing challenges with data quality and governance frameworks.'),
      p('Value proposition: Assess AI readiness, identify governance gaps, build roadmap, quantify ROI'),
      h(3, '2. Professional Services Firms'),
      p('Law firms, advisory firms, consultancies losing billable time to data issues and experiencing revenue leakage from billing errors.'),
      p('Value proposition: Quantify billable hours lost, calculate revenue leakage, identify automation opportunities'),
      h(3, '3. Regulated Industries'),
      p('Financial services, healthcare, public sector organizations under compliance pressure with risk of regulatory fines.'),
      p('Value proposition: Assess compliance gaps, quantify regulatory risk, build audit-ready framework'),
      h(2, 'Market Positioning'),
      p('Primary positioning: "AI governance that pays for itself"'),
      p('Secondary positioning: "Data governance is AI governance"'),
      h(2, 'Messaging Strategy'),
      p('Problem: Organizations deploying AI without governance, poor data quality undermining reliability, traditional tools focus on compliance not outcomes.'),
      p('Solution: AI-QEF assesses maturity, quantifies financial exposure, generates insights, provides monitoring.'),
      p('Outcome: Understand financial cost, justify investment with ROI, prioritize initiatives, governance becomes value driver.'),
      h(2, 'Go-to-Market Strategy'),
      ul([
        'Phase 1 (Months 1-6): Consultant-led pilot engagements',
        'Phase 2 (Months 3-12): Partnership development',
        'Phase 3 (Months 6-18): Direct sales and marketing',
        'Phase 4 (Months 12-24): Platform-led growth'
      ]),
      h(2, 'Customer Acquisition by Segment'),
      p('Enterprises: Thought leadership, webinars, targeted LinkedIn outreach, partnerships'),
      p('Professional Services: Case studies, direct outreach, industry associations, proof of value'),
      p('Regulated Industries: Whitepapers, compliance events, partnerships, regulatory risk assessment'),
      h(2, 'Pricing Strategy'),
      ul([
        'Discovery: £5k-£50k depending on organization size',
        'Remediation: £10k-£100k+ project-based',
        'Subscriptions: £99-£299/month tiered model'
      ])
    ])
  ));
  
  // Doc 5: Launch Plan
  docs.push(await createDocument(
    'AI-QEF Launch Plan',
    'launch-plan',
    doc([
      h(1, 'AI-QEF Launch Plan'),
      p(''),
      h(2, 'Launch Objective'),
      p('Successfully bring AI-QEF to market through phased approach. Target: £2.5k/month by end of Q1 2026, scaling to £10k/month by end of Q4 2026.'),
      h(2, 'Pre-Launch Activities (Weeks 1-4)'),
      h(3, '1. Product Finalization'),
      ul([
        'Complete all six assessment modules',
        'Finalize scoring algorithms and financial models',
        'Test AI insight generation',
        'Develop report templates',
        'Build executive dashboard',
        'Complete security audit'
      ]),
      h(3, '2. Sales Enablement'),
      ul([
        'Create sales deck',
        'Develop demo environment',
        'Prepare sample reports',
        'Create segment overviews',
        'Build ROI calculator',
        'Develop FAQ document'
      ]),
      h(3, '3. Marketing Materials'),
      ul([
        'Design brand identity',
        'Create website landing page',
        'Develop introductory video',
        'Write blog posts',
        'Create LinkedIn content calendar',
        'Design lead magnets',
        'Prepare press release'
      ]),
      h(2, 'Launch Timeline'),
      h(3, 'Month 1: Soft Launch (March 2026)'),
      p('Focus: Deliver first pilot engagements and gather feedback'),
      p('Success metrics: 2 pilots delivered, 4+ satisfaction, 1 client commits to remediation'),
      h(3, 'Month 2: Expansion (April 2026)'),
      p('Focus: Scale to 5 total pilots and begin partner outreach'),
      p('Success metrics: 5 total pilots, 2 remediation commitments, 2 case studies, webinar with 10+ attendees'),
      h(3, 'Month 3: Validation (May 2026)'),
      p('Focus: Deliver remediation programmes and validate commercial model'),
      p('Success metrics: 8+ total assessments, 2 remediation programmes, 1 partner certified, £2.5k/month achieved'),
      h(3, 'Months 4-6: Scale (June-August 2026)'),
      p('Deliver 10+ additional assessments, complete 2 remediation programmes, onboard 2 partners, achieve £5k/month'),
      h(3, 'Months 7-9: Subscription Launch (September-November 2026)'),
      p('Launch subscription tiers, transition 5 clients to subscriptions, develop integrations, achieve £7.5k/month'),
      h(3, 'Months 10-12: Optimization (December 2026-February 2027)'),
      p('Achieve 20+ subscriptions, deliver 10+ assessments, complete 5 remediation programmes, achieve £10k/month target'),
      h(2, 'Market Entry Strategy'),
      p('Phase 1 (Months 1-6): UK market only - easier delivery, strong regulatory environment'),
      p('Phase 2 (Months 7-12): UK + Europe expansion via partners'),
      p('Phase 3 (Year 2): US expansion with established partner network'),
      h(2, 'Partnership Approach'),
      h(3, 'Partner Types'),
      ul([
        'Delivery Partners: Data strategy consultancies, AI consulting firms',
        'Technology Partners: CRM vendors, data quality tools, GRC platforms',
        'Referral Partners: Legal firms, compliance consultancies'
      ]),
      h(3, 'Partner Programme'),
      ul([
        'Certification training (2-day programme)',
        'Revenue share: 30% discovery, 20% remediation, 10% subscriptions',
        'Partner portal with enablement resources',
        'Quarterly partner summits',
        'White-label option for larger partners'
      ]),
      h(2, 'Success Metrics'),
      h(3, 'Revenue Targets'),
      ul([
        'Month 3: £2.5k/month',
        'Month 6: £5k/month',
        'Month 9: £7.5k/month',
        'Month 12: £10k/month'
      ]),
      h(3, 'Engagement Metrics'),
      ul([
        '50+ discovery engagements in Year 1',
        '15+ remediation programmes in Year 1',
        '20+ subscriptions by end of Year 1',
        '5 certified partners by end of Year 1'
      ]),
      h(3, 'Customer Success Metrics'),
      ul([
        'Customer satisfaction: 4.5+/5',
        'Discovery-to-remediation conversion: 40%+',
        'Remediation-to-subscription conversion: 50%+',
        'Average financial impact: £100k+ per client',
        'NPS: 50+',
        'Referrals: 20%+ of new clients by Month 12'
      ])
    ])
  ));
  
  console.log('\n========================================');
  console.log('ALL DOCUMENTS CREATED SUCCESSFULLY');
  console.log('========================================\n');
  console.log('Summary:');
  docs.forEach((d, i) => {
    console.log(`${i+1}. ${d.title}`);
    console.log(`   ID: ${d.id}`);
    console.log(`   Type: ${d.documentType}\n`);
  });
  console.log('✅ All 5 documents created');
  console.log('✅ All linked to Security App company');
  console.log('✅ All viewable from company profile');
}

main()
  .catch(e => {console.error(e); process.exit(1);})
  .finally(() => prisma.$disconnect());
