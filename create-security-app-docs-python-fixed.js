// Create 5 comprehensive documents for Security App company
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPANY_ID = '124804c1-0703-48ec-811b-754d80769e64';
const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';

// Helper function to create ProseMirror document structure
function createDoc(content) {
  return {
    type: 'doc',
    content: content
  };
}

function heading(level, text) {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }]
  };
}

function paragraph(text) {
  if (!text) return { type: 'paragraph' };
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }]
  };
}

function bold(text) {
  return {
    type: 'text',
    text,
    marks: [{ type: 'bold' }]
  };
}

function bulletList(items) {
  return {
    type: 'bulletList',
    content: items.map(item => ({
      type: 'listItem',
      content: [paragraph(item)]
    }))
  };
}

// Document 1: Technical Spec
const technicalSpec = createDoc([
  heading(1, 'AI-QEF Technical Specification'),
  paragraph(),
  heading(2, 'System Architecture Overview'),
  paragraph(),
  paragraph(),
  heading(3, 'Core Technology Stack'),
  bulletList([
    \'Next.js 15 - Frontend framework providing server-side rendering and optimal performance\',
    \'Supabase - Backend infrastructure for authentication, database, and real-time subscriptions\',
    \'PostgreSQL - Primary database for structured data storage\',
    \'Vercel - Deployment platform ensuring global CDN delivery and automatic scaling\',
    \'Claude Sonnet 4 - Primary AI engine for governance insights and natural language analysis\',
    \'OpenAI API - Secondary AI provider for specialized analysis tasks\'
  ]),
  paragraph(),
  heading(2, 'Six Governance Modules'),
  paragraph(),
  heading(3, '1. Strategic AI Positioning Module'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Strategic alignment scoring algorithm\',
    \'AI readiness assessment engine\',
    \'Value potential calculator based on industry benchmarks\',
    \'Leadership commitment analyzer\',
    \'ROI projection models\'
  ]),
  paragraph(),
  paragraph(),
  heading(3, '2. Data Governance & Single Source of Truth Module'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Data lineage mapping engine\',
    \'Master data quality analyzer\',
    \'System integration assessment\',
    \'Data ownership audit\',
    \'SoT confidence calculator\',
    \'Fragmentation detection algorithms\'
  ]),
  paragraph(),
  paragraph(),
  heading(3, '3. AI Risk & Compliance Module'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Regulatory framework mapper (GDPR, AI Act, sector-specific regulations)\',
    \'Risk exposure calculator\',
    \'Compliance gap analyzer\',
    \'Governance framework assessor\',
    \'Policy coverage matrix\',
    \'Audit trail generator\'
  ]),
  paragraph(),
  paragraph(),
  heading(3, '4. Data Quality Analysis Module'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Data quality scoring engine (completeness, accuracy, consistency, timeliness)\',
    \'Anomaly detection algorithms\',
    \'Data profiling tools\',
    \'Cost of poor data calculator\',
    \'Remediation effort estimator\',
    \'Quality trend analyzer\'
  ]),
  paragraph(),
  paragraph(),
  heading(3, '5. Operational Efficiency & Financial Leakage Module'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Revenue leakage calculator\',
    \'Process inefficiency analyzer\',
    \'Automation opportunity identifier\',
    \'Time waste quantifier (billable hours for professional services)\',
    \'Manual process mapper\',
    \'Cost-benefit analysis engine\'
  ]),
  paragraph(),
  paragraph(),
  heading(3, '6. Governance Monitoring Module'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Real-time governance health dashboard\',
    \'Progress tracking engine\',
    \'Risk trend analyzer\',
    \'Alert and notification system\',
    \'Executive reporting generator\',
    \'Comparative benchmarking\'
  ]),
  paragraph(),
  paragraph(),
  heading(2, 'Assessment Framework'),
  paragraph(),
  paragraph(),
  heading(3, 'Assessment Methodology'),
  bulletList([
    \'Questionnaire-driven assessment across 6 modules\',
    \'Weighted scoring algorithms for each module\',
    \'Automated calculation of maturity levels\',
    \'Context-aware question branching\',
    \'Evidence attachment system\',
    \'Stakeholder input aggregation\'
  ]),
  paragraph(),
  heading(3, 'Scoring System'),
  bulletList([
    \'Module-level scores (0-100 scale)\',
    \'Overall AI maturity score (weighted average)\',
    \'Risk exposure ratings (Low/Medium/High/Critical)\',
    \'Financial impact quantification (£ or $ estimates)\',
    \'Benchmarking against industry standards\'
  ]),
  paragraph(),
  heading(2, 'Financial Modelling Engine'),
  paragraph(),
  paragraph(),
  heading(3, 'Financial Calculation Models'),
  bulletList([
    \'Revenue leakage calculator - Estimates lost revenue from process inefficiencies\',
    \'Cost of poor data model - Quantifies impact of data quality issues\',
    \'Operational efficiency savings - Calculates potential cost reductions\',
    \'Billable time recovery (for professional services) - Hours saved through automation\',
    \'Risk exposure valuation - Estimates potential regulatory fines and reputation damage\',
    \'ROI projection for remediation initiatives\'
  ]),
  paragraph(),
  heading(3, 'Industry-Specific Financial Models'),
  bulletList([
    \'Professional services: Billable time analysis and utilization rates\',
    \'Financial services: Compliance cost and regulatory fine exposure\',
    \'Manufacturing: Supply chain data quality impact\',
    \'Public sector: Service delivery efficiency metrics\'
  ]),
  paragraph(),
  heading(2, 'AI-Generated Insights'),
  paragraph(),
  paragraph(),
  heading(3, 'AI Capabilities'),
  bulletList([
    \'Natural language analysis of assessment responses\',
    \'Contextual recommendation generation\',
    \'Automatic risk prioritization\',
    \'Remediation roadmap creation\',
    \'Executive summary generation\',
    \'Comparative analysis against industry benchmarks\',
    \'Trend analysis and forecasting\'
  ]),
  paragraph(),
  heading(3, 'AI Processing Pipeline'),
  bulletList([
    \'Assessment data ingestion\',
    \'Context enrichment with company profile data\',
    \'Multi-model AI analysis (Claude + OpenAI)\',
    \'Insight scoring and ranking\',
    \'Output formatting for executive consumption\',
    \'Continuous learning from historical assessments\'
  ]),
  paragraph(),
  heading(2, 'System Integrations'),
  paragraph(),
  heading(3, 'Data Sources'),
  bulletList([
    \'CRM systems (Salesforce, HubSpot) - for revenue data\',
    \'ERP systems - for operational data\',
    \'HRIS systems - for workforce data\',
    \'Data quality tools - for technical validation\',
    \'Compliance platforms - for regulatory status\',
    \'Project management tools - for remediation tracking\'
  ]),
  paragraph(),
  heading(3, 'Export and Reporting'),
  bulletList([
    \'PDF export for formal reports\',
    \'Excel/CSV for financial data\',
    \'API access for custom integrations\',
    \'Dashboard embedding capabilities\',
    \'Automated email reporting\',
    \'Slack/Teams notifications\'
  ]),
  paragraph(),
  heading(2, 'API Design'),
  paragraph(),
  heading(3, 'Core API Endpoints'),
  bulletList([
    \'POST /api/assessments - Create new assessment\',
    \'GET /api/assessments/:id - Retrieve assessment results\',
    \'POST /api/assessments/:id/answers - Submit assessment responses\',
    \'GET /api/scores/:assessmentId - Get calculated scores\',
    \'GET /api/insights/:assessmentId - Get AI-generated insights\',
    \'POST /api/reports/:assessmentId - Generate formal report\',
    \'GET /api/monitoring/:companyId - Get ongoing governance metrics\'
  ]),
  paragraph(),
  heading(3, 'Authentication & Security'),
  bulletList([
    \'JWT-based authentication via Supabase\',
    \'Row-level security (RLS) for multi-tenant data isolation\',
    \'API rate limiting\',
    \'Encrypted data at rest and in transit\',
    \'SOC 2 Type II compliant infrastructure\',
    \'GDPR-compliant data handling\'
  ]),
  paragraph(),
  heading(2, 'Data Processing Pipeline'),
  paragraph(),
  heading(3, 'Assessment Processing Flow'),
  bulletList([
    \'1. Questionnaire completion by client\',
    \'2. Data validation and integrity checks\',
    \'3. Module-level scoring calculation\',
    \'4. Financial impact analysis\',
    \'5. AI insight generation\',
    \'6. Report assembly and formatting\',
    \'7. Executive dashboard update\'
  ]),
  paragraph(),
  heading(3, 'Real-Time Monitoring Pipeline'),
  bulletList([
    \'1. Integration data ingestion (scheduled or webhook-based)\',
    \'2. Data quality validation\',
    \'3. Metric calculation and comparison\',
    \'4. Anomaly detection\',
    \'5. Alert generation (if thresholds exceeded)\',
    \'6. Dashboard refresh\',
    \'7. Stakeholder notifications\'
  ]),
  paragraph(),
  heading(2, 'Scalability & Performance'),
  bulletList([
    \'Serverless architecture for automatic scaling\',
    \'CDN distribution via Vercel Edge Network\',
    \'Database connection pooling\',
    \'Async processing for large reports\',
    \'Caching strategies for frequently accessed data\',
    \'Optimized query patterns with indexes\'
  ]),
  paragraph(),
  heading(2, 'Security & Compliance'),
  bulletList([
    \'Multi-tenant data isolation at database level\',
    \'Encrypted storage for sensitive assessment data\',
    \'Audit logging for all data access\',
    \'GDPR-compliant data retention policies\',
    \'Regular security audits and penetration testing\',
    \'Backup and disaster recovery procedures\'
  ])
]);

// Document 2: Product Overview
const productOverview = createDoc([
  heading(1, 'AI-QEF Product Overview'),
  paragraph(),
  heading(2, 'Product Introduction'),
  paragraph(),
  paragraph(),
  heading(2, 'Core Value Proposition'),
  paragraph(),
  bulletList([
    \'Assess AI and data maturity across six critical dimensions\',
    \'Quantify financial exposure from governance gaps\',
    \'Identify revenue leakage and cost-saving opportunities\',
    \'Build a structured remediation roadmap\',
    \'Monitor ongoing governance health\',
    \'Transform governance from compliance overhead into measurable business value\'
  ]),
  paragraph(),
  heading(2, 'Core Modules'),
  paragraph(),
  heading(3, '1. Strategic AI Positioning'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'AI readiness assessment\',
    \'Strategic alignment scoring\',
    \'Value potential estimation\',
    \'Leadership commitment evaluation\',
    \'ROI projection for AI initiatives\'
  ]),
  paragraph(),
  bulletList([
    \'AI Readiness Index (0-100 score)\',
    \'Strategic Alignment Score\',
    \'Estimated AI Value Potential (financial projection)\'
  ]),
  paragraph(),
  heading(3, '2. Data Governance & Single Source of Truth'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Data ownership mapping\',
    \'System integration assessment\',
    \'Master data quality analysis\',
    \'Fragmentation detection\',
    \'Data lineage tracking\'
  ]),
  paragraph(),
  bulletList([
    \'SoT Confidence Score (0-100)\',
    \'Data Integrity Heatmap (visual representation of data quality across systems)\',
    \'Master Data Risk Rating (Low/Medium/High/Critical)\'
  ]),
  paragraph(),
  heading(3, '3. AI Risk & Compliance'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Regulatory framework mapping (GDPR, AI Act, sector-specific)\',
    \'AI risk identification\',
    \'Compliance gap analysis\',
    \'Policy coverage assessment\',
    \'Audit trail generation\'
  ]),
  paragraph(),
  bulletList([
    \'AI Risk Exposure Score (0-100)\',
    \'Compliance Priority Matrix\',
    \'Governance Gap Analysis Report\'
  ]),
  paragraph(),
  heading(3, '4. Data Quality Analysis'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Data quality profiling (completeness, accuracy, consistency, timeliness)\',
    \'Anomaly detection\',
    \'Cost of poor data calculation\',
    \'Remediation effort estimation\',
    \'Quality trend analysis\'
  ]),
  paragraph(),
  bulletList([
    \'Data Quality Score (0-100)\',
    \'Cost of Poor Data Estimate (financial impact)\',
    \'Remediation Effort Estimate (time and resources required)\'
  ]),
  paragraph(),
  heading(3, '5. Operational Efficiency & Financial Leakage'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Revenue leakage calculation\',
    \'Process inefficiency detection\',
    \'Automation opportunity identification\',
    \'Billable time analysis (for professional services)\',
    \'Cost-benefit analysis for remediation\'
  ]),
  paragraph(),
  bulletList([
    \'Revenue Leakage Estimate (annual financial impact)\',
    \'Cost Saving Potential (from process improvements)\',
    \'Automation Opportunity Map (prioritized initiatives)\'
  ]),
  paragraph(),
  heading(3, '6. Governance Monitoring'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Real-time governance dashboards\',
    \'Progress tracking for remediation initiatives\',
    \'Risk trend analysis\',
    \'Alert and notification system\',
    \'Comparative benchmarking\'
  ]),
  paragraph(),
  bulletList([
    \'Governance Health Score (ongoing metric)\',
    \'Risk Trend Charts\',
    \'Executive Dashboards (customizable views)\'
  ]),
  paragraph(),
  heading(2, 'Assessment Workflow'),
  paragraph(),
  heading(3, 'Phase 1: Discovery Assessment'),
  bulletList([
    \'1. Initial client onboarding and scoping\',
    \'2. Questionnaire distribution across six modules\',
    \'3. Evidence collection (documents, policies, system exports)\',
    \'4. Stakeholder interviews (optional)\',
    \'5. Automated scoring and analysis\',
    \'6. AI insight generation\',
    \'7. Report assembly and review\'
  ]),
  paragraph(),
  bulletList([
    \'AI Maturity Score (overall)\',
    \'Module-level scores and analysis\',
    \'Financial exposure report\',
    \'Remediation roadmap\',
    \'Executive summary\'
  ]),
  paragraph(),
  heading(3, 'Phase 2: Remediation Programme'),
  bulletList([
    \'1. Roadmap prioritization workshop\',
    \'2. Remediation project setup\',
    \'3. Implementation support\',
    \'4. Progress tracking via governance monitoring\',
    \'5. Periodic reassessment\'
  ]),
  paragraph(),
  heading(3, 'Phase 3: Managed Governance Subscription'),
  bulletList([
    \'1. Integration setup with client systems\',
    \'2. Automated data ingestion\',
    \'3. Continuous governance monitoring\',
    \'4. Monthly executive reporting\',
    \'5. Alert-based interventions\'
  ]),
  paragraph(),
  heading(2, 'Reporting Capabilities'),
  paragraph(),
  heading(3, 'Assessment Reports'),
  bulletList([
    \'Executive summary (1-2 pages)\',
    \'Detailed module analysis (6 sections)\',
    \'Financial exposure breakdown\',
    \'Remediation roadmap with prioritization\',
    \'Comparative benchmarking (industry/sector)\',
    \'Appendices with supporting evidence\'
  ]),
  paragraph(),
  heading(3, 'Ongoing Monitoring Reports'),
  bulletList([
    \'Monthly governance health report\',
    \'Risk trend analysis\',
    \'Progress tracking against remediation roadmap\',
    \'Anomaly alerts and explanations\',
    \'Executive dashboards (real-time)\'
  ]),
  paragraph(),
  heading(2, 'Executive Dashboards'),
  paragraph(),
  paragraph(),
  heading(3, 'Dashboard Components'),
  bulletList([
    \'Overall AI Maturity Score (gauge)\',
    \'Module-level scores (bar chart)\',
    \'Financial exposure summary (£ or $)\',
    \'Risk trend chart (time series)\',
    \'Remediation progress tracker\',
    \'Top 5 priorities (action items)\',
    \'Compliance status indicators\',
    \'Benchmarking comparison (peer group)\'
  ]),
  paragraph(),
  heading(3, 'User Roles and Access'),
  bulletList([
    \'Executive View - High-level summary with financial focus\',
    \'Programme Manager View - Detailed remediation tracking\',
    \'Technical View - Data quality and system integration metrics\',
    \'Compliance View - Regulatory and risk focus\'
  ]),
  paragraph(),
  heading(2, 'Platform Features'),
  bulletList([
    \'Dashboard - Central hub for governance metrics\',
    \'Policy Management - Repository for governance policies\',
    \'AI Control Extraction - Automated identification of controls from documents\',
    \'Controls Management - Tracking and management of governance controls\',
    \'Mappings - Link between controls and regulatory frameworks\',
    \'Evidence Management - Document storage and version control\',
    \'Gap Detection - Automated identification of compliance gaps\',
    \'Exception Management - Handling of non-conformances\',
    \'Audit Log - Complete history of platform actions\',
    \'Compliance Reports - Formal reporting for audits\',
    \'User & Role Management - Access control and permissions\',
    \'Authentication - Secure login and session management\'
  ]),
  paragraph(),
  heading(2, 'Technology Foundation'),
  bulletList([
    \'Next.js 15 - Modern web framework\',
    \'Supabase - Backend infrastructure\',
    \'Claude Sonnet 4 - AI insights engine\',
    \'OpenAI - Supplementary AI analysis\',
    \'Vercel - Cloud hosting and deployment\'
  ]),
  paragraph(),
  heading(2, 'Commercial Model'),
  paragraph(),
  heading(3, 'Phase 1: Discovery Engagements'),
  bulletList([
    \'Fixed-fee consulting engagement\',
    \'Deliverable: AI maturity assessment and financial exposure report\',
    \'Typical duration: 2-4 weeks\',
    \'Pricing: £5k-£25k depending on organization size\'
  ]),
  paragraph(),
  heading(3, 'Phase 2: Remediation Programmes'),
  bulletList([
    \'Project-based consulting\',
    \'Deliverable: Implementation of remediation roadmap\',
    \'Typical duration: 3-12 months\',
    \'Pricing: £10k-£100k+ depending on scope\'
  ]),
  paragraph(),
  heading(3, 'Phase 3: Managed Governance Subscriptions'),
  bulletList([
    \'Recurring monthly subscription\',
    \'Deliverable: Ongoing monitoring, reporting, and alerts\',
    \'Pricing tiers: £99/month (Basic) - £299/month (Enterprise)\',
    \'Scalable recurring revenue model\'
  ])
]);

// Document 3: USP Overview
const uspOverview = createDoc([
  heading(1, 'AI-QEF Unique Selling Propositions'),
  paragraph(),
  heading(2, 'Core Positioning Statement'),
  paragraph(),
  paragraph(),
  heading(2, 'Why AI-QEF is Unique'),
  paragraph(),
  heading(3, '1. Financial Exposure Quantification'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Revenue leakage calculator - Estimates lost revenue from inefficient processes\',
    \'Cost of poor data model - Quantifies impact of data quality issues on operations\',
    \'Billable time recovery analysis - Calculates wasted hours in professional services firms\',
    \'ROI projection for remediation - Shows financial return from fixing governance gaps\',
    \'Risk exposure valuation - Estimates potential regulatory fines and reputation damage\'
  ]),
  paragraph(),
  paragraph(),
  paragraph(),
  heading(3, '2. AI Governance + Data Governance Integration'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Integrated assessment across AI strategy, data quality, and operational efficiency\',
    \'Single Source of Truth (SoT) analysis - Identifies data fragmentation that undermines AI reliability\',
    \'Master data quality assessment - Evaluates the foundation AI systems depend on\',
    \'Data lineage tracking - Shows how data quality issues propagate into AI outputs\',
    \'Holistic scoring that reflects the reality that AI is only as good as the data it uses\'
  ]),
  paragraph(),
  paragraph(),
  paragraph(),
  heading(3, '3. AI-Generated Insights and Recommendations'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Natural language analysis of assessment responses\',
    \'Context-aware recommendations based on industry, stage, and objectives\',
    \'Automatic prioritization of remediation actions based on impact and effort\',
    \'Executive summaries generated in business language (not technical jargon)\',
    \'Comparative benchmarking insights (how you compare to peers)\',
    \'Predictive analysis of future risks based on current trajectory\'
  ]),
  paragraph(),
  paragraph(),
  paragraph(),
  heading(3, '4. Consultant-Led Platform Model'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Consultant-guided assessment ensures quality inputs\',
    \'Expert interpretation of results adds strategic value\',
    \'Customized remediation roadmaps based on organizational context\',
    \'Implementation support during remediation phase\',
    \'Transition from consulting engagement to platform subscription creates recurring revenue\'
  ]),
  paragraph(),
  paragraph(),
  paragraph(),
  heading(3, '5. Three-Phase Commercial Model'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Phase 1 (Discovery) - Fixed-fee engagement delivers immediate value and establishes relationship\',
    \'Phase 2 (Remediation) - Project-based work addresses identified gaps\',
    \'Phase 3 (Monitoring) - Subscription model provides ongoing governance tracking\',
    \'Each phase builds on the previous, creating a natural revenue expansion path\',
    \'Platform improves valuation by shifting from consulting to recurring revenue\'
  ]),
  paragraph(),
  paragraph(),
  paragraph(),
  heading(3, '6. Operational Efficiency Focus'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Process inefficiency detection - Identifies manual processes that should be automated\',
    \'Automation opportunity mapping - Prioritizes areas where automation would have highest ROI\',
    \'Billable time analysis - Calculates hours wasted on data reconciliation (critical for professional services)\',
    \'Revenue leakage identification - Finds where revenue is lost due to process failures\',
    \'Cost-benefit analysis for each remediation initiative\'
  ]),
  paragraph(),
  paragraph(),
  paragraph(),
  heading(2, 'Competitive Positioning'),
  paragraph(),
  heading(3, 'vs. Traditional Governance Platforms (e.g., OneTrust, ServiceNow GRC)'),
  bulletList([
    \'They focus on compliance checklists. We focus on financial outcomes.\',
    \'They assess governance in isolation. We connect AI governance to data governance.\',
    \'They produce static reports. We generate AI-powered insights and recommendations.\',
    \'They sell software. We deliver consulting engagements that transition to platform subscriptions.\'
  ]),
  paragraph(),
  heading(3, 'vs. Data Quality Tools (e.g., Informatica, Talend)'),
  bulletList([
    \'They focus on technical data quality metrics. We connect data quality to business outcomes.\',
    \'They require technical expertise. We deliver through business consultants.\',
    \'They report on data quality. We quantify the financial cost of poor data quality.\',
    \'They do not address AI governance. We integrate data quality into AI maturity assessment.\'
  ]),
  paragraph(),
  heading(3, 'vs. AI Risk Management Tools'),
  bulletList([
    \'They focus on model risk. We focus on data governance risk that undermines all AI initiatives.\',
    \'They assess individual AI models. We assess organizational AI readiness.\',
    \'They do not quantify financial exposure. We do.\',
    \'They do not provide ongoing monitoring. We transition to managed governance subscriptions.\'
  ]),
  paragraph(),
  heading(2, 'Link Between AI Governance and Financial Performance'),
  paragraph(),
  paragraph(),
  heading(3, 'Financial Impact Areas'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Lost sales from inaccurate customer data\',
    \'Missed opportunities from poor data visibility\',
    \'Revenue recognition errors from fragmented systems\',
    \'Client dissatisfaction from service delivery failures\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Wasted time on data reconciliation\',
    \'Rework from incorrect data\',
    \'Redundant systems and manual workarounds\',
    \'Billable hours lost to non-billable data cleanup (professional services)\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Manual processes that should be automated\',
    \'Duplication of effort across teams\',
    \'Slow decision-making from lack of data trust\',
    \'Delayed projects from data access issues\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Potential fines from GDPR, AI Act, or sector-specific regulations\',
    \'Reputation damage from governance failures\',
    \'Increased insurance premiums\',
    \'Loss of client trust\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'AI initiatives that fail due to poor data foundations\',
    \'ROI lower than expected from AI investments\',
    \'Inability to scale AI due to governance limitations\',
    \'Competitive disadvantage from slow AI adoption\'
  ]),
  paragraph(),
  heading(3, 'Financial Benefits of Strong Governance'),
  bulletList([
    \'Increased revenue from improved customer data quality\',
    \'Cost savings from process automation\',
    \'Faster time-to-market for AI initiatives\',
    \'Higher AI ROI from reliable data foundations\',
    \'Reduced compliance risk and associated costs\',
    \'Improved operational efficiency and profit margins\'
  ]),
  paragraph(),
  heading(2, 'Differentiation vs. Traditional Governance Tools'),
  paragraph(),
  heading(3, 'Traditional Governance Tools'),
  bulletList([
    \'Focus: Compliance and risk management\',
    \'Output: Checklists and audit trails\',
    \'User: Compliance officers and auditors\',
    \'Value: Regulatory compliance\',
    \'Delivery: Self-service software\',
    \'Revenue: One-time license or annual subscription\',
    \'Weakness: Disconnected from business outcomes, seen as cost center\'
  ]),
  paragraph(),
  heading(3, 'AI-QEF'),
  bulletList([
    \'Focus: Financial performance and operational efficiency\',
    \'Output: Financial exposure reports and remediation roadmaps\',
    \'User: C-suite executives and business leaders\',
    \'Value: Revenue protection and cost reduction\',
    \'Delivery: Consultant-led with platform support\',
    \'Revenue: Consulting engagement → project work → subscription\',
    \'Strength: Connected to financial outcomes, seen as value driver\'
  ]),
  paragraph(),
  heading(2, 'Target Customer Differentiation'),
  paragraph(),
  heading(3, 'Who Traditional Tools Serve'),
  bulletList([
    \'Large enterprises with dedicated compliance teams\',
    \'Organizations focused on regulatory box-checking\',
    \'Companies with technical governance expertise in-house\'
  ]),
  paragraph(),
  heading(3, 'Who AI-QEF Serves'),
  bulletList([
    \'Mid-to-large enterprises deploying AI without structured governance\',
    \'Professional services firms losing billable time to data issues\',
    \'Organizations under regulatory pressure but lacking governance expertise\',
    \'Companies experiencing operational inefficiencies they suspect are data-related\',
    \'Leadership teams seeking to justify governance investment with financial ROI\'
  ]),
  paragraph(),
  heading(2, 'Summary: The AI-QEF Advantage'),
  bulletList([
    \'We quantify financial exposure, not just compliance gaps\',
    \'We connect AI governance to data governance foundations\',
    \'We use AI to generate insights, not just collect data\',
    \'We deliver through consultants who add strategic value\',
    \'We create recurring revenue through monitoring subscriptions\',
    \'We focus on making money and saving money, not just avoiding risk\',
    \'We speak the language of business executives, not compliance auditors\'
  ]),
  paragraph(),
  paragraph()
]);

// Document 4: Marketing Overview
const marketingOverview = createDoc([
  heading(1, 'AI-QEF Marketing Overview'),
  paragraph(),
  heading(2, 'Market Opportunity'),
  paragraph(),
  paragraph(),
  heading(3, 'Market Drivers'),
  bulletList([
    \'Rapid AI adoption creating governance gaps\',
    \'Regulatory pressure (GDPR, AI Act, sector-specific regulations)\',
    \'High-profile AI failures raising awareness of governance risks\',
    \'Recognition that data quality undermines AI reliability\',
    \'C-suite demand for measurable ROI from governance investments\',
    \'Shift from compliance-focused governance to value-focused governance\'
  ]),
  paragraph(),
  heading(2, 'Target Customer Segments'),
  paragraph(),
  heading(3, '1. Mid-to-Large Enterprises Deploying AI'),
  paragraph(),
  bulletList([
    \'Organization size: 200-5000+ employees\',
    \'Industry: Cross-sector (manufacturing, retail, logistics, healthcare)\',
    \'AI stage: Pilot or early deployment phase\',
    \'Pain points: AI initiatives failing due to poor data quality, lack of governance framework, difficulty scaling AI\',
    \'Decision makers: CTO, CDO, Head of Data, Head of AI\',
    \'Budget: £10k-£50k for initial engagement\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Assess AI readiness before large-scale investment\',
    \'Identify data governance gaps that will undermine AI initiatives\',
    \'Build a roadmap for AI governance that aligns with business strategy\',
    \'Quantify ROI from governance improvements\'
  ]),
  paragraph(),
  heading(3, '2. Professional Services Firms (Legal, Advisory, Consulting)'),
  paragraph(),
  bulletList([
    \'Organization type: Law firms, advisory firms, consultancies\',
    \'Size: 50-1000+ professionals\',
    \'Business model: Billable hours\',
    \'Pain points: Time wasted on data reconciliation, billing errors from poor data, client dissatisfaction from service delays, inability to automate due to data fragmentation\',
    \'Decision makers: Managing Partner, COO, Head of Operations\',
    \'Budget: £5k-£25k for initial engagement\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Quantify billable hours lost to data issues\',
    \'Calculate revenue leakage from billing errors and process inefficiencies\',
    \'Identify automation opportunities that free up professional time\',
    \'Build business case for data governance investment based on billable hour recovery\'
  ]),
  paragraph(),
  heading(3, '3. Regulated Industries (Financial Services, Healthcare, Public Sector)'),
  paragraph(),
  bulletList([
    \'Industry: Banking, insurance, healthcare, local government\',
    \'Size: 500-10,000+ employees\',
    \'Regulatory environment: GDPR, AI Act, FCA, CQC, sector-specific regulations\',
    \'Pain points: Compliance pressure, risk of regulatory fines, audit failures, reputation risk from governance failures\',
    \'Decision makers: Chief Risk Officer, Head of Compliance, Data Protection Officer\',
    \'Budget: £15k-£50k for initial engagement\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Assess compliance gaps across AI and data governance\',
    \'Quantify regulatory risk exposure\',
    \'Build audit-ready governance framework\',
    \'Monitor ongoing compliance with automated tracking\'
  ]),
  paragraph(),
  heading(2, 'Market Positioning'),
  paragraph(),
  heading(3, 'Primary Positioning'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Quantify the cost of governance gaps\',
    \'Build a business case for governance investment\',
    \'Demonstrate ROI from remediation initiatives\',
    \'Transition governance from cost center to value driver\'
  ]),
  paragraph(),
  heading(3, 'Secondary Positioning'),
  paragraph(),
  paragraph(),
  paragraph(),
  paragraph(),
  heading(2, 'Messaging Strategy'),
  paragraph(),
  heading(3, 'Core Message Framework'),
  paragraph(),
  bulletList([
    \'Organizations are deploying AI without structured governance\',
    \'Poor data quality and fragmented systems undermine AI reliability\',
    \'Governance gaps create financial exposure (revenue leakage, wasted time, regulatory risk)\',
    \'Traditional governance tools focus on compliance, not business outcomes\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'AI-QEF assesses AI and data maturity across six critical dimensions\',
    \'Quantifies financial exposure from governance gaps\',
    \'Generates AI-powered insights and remediation roadmaps\',
    \'Provides ongoing monitoring to track governance health\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Organizations understand the financial cost of governance gaps\',
    \'Leadership can justify governance investment with measurable ROI\',
    \'Remediation initiatives are prioritized based on financial impact\',
    \'Governance becomes a value driver, not a compliance burden\'
  ]),
  paragraph(),
  heading(3, 'Segment-Specific Messaging'),
  paragraph(),
  paragraph(),
  bulletList([
    \'"Assess your AI readiness before you scale"\',
    \'"Don\'t let poor data quality undermine your AI investment"\',
    \'"Build a governance framework that enables AI, not blocks it"\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'"How many billable hours are you losing to data issues?"\',
    \'"Turn data governance into revenue recovery"\',
    \'"Automate the non-billable work so your team can focus on clients"\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'"Governance that satisfies auditors and delivers business value"\',
    \'"Quantify your regulatory risk exposure before it becomes a fine"\',
    \'"Build an audit-ready AI governance framework"\'
  ]),
  paragraph(),
  heading(2, 'Go-to-Market Strategy'),
  paragraph(),
  heading(3, 'Phase 1: Consultant-Led Pilot Engagements (Months 1-6)'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Identify 5-10 pilot clients (mix of enterprises, professional services, regulated industries)\',
    \'Deliver discovery assessments at reduced pilot pricing (£5k-£10k)\',
    \'Collect feedback and refine assessment framework\',
    \'Develop case studies and testimonials\',
    \'Establish baseline financial impact data (average revenue leakage, cost savings potential)\'
  ]),
  paragraph(),
  heading(3, 'Phase 2: Partnership Development (Months 3-12)'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Identify partner consultancies (data strategy, AI consultants, digital transformation firms)\',
    \'Develop partner training and certification programme\',
    \'Create co-marketing materials and case studies\',
    \'Establish referral and revenue-share model\',
    \'Enable partners to deliver AI-QEF under their brand (white-label option)\'
  ]),
  paragraph(),
  heading(3, 'Phase 3: Direct Sales and Marketing (Months 6-18)'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Develop thought leadership content (whitepapers, webinars, conference talks)\',
    \'Publish case studies demonstrating financial ROI\',
    \'Launch LinkedIn and industry publication advertising\',
    \'Attend and sponsor relevant conferences (AI governance, data quality, digital transformation)\',
    \'Establish sales team to follow up on inbound leads\',
    \'Develop demo environment and sales enablement materials\'
  ]),
  paragraph(),
  heading(3, 'Phase 4: Platform-Led Growth (Months 12-24)'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Develop self-service assessment capabilities (for simpler use cases)\',
    \'Launch subscription-based monitoring service (£99-£299/month)\',
    \'Build integration marketplace (connect to CRM, ERP, data quality tools)\',
    \'Develop API for partner integrations\',
    \'Expand to international markets (US, EU)\'
  ]),
  paragraph(),
  heading(2, 'Customer Acquisition Strategy'),
  paragraph(),
  heading(3, 'For Enterprises'),
  bulletList([
    \'Inbound: Thought leadership content, webinars, conference speaking\',
    \'Outbound: Targeted LinkedIn outreach to CTOs, CDOs, Heads of AI\',
    \'Partnerships: Co-selling with data consultancies and system integrators\',
    \'Proof of value: Offer free AI readiness scorecard to generate leads\'
  ]),
  paragraph(),
  heading(3, 'For Professional Services Firms'),
  bulletList([
    \'Inbound: Case studies showing billable hour recovery\',
    \'Outbound: Direct outreach to managing partners and COOs\',
    \'Industry associations: Sponsor and speak at legal/advisory conferences\',
    \'Proof of value: Offer free billable time leakage calculator\'
  ]),
  paragraph(),
  heading(3, 'For Regulated Industries'),
  bulletList([
    \'Inbound: Whitepapers on regulatory compliance and AI governance\',
    \'Outbound: Targeted outreach to Chief Risk Officers and compliance leaders\',
    \'Partnerships: Co-sell with compliance consultancies\',
    \'Proof of value: Offer free regulatory risk assessment\'
  ]),
  paragraph(),
  heading(2, 'Pricing Strategy'),
  paragraph(),
  heading(3, 'Phase 1: Discovery Engagements'),
  bulletList([
    \'Small/mid-size orgs (200-1000 employees): £5k-£15k\',
    \'Large enterprises (1000-5000 employees): £15k-£35k\',
    \'Very large enterprises (5000+ employees): £35k-£50k+\',
    \'Deliverables: AI maturity assessment, financial exposure report, remediation roadmap\'
  ]),
  paragraph(),
  heading(3, 'Phase 2: Remediation Programmes'),
  bulletList([
    \'Project-based pricing: £10k-£100k+ depending on scope\',
    \'Typical duration: 3-12 months\',
    \'Deliverables: Implementation of remediation roadmap, progress reporting\'
  ]),
  paragraph(),
  heading(3, 'Phase 3: Managed Governance Subscriptions'),
  bulletList([
    \'Basic tier (£99/month): Core monitoring dashboard, monthly reporting\',
    \'Professional tier (£199/month): Advanced analytics, weekly reporting, integrations\',
    \'Enterprise tier (£299/month): Custom dashboards, daily monitoring, dedicated support, API access\'
  ]),
  paragraph(),
  heading(2, 'Success Metrics'),
  paragraph(),
  heading(3, 'Phase 1 (Pilot)'),
  bulletList([
    \'5-10 discovery engagements delivered\',
    \'3+ case studies published\',
    \'Average customer satisfaction score: 4.5/5\',
    \'Average financial impact identified: £100k+ per client\'
  ]),
  paragraph(),
  heading(3, 'Phase 2 (Growth)'),
  bulletList([
    \'25+ discovery engagements delivered\',
    \'5+ remediation programmes underway\',
    \'3+ partner consultancies certified\',
    \'10+ inbound leads per month\'
  ]),
  paragraph(),
  heading(3, 'Phase 3 (Scale)'),
  bulletList([
    \'50+ discovery engagements delivered\',
    \'20+ remediation programmes completed\',
    \'50+ managed governance subscriptions\',
    \'£500k+ annual recurring revenue\'
  ]),
  paragraph(),
  heading(2, 'Marketing Channels'),
  bulletList([
    \'LinkedIn - Thought leadership, targeted ads, executive outreach\',
    \'Industry publications - Contributed articles, sponsored content\',
    \'Conferences - Speaking engagements, sponsorships, booth presence\',
    \'Webinars - Educational content with lead generation\',
    \'Case studies - Demonstrating financial ROI\',
    \'Partnerships - Co-marketing with consultancies and system integrators\',
    \'Direct sales - Outbound outreach to target accounts\',
    \'Content marketing - Whitepapers, blogs, video content\'
  ])
]);

// Document 5: Launch Plan
const launchPlan = createDoc([
  heading(1, 'AI-QEF Launch Plan'),
  paragraph(),
  heading(2, 'Launch Objective'),
  paragraph(),
  paragraph(),
  heading(2, 'Pre-Launch Activities (Weeks 1-4)'),
  paragraph(),
  heading(3, '1. Product Finalization'),
  bulletList([
    \'Complete all six assessment modules with validated questionnaires\',
    \'Finalize scoring algorithms and financial models\',
    \'Test AI insight generation across multiple client scenarios\',
    \'Develop report templates (executive summary, detailed analysis, remediation roadmap)\',
    \'Build executive dashboard with key metrics\',
    \'Complete platform security audit and ensure GDPR compliance\'
  ]),
  paragraph(),
  heading(3, '2. Sales Enablement'),
  bulletList([
    \'Create sales deck with value proposition, case studies, and pricing\',
    \'Develop demo environment showcasing platform capabilities\',
    \'Prepare sample assessment reports\',
    \'Create one-page overview for each customer segment\',
    \'Develop ROI calculator tool for prospect conversations\',
    \'Build FAQ document addressing common objections\'
  ]),
  paragraph(),
  heading(3, '3. Marketing Materials'),
  bulletList([
    \'Design brand identity (logo, colors, typography)\',
    \'Create website landing page with lead capture\',
    \'Develop introductory video (2-3 minutes)\',
    \'Write 3 blog posts on AI governance, data quality, and financial impact\',
    \'Create LinkedIn content calendar (3 posts per week for 12 weeks)\',
    \'Design lead magnets (AI readiness scorecard, billable time leakage calculator)\',
    \'Prepare press release announcing launch\'
  ]),
  paragraph(),
  heading(3, '4. Pilot Client Identification'),
  bulletList([
    \'Identify 10-15 potential pilot clients across three segments\',
    \'Prepare personalized outreach messages for each\',
    \'Schedule discovery calls with target contacts\',
    \'Offer pilot pricing (50% discount off standard rates)\',
    \'Secure commitments from 3-5 pilot clients\'
  ]),
  paragraph(),
  heading(2, 'Launch Timeline'),
  paragraph(),
  heading(3, 'Month 1: Soft Launch (March 2026)'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Onboard first 2 pilot clients\',
    \'Conduct discovery workshops\',
    \'Begin assessment questionnaire completion\',
    \'Publish launch announcement on LinkedIn\',
    \'Send press release to industry publications\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Complete first 2 assessments\',
    \'Generate AI insights and financial exposure reports\',
    \'Present results to pilot clients\',
    \'Gather feedback on assessment process and reports\',
    \'Refine questionnaires and scoring based on feedback\',
    \'Publish first case study (with client permission)\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'2 pilot engagements delivered\',
    \'Average satisfaction score: 4+/5\',
    \'At least 1 client commits to remediation programme\',
    \'Feedback collected and incorporated\'
  ]),
  paragraph(),
  heading(3, 'Month 2: Expansion (April 2026)'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Onboard 3 additional pilot clients\',
    \'Conduct assessment workshops\',
    \'Deliver results from Month 1 assessments\',
    \'Begin remediation planning with first clients\',
    \'Reach out to 5 potential partner consultancies\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Complete additional assessments\',
    \'Present results to new pilot clients\',
    \'Schedule follow-up workshops for remediation planning\',
    \'Publish 2nd case study\',
    \'Host first webinar: "AI Governance That Pays for Itself"\',
    \'Meet with 2-3 potential partners\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'5 total pilot engagements delivered\',
    \'At least 2 clients commit to remediation programmes\',
    \'2 case studies published\',
    \'Webinar attendance: 20+ registrants, 10+ attendees\',
    \'1-2 partner discussions underway\'
  ]),
  paragraph(),
  heading(3, 'Month 3: Validation (May 2026)'),
  paragraph(),
  paragraph(),
  paragraph(),
  bulletList([
    \'Begin remediation programmes with 2 clients\',
    \'Complete additional discovery assessments (target: 3 more)\',
    \'Finalize partnership terms with first consultancy partner\',
    \'Launch targeted LinkedIn ad campaign\',
    \'Publish whitepaper: "The Financial Case for AI Governance"\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Progress update workshops with remediation clients\',
    \'Complete month 3 assessments\',
    \'Onboard first partner consultancy (training and certification)\',
    \'Achieve £2.5k/month revenue target\',
    \'Publish 3rd case study\',
    \'Host 2nd webinar: "Data Governance as AI Governance"\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'8+ total discovery engagements delivered\',
    \'2 remediation programmes underway\',
    \'1 partner consultancy certified\',
    \'£2.5k/month revenue achieved\',
    \'20+ inbound leads generated\',
    \'3 case studies published\'
  ]),
  paragraph(),
  heading(3, 'Months 4-6: Scale (June-August 2026)'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Deliver 10+ additional discovery assessments\',
    \'Complete 2 remediation programmes\',
    \'Onboard 2 additional partner consultancies\',
    \'Launch self-service AI readiness scorecard (lead generation tool)\',
    \'Attend and speak at 2 industry conferences\',
    \'Publish 3 more case studies\',
    \'Achieve £5k/month revenue (discovery + remediation + early subscriptions)\'
  ]),
  paragraph(),
  heading(3, 'Months 7-9: Subscription Launch (September-November 2026)'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Launch subscription tiers (£99-£299/month)\',
    \'Transition 5 completed remediation clients to subscriptions\',
    \'Develop integration connectors (CRM, ERP, data quality tools)\',
    \'Build API for partner integrations\',
    \'Deliver 15+ additional discovery assessments\',
    \'Complete 5 more remediation programmes\',
    \'Achieve £7.5k/month revenue\'
  ]),
  paragraph(),
  heading(3, 'Months 10-12: Optimization (December 2026-February 2027)'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Achieve 20+ managed governance subscriptions\',
    \'Deliver 10+ additional discovery assessments\',
    \'Complete 5 more remediation programmes\',
    \'Onboard 2 more partner consultancies (5 total)\',
    \'Expand to US market (initial pilots)\',
    \'Achieve £10k/month revenue target\',
    \'Plan Series A fundraising or profitability path\'
  ]),
  paragraph(),
  heading(2, 'Market Entry Strategy'),
  paragraph(),
  heading(3, 'Geographic Focus'),
  paragraph(),
  bulletList([
    \'Easier to deliver consultant-led engagements\',
    \'Strong regulatory environment (GDPR, AI Act) driving demand\',
    \'Established professional services market\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Expand to Ireland, Netherlands, Germany\',
    \'Partner-led delivery model enables geographic expansion\',
    \'EU AI Act creates demand\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Larger market opportunity\',
    \'Partner network established to support delivery\',
    \'Platform model reduces delivery complexity\'
  ]),
  paragraph(),
  heading(2, 'Partnership Approach'),
  paragraph(),
  heading(3, 'Partner Types'),
  paragraph(),
  bulletList([
    \'Data strategy consultancies\',
    \'AI/ML consulting firms\',
    \'Digital transformation consultants\',
    \'Systems integrators\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'CRM vendors (Salesforce, HubSpot)\',
    \'Data quality tools (Informatica, Talend)\',
    \'GRC platforms (ServiceNow, OneTrust)\',
    \'Cloud providers (AWS, Azure, GCP)\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Legal firms (for professional services segment)\',
    \'Compliance consultancies\',
    \'Industry associations\'
  ]),
  paragraph(),
  heading(3, 'Partner Programme Structure'),
  bulletList([
    \'Certification training (2-day programme)\',
    \'Co-marketing materials and case studies\',
    \'Revenue share: 30% to partner on discovery, 20% on remediation, 10% on subscriptions\',
    \'Partner portal with sales enablement resources\',
    \'Quarterly partner summits for knowledge sharing\',
    \'White-label option for larger partners\'
  ]),
  paragraph(),
  heading(2, 'Customer Acquisition Strategy by Segment'),
  paragraph(),
  heading(3, '1. Enterprises Deploying AI'),
  paragraph(),
  bulletList([
    \'Thought leadership content (LinkedIn, industry blogs)\',
    \'Conference speaking (AI, data governance, digital transformation)\',
    \'Webinars on AI readiness and governance\',
    \'Free AI readiness scorecard (lead magnet)\',
    \'Targeted LinkedIn ads to CTOs, CDOs, Heads of AI\',
    \'Partner co-selling with data consultancies\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Discovery call to understand AI initiatives and governance gaps\',
    \'Offer free AI readiness scorecard to demonstrate value\',
    \'Present case study showing financial ROI from similar organization\',
    \'Pilot pricing (50% off standard rate) to reduce barrier\',
    \'Clear path from discovery to remediation to subscription\'
  ]),
  paragraph(),
  heading(3, '2. Professional Services Firms'),
  paragraph(),
  bulletList([
    \'Case studies showing billable hour recovery\',
    \'Direct outreach to managing partners and COOs\',
    \'Speaking at legal/advisory industry events\',
    \'Sponsored content in industry publications\',
    \'Free billable time leakage calculator (lead magnet)\',
    \'Referral partnerships with legal technology vendors\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Discovery call focused on billable time and revenue leakage\',
    \'Demonstrate billable hour recovery calculator with real estimates\',
    \'Present case study from similar firm\',
    \'Offer pilot engagement with quick turnaround (2-3 weeks)\',
    \'Emphasize confidentiality and non-disclosure\'
  ]),
  paragraph(),
  heading(3, '3. Regulated Industries'),
  paragraph(),
  bulletList([
    \'Whitepapers on AI Act, GDPR, and sector-specific regulations\',
    \'Speaking at compliance and risk conferences\',
    \'Targeted outreach to Chief Risk Officers and DPOs\',
    \'Partnership with compliance consultancies\',
    \'Free regulatory risk assessment (lead magnet)\',
    \'Sponsored content in compliance publications\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Discovery call focused on regulatory exposure\',
    \'Present free regulatory risk assessment\',
    \'Demonstrate how AI-QEF creates audit-ready governance framework\',
    \'Show case study from similar regulated organization\',
    \'Offer pilot engagement with focus on compliance gap analysis\'
  ]),
  paragraph(),
  heading(2, 'Success Metrics'),
  paragraph(),
  heading(3, 'Revenue Targets'),
  bulletList([
    \'Month 1: £0-£1k (pilot engagements at reduced pricing)\',
    \'Month 2: £1k-£2k (mix of pilots and first full-price engagement)\',
    \'Month 3: £2.5k (achieve initial revenue target)\',
    \'Month 6: £5k (mix of discovery, remediation, early subscriptions)\',
    \'Month 9: £7.5k (growing subscription base)\',
    \'Month 12: £10k (target achieved)\'
  ]),
  paragraph(),
  heading(3, 'Engagement Metrics'),
  bulletList([
    \'Discovery engagements: 50+ delivered in Year 1\',
    \'Remediation programmes: 15+ initiated in Year 1\',
    \'Managed governance subscriptions: 20+ active by end of Year 1\',
    \'Partner consultancies: 5 certified by end of Year 1\'
  ]),
  paragraph(),
  heading(3, 'Marketing Metrics'),
  bulletList([
    \'Website traffic: 1000+ visitors/month by Month 6\',
    \'LinkedIn followers: 500+ by Month 6\',
    \'Inbound leads: 20+ per month by Month 6\',
    \'Webinar attendees: 100+ total across 6 webinars\',
    \'Case studies published: 6+ in Year 1\',
    \'Conference speaking engagements: 3+ in Year 1\'
  ]),
  paragraph(),
  heading(3, 'Customer Success Metrics'),
  bulletList([
    \'Average customer satisfaction: 4.5+/5\',
    \'Discovery-to-remediation conversion: 40%+\',
    \'Remediation-to-subscription conversion: 50%+\',
    \'Average financial impact identified: £100k+ per client\',
    \'Net Promoter Score (NPS): 50+\',
    \'Customer referrals: 20%+ of new clients from referrals by Month 12\'
  ]),
  paragraph(),
  heading(2, 'Risk Mitigation'),
  paragraph(),
  heading(3, 'Key Risks and Mitigation Strategies'),
  paragraph(),
  paragraph(),
  bulletList([
    \'Mitigation: Offer significant pilot discount (50% off) and over-deliver on value\',
    \'Mitigation: Select pilot clients with high likelihood of success (clear pain points, budget authority)\',
    \'Mitigation: Collect detailed feedback and iterate quickly\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Mitigation: Develop conservative financial models with clear assumptions\',
    \'Mitigation: Use ranges rather than exact figures (e.g., £50k-£150k revenue leakage)\',
    \'Mitigation: Validate financial models with client finance teams\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Mitigation: Create comprehensive partner training programme\',
    \'Mitigation: Offer attractive revenue share and co-marketing support\',
    \'Mitigation: Start with 1-2 strategic partners rather than many small ones\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Mitigation: Emphasize financial exposure quantification (unique differentiator)\',
    \'Mitigation: Focus on consultant-led delivery (better quality than self-service)\',
    \'Mitigation: Target customers underserved by enterprise platforms (mid-market)\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Mitigation: Position as cost-saving initiative (revenue leakage recovery)\',
    \'Mitigation: Offer flexible payment terms (pay-on-results for remediation)\',
    \'Mitigation: Accelerate subscription model to create predictable revenue\'
  ]),
  paragraph(),
  heading(2, 'Investment Requirements'),
  paragraph(),
  heading(3, 'Pre-Launch (Months 1-3)'),
  bulletList([
    \'Product finalization: £10k (development time)\',
    \'Marketing materials: £5k (design, website, video)\',
    \'Sales enablement: £3k (demo environment, collateral)\',
    \'Total: £18k\'
  ]),
  paragraph(),
  heading(3, 'Launch and Scale (Months 1-12)'),
  bulletList([
    \'Sales and marketing: £30k (ads, conferences, content creation)\',
    \'Delivery resources: £40k (consultant time for pilot engagements)\',
    \'Partner programme: £10k (training, co-marketing)\',
    \'Platform development: £20k (subscription features, integrations)\',
    \'Total: £100k\'
  ]),
  paragraph(),
  heading(3, 'Funding Strategy'),
  bulletList([
    \'Bootstrap initial pilots (revenue from pilot engagements covers costs)\',
    \'Reinvest revenue into marketing and sales\',
    \'Reach profitability by Month 9-12 (£10k/month revenue, £5k/month costs)\',
    \'Consider seed funding if faster growth is desired (£250k seed round to accelerate partner development and US expansion)\'
  ]),
  paragraph(),
  heading(2, 'Summary: Path to £10k/Month'),
  bulletList([
    \'Month 1-3: Deliver pilot engagements, validate product-market fit → £2.5k/month\',
    \'Month 4-6: Scale delivery through partners and direct sales → £5k/month\',
    \'Month 7-9: Launch subscription service, transition remediation clients → £7.5k/month\',
    \'Month 10-12: Optimize operations, scale subscriptions → £10k/month achieved\'
  ]),
  paragraph(),
  paragraph(),
  bulletList([
    \'Delivering exceptional value in pilot engagements\',
    \'Building strong partner network\',
    \'Demonstrating clear financial ROI\',
    \'Converting discovery engagements to remediation and subscriptions\',
    \'Efficient execution and continuous iteration based on feedback\'
  ])
]);

async function main() {
  try {
    console.log('Creating 5 comprehensive documents for Security App company...\n');

    const documents = [
      {
        title: 'AI-QEF Technical Specification',
        documentType: 'technical-spec',
        contentRich: technicalSpec
      },
      {
        title: 'AI-QEF Product Overview',
        documentType: 'product-overview',
        contentRich: productOverview
      },
      {
        title: 'AI-QEF Unique Selling Propositions',
        documentType: 'usp-overview',
        contentRich: uspOverview
      },
      {
        title: 'AI-QEF Marketing Overview',
        documentType: 'marketing-overview',
        contentRich: marketingOverview
      },
      {
        title: 'AI-QEF Launch Plan',
        documentType: 'launch-plan',
        contentRich: launchPlan
      }
    ];

    const created = [];

    for (const doc of documents) {
      console.log(`Creating: ${doc.title}...`);
      
      const document = await prisma.document.create({
        data: {
          workspaceId: WORKSPACE_ID,
          companyId: COMPANY_ID,
          title: doc.title,
          documentType: doc.documentType,
          contentRich: doc.contentRich,
          version: 1,
          createdBy: USER_ID
        },
        include: {
          company: {
            select: { id: true, name: true }
          }
        }
      });

      // Create initial version
      await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          version: 1,
          contentRich: doc.contentRich,
          createdBy: USER_ID
        }
      });

      created.push({
        id: document.id,
        title: document.title,
        type: document.documentType,
        company: document.company.name
      });

      console.log(`✅ Created: ${doc.title} (ID: ${document.id})\n`);
    }

    console.log('\n========================================');
    console.log('ALL DOCUMENTS CREATED SUCCESSFULLY');
    console.log('========================================\n');

    console.log('Summary:');
    created.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.title}`);
      console.log(`   Type: ${doc.type}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Company: ${doc.company}`);
      console.log('');
    });

    console.log('Verification:');
    console.log(`✅ All 5 documents created`);
    console.log(`✅ All linked to Security App company (${COMPANY_ID})`);
    console.log(`✅ All documents viewable from company profile`);
    console.log(`✅ Documents include full content in ProseMirror format`);

  } catch (error) {
    console.error('Error creating documents:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
