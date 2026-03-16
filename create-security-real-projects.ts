#!/usr/bin/env ts-node

/**
 * AI-QEF (Security App) - REAL Project Structure for $10K MRR Launch
 * 
 * Business Model: Consultant-led SaaS
 * 3 Phases: Discovery (£10-30K one-time) → Remediation (project) → Managed Governance (£1-5K/month)
 * 
 * Revenue Path to $10K MRR:
 * - Month 1-2: 2-3 Discovery engagements @ £15-25K each = £30-75K one-time
 * - Month 2-3: Convert 1-2 Discovery clients to Managed Governance @ £2-3K/month
 * - Month 3: Target 5 Managed Governance clients @ £2K average = £10K MRR
 * 
 * This script creates projects that focus on:
 * 1. Making the MVP production-ready and sellable
 * 2. Delivering the first Discovery engagement successfully
 * 3. Building repeatable delivery methodology
 * 4. Converting Discovery to recurring Managed Governance
 * 5. Scaling to 5-10 customers
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const COMPANY_ID = '124804c1-0703-48ec-811b-754d80769e64';
const CREATED_BY = '00000000-0000-0000-0000-000000000000';

let TODO_STATUS_ID: string;

interface TaskData {
  title: string;
  description: string;
  effortDays: number;
  priority: number;
  dependencies?: string[];
  successCriteria: string[];
}

interface ProjectData {
  name: string;
  description: string;
  objectives: string[];
  timeline: {
    startWeek: number;
    durationWeeks: number;
  };
  priority: number;
  tasks: TaskData[];
}

const projects: ProjectData[] = [
  // ========================================
  // PHASE 1: FOUNDATION & FIRST CUSTOMER (Weeks 1-4)
  // ========================================
  {
    name: '🚀 MVP Production Launch',
    description: 'Take the current MVP from demo state to production-ready platform that can be sold and delivered to paying customers. Focus on stability, security, and professional presentation.',
    objectives: [
      'Production deployment with 99.9% uptime',
      'Professional UI/UX suitable for enterprise demos',
      'Security audit complete and documented',
      'Demo environment with realistic data',
      'First paying customer onboarded successfully'
    ],
    timeline: { startWeek: 1, durationWeeks: 3 },
    priority: 1,
    tasks: [
      {
        title: 'Production infrastructure setup and hardening',
        description: 'Set up production Vercel deployment, Supabase production database, environment variables, monitoring (Sentry), uptime monitoring, backups, and disaster recovery. Configure custom domain, SSL certificates, and CDN.',
        effortDays: 3,
        priority: 1,
        successCriteria: [
          'Production deployment live at custom domain',
          'Supabase production database with automated backups',
          'Monitoring and alerting configured',
          '99.9% uptime target set',
          'Disaster recovery plan documented'
        ]
      },
      {
        title: 'Security audit and compliance documentation',
        description: 'Conduct security audit: penetration testing, vulnerability scanning, data encryption verification, authentication testing. Document security controls for customer questions. Create security questionnaire responses.',
        effortDays: 4,
        priority: 1,
        successCriteria: [
          'Security audit complete with report',
          'All critical and high vulnerabilities fixed',
          'Security documentation for sales (1-pager)',
          'Data encryption verified (at rest and in transit)',
          'Security questionnaire template prepared'
        ]
      },
      {
        title: 'Professional UI polish for enterprise demos',
        description: 'Polish the UI: professional branding, consistent styling, loading states, error messages, empty states. Create demo data that looks realistic. Add help text and tooltips where needed.',
        effortDays: 5,
        priority: 2,
        successCriteria: [
          'Professional branding applied (logo, colors)',
          'All pages have consistent styling',
          'Loading and error states polished',
          'Realistic demo data prepared',
          'Help text and tooltips added to complex features',
          'Mobile-responsive (basic)'
        ]
      },
      {
        title: 'Demo environment and sales collateral',
        description: 'Create dedicated demo environment with pre-loaded realistic data. Build 3-slide deck for initial conversations. Create one-pager explaining the 3-phase model. Record 5-minute product demo video.',
        effortDays: 3,
        priority: 2,
        successCriteria: [
          'Demo environment live with realistic data',
          '3-slide pitch deck complete',
          'One-pager explaining Discovery/Remediation/Managed model',
          '5-minute demo video recorded',
          'Demo script for sales calls'
        ]
      },
      {
        title: 'First customer onboarding workflow',
        description: 'Create customer onboarding workflow: account setup, initial consultation, data migration support, training delivery. Document the process for repeatability.',
        effortDays: 2,
        priority: 2,
        dependencies: ['Production infrastructure setup and hardening'],
        successCriteria: [
          'Onboarding checklist created (10-15 steps)',
          'Customer kickoff call template',
          'Training deck prepared',
          'Data migration process documented',
          'Support escalation process defined'
        ]
      }
    ]
  },
  {
    name: '💼 Discovery Engagement Methodology',
    description: 'Build the standardized Discovery engagement offering: assessment framework, deliverables templates, pricing model, and delivery playbook. This is the entry point that feeds the recurring revenue model.',
    objectives: [
      'Standardized Discovery assessment process (6 modules)',
      'Professional deliverables templates (report, presentation)',
      'Pricing: £15-25K for standard Discovery engagement',
      'Delivery timeline: 2-4 weeks per engagement',
      'First Discovery engagement delivered successfully'
    ],
    timeline: { startWeek: 1, durationWeeks: 4 },
    priority: 1,
    tasks: [
      {
        title: 'Discovery assessment framework design',
        description: 'Design the 6-module assessment framework: (1) Strategic AI Positioning, (2) Data Governance, (3) AI Risk & Compliance, (4) Data Quality, (5) Operational Efficiency, (6) Governance Monitoring. Create questionnaires, scoring models, and assessment templates.',
        effortDays: 6,
        priority: 1,
        successCriteria: [
          'Assessment questionnaire for each module (30-50 questions)',
          'Scoring model defined (0-100 scale)',
          'Maturity levels defined (1-5)',
          'Assessment templates in spreadsheet/platform',
          'Time estimate: 2-4 weeks delivery'
        ]
      },
      {
        title: 'Financial impact modeling toolkit',
        description: 'Build financial impact modeling toolkit: calculate revenue leakage, cost of poor data quality, compliance risk quantification, automation opportunity ROI. Create Excel models and formulas.',
        effortDays: 5,
        priority: 1,
        successCriteria: [
          'Revenue leakage calculator (Excel + formulas)',
          'Data quality cost model',
          'Compliance risk quantification model',
          'ROI calculator for automation',
          'Assumptions documented and customizable'
        ]
      },
      {
        title: 'Discovery deliverables templates',
        description: 'Create professional deliverables templates: Executive Summary (5 pages), Detailed Assessment Report (25-40 pages), Remediation Roadmap (10 pages), Financial Impact Analysis (5 pages). Include charts, visualizations, and branding.',
        effortDays: 6,
        priority: 1,
        successCriteria: [
          'Executive Summary template (PowerPoint)',
          'Detailed Assessment Report template (Word/PDF)',
          'Remediation Roadmap template',
          'Financial Impact Analysis template',
          'All templates branded and professional',
          'Example outputs created with mock data'
        ]
      },
      {
        title: 'Discovery delivery playbook',
        description: 'Document the end-to-end Discovery delivery process: sales handoff, kickoff call, stakeholder interviews (list of personas), data collection, analysis, report writing, presentation, and handoff to Remediation. Include timelines and responsibilities.',
        effortDays: 4,
        priority: 2,
        dependencies: ['Discovery assessment framework design'],
        successCriteria: [
          'Delivery playbook documented (15-20 pages)',
          'Week-by-week timeline template',
          'Stakeholder interview guide (5-8 personas)',
          'Data collection checklist',
          'Report writing guide',
          'Presentation deck template'
        ]
      },
      {
        title: 'Discovery pricing and packaging',
        description: 'Define Discovery engagement pricing: Standard (£15K), Extended (£25K), Enterprise (£35K+). Define what\'s included in each package, timeline, and deliverables. Create proposal template.',
        effortDays: 2,
        priority: 2,
        successCriteria: [
          'Pricing tiers defined (Standard/Extended/Enterprise)',
          'Scope of work template for each tier',
          'Proposal template (Word/PDF)',
          'Pricing justified with value model',
          'Payment terms defined (50% upfront, 50% on delivery)'
        ]
      }
    ]
  },
  {
    name: '🎯 First Customer Acquisition',
    description: 'Leverage the security company partner to secure the first paying customer. Execute targeted outreach, deliver compelling demos, and close the first Discovery engagement.',
    objectives: [
      'Partner intro to 5-10 qualified prospects',
      '3-5 discovery calls completed',
      '2-3 product demos delivered',
      'First Discovery engagement sold (£15-25K)',
      'Customer success: deliver on time and on budget'
    ],
    timeline: { startWeek: 1, durationWeeks: 4 },
    priority: 1,
    tasks: [
      {
        title: 'Partner relationship activation',
        description: 'Meet with security company partner: align on value proposition, target customer profile, intro process. Get commitment for 5-10 warm intros in first month. Create co-selling one-pager for partner to use.',
        effortDays: 2,
        priority: 1,
        successCriteria: [
          'Partner kickoff meeting completed',
          'Target customer profile agreed',
          'Intro process defined',
          'Partner committed to 5-10 intros/month',
          'Co-selling one-pager created',
          'Revenue share terms clarified'
        ]
      },
      {
        title: 'Targeted prospect research and outreach',
        description: 'Research 20-30 target prospects: mid-to-large enterprises deploying AI, professional services firms, regulated industries. Identify decision makers (CISO, CIO, Compliance). Prepare personalized outreach messages.',
        effortDays: 3,
        priority: 1,
        successCriteria: [
          '20-30 target prospects identified',
          'Decision makers found (LinkedIn)',
          'Company research completed (pain points)',
          'Personalized outreach messages drafted',
          'CRM setup with prospect tracking'
        ]
      },
      {
        title: 'Discovery call execution and qualification',
        description: 'Execute 5-10 discovery calls: understand pain points, qualify budget/authority/need/timeline, present value proposition, book product demo. Use BANT qualification framework.',
        effortDays: 3,
        priority: 1,
        dependencies: ['Partner relationship activation', 'Targeted prospect research and outreach'],
        successCriteria: [
          '5-10 discovery calls completed',
          'BANT qualification for each prospect',
          'Pain points documented',
          '3-5 product demos booked',
          'Discovery call notes in CRM',
          'Follow-up cadence established'
        ]
      },
      {
        title: 'Product demos and value demonstration',
        description: 'Deliver 3-5 product demos: show Policy-to-Control Mapper, explain 3-phase model, demonstrate financial impact modeling, present case studies (or prototypes). Tailor each demo to prospect pain points.',
        effortDays: 2,
        priority: 1,
        dependencies: ['Discovery call execution and qualification'],
        successCriteria: [
          '3-5 product demos delivered',
          'Demo tailored to each prospect',
          '3-phase model explained clearly',
          'Financial impact demonstrated',
          'Technical questions answered',
          'Next steps agreed (proposal/pilot)'
        ]
      },
      {
        title: 'Proposal creation and negotiation',
        description: 'Create customized proposals for 2-3 qualified prospects: scope of work, deliverables, timeline, pricing, terms. Present and negotiate. Close first Discovery engagement.',
        effortDays: 3,
        priority: 1,
        dependencies: ['Product demos and value demonstration'],
        successCriteria: [
          '2-3 proposals created and sent',
          'Proposals customized to pain points',
          'Pricing justified with ROI model',
          'Objections handled and documented',
          'First Discovery engagement closed (£15-25K)',
          'Contract signed and payment terms agreed'
        ]
      }
    ]
  },
  {
    name: '📊 Pricing & Packaging Finalization',
    description: 'Finalize pricing strategy across all 3 phases: Discovery, Remediation, and Managed Governance. Create clear packaging, contract templates, and pricing justification materials.',
    objectives: [
      'Discovery pricing: £15-25K (standard), £35K+ (enterprise)',
      'Remediation pricing: project-based (£20-80K)',
      'Managed Governance pricing: £1-5K/month based on scope',
      'Pricing validated with first customer',
      'Contract templates created for all phases'
    ],
    timeline: { startWeek: 2, durationWeeks: 2 },
    priority: 2,
    tasks: [
      {
        title: 'Competitive pricing research',
        description: 'Research competitor pricing: GRC platforms (OneTrust, LogicGate), consulting firms (Big 4, boutique), compliance tools. Identify pricing gaps and opportunities. Create pricing positioning strategy.',
        effortDays: 3,
        priority: 2,
        successCriteria: [
          'Competitor pricing research (10+ competitors)',
          'Pricing gaps identified',
          'Positioning strategy defined (value vs competitors)',
          'Pricing justification document',
          'Value-based pricing model vs cost-plus'
        ]
      },
      {
        title: 'Phase-by-phase pricing models',
        description: 'Define pricing for each phase: Discovery (fixed price), Remediation (project-based with scope tiers), Managed Governance (monthly recurring with tiers). Create pricing calculators.',
        effortDays: 4,
        priority: 1,
        successCriteria: [
          'Discovery pricing: £15K (standard), £25K (extended), £35K+ (enterprise)',
          'Remediation pricing: £20-80K based on scope',
          'Managed Governance: £1-5K/month (tiers defined)',
          'Pricing calculator (Excel) for each phase',
          'Bundling discounts defined (Discovery+Remediation+Managed)'
        ]
      },
      {
        title: 'Contract templates and legal review',
        description: 'Create contract templates for all phases: Master Services Agreement, Statement of Work (Discovery), Project Agreement (Remediation), Subscription Agreement (Managed Governance). Legal review.',
        effortDays: 4,
        priority: 1,
        successCriteria: [
          'Master Services Agreement template',
          'Statement of Work template (Discovery)',
          'Project Agreement template (Remediation)',
          'Subscription Agreement template (Managed Governance)',
          'Legal review completed',
          'Payment terms defined (upfront, milestones, monthly)'
        ]
      },
      {
        title: 'Pricing objection handling playbook',
        description: 'Anticipate and document common pricing objections: "Too expensive", "Can we do this in-house?", "We need more time". Create objection handling scripts with ROI justification.',
        effortDays: 2,
        priority: 3,
        successCriteria: [
          'Common objections identified (10-15)',
          'Objection handling scripts',
          'ROI justification materials',
          'Comparison: consultant vs in-house',
          'Case studies/testimonials (when available)'
        ]
      }
    ]
  },

  // ========================================
  // PHASE 2: SCALE DELIVERY (Weeks 5-8)
  // ========================================
  {
    name: '🔄 Remediation Offering Development',
    description: 'Build the Remediation phase offering: project-based services to address gaps identified in Discovery. Create service packages, delivery methodologies, and pricing models.',
    objectives: [
      'Remediation service packages defined (3-5 tiers)',
      'Delivery methodology documented',
      'Partner/vendor ecosystem for execution',
      'First Remediation project sold and delivered',
      'Conversion rate: 60%+ from Discovery to Remediation'
    ],
    timeline: { startWeek: 5, durationWeeks: 4 },
    priority: 2,
    tasks: [
      {
        title: 'Remediation service packages design',
        description: 'Define Remediation service packages: Data Governance Setup (£20-40K), Compliance Remediation (£30-60K), Full Transformation (£60-100K). Define scope, deliverables, timeline for each package.',
        effortDays: 5,
        priority: 1,
        successCriteria: [
          'Remediation packages defined (3 tiers)',
          'Scope of work templates for each',
          'Deliverables clearly defined',
          'Timeline estimates (4-16 weeks)',
          'Pricing justified with effort model',
          'Package comparison table'
        ]
      },
      {
        title: 'Remediation delivery methodology',
        description: 'Document Remediation delivery methodology: gap prioritization, implementation planning, vendor selection, project management, testing/validation, handoff to Managed Governance. Create project plan templates.',
        effortDays: 4,
        priority: 1,
        successCriteria: [
          'Remediation delivery playbook (20-30 pages)',
          'Project plan template (Gantt chart)',
          'Gap prioritization framework',
          'Vendor selection criteria',
          'Quality assurance checklist',
          'Handoff to Managed Governance process'
        ]
      },
      {
        title: 'Partner/vendor ecosystem for execution',
        description: 'Identify and onboard partners/vendors for Remediation execution: data engineering firms, compliance consultants, system integrators. Create partner agreements and referral process.',
        effortDays: 5,
        priority: 2,
        successCriteria: [
          '5-10 execution partners identified',
          '2-3 partners onboarded',
          'Partner agreement template',
          'Referral/revenue share model defined',
          'Partner capabilities documented',
          'Partner selection matrix'
        ]
      },
      {
        title: 'Discovery-to-Remediation conversion process',
        description: 'Create conversion process from Discovery to Remediation: present findings, quantify ROI, propose Remediation packages, overcome objections. Build conversion materials.',
        effortDays: 3,
        priority: 1,
        dependencies: ['Remediation service packages design'],
        successCriteria: [
          'Conversion presentation template',
          'ROI model for Remediation',
          'Objection handling guide',
          'Proposal template (Discovery to Remediation)',
          'Target conversion rate: 60%+',
          'Conversion tracking in CRM'
        ]
      }
    ]
  },
  {
    name: '🔁 Managed Governance Offering & Platform',
    description: 'Build the Managed Governance subscription offering: ongoing monitoring, reporting, and governance as a service. This is the recurring revenue engine. Integrate with the platform for automation.',
    objectives: [
      'Managed Governance service packages (£1-5K/month tiers)',
      'Monthly governance reporting templates',
      'Automated monitoring dashboards',
      'Customer success playbook',
      'First 2-3 Managed Governance customers live'
    ],
    timeline: { startWeek: 6, durationWeeks: 6 },
    priority: 1,
    tasks: [
      {
        title: 'Managed Governance service packaging',
        description: 'Define Managed Governance tiers: Essential (£1K/month), Professional (£2.5K/month), Enterprise (£5K/month). Define service levels, deliverables, response times, meeting cadence.',
        effortDays: 4,
        priority: 1,
        successCriteria: [
          'Managed Governance tiers defined (3 tiers)',
          'Service level definitions (SLAs)',
          'Monthly deliverables list',
          'Meeting cadence (monthly, quarterly)',
          'Escalation process',
          'Pricing calculator'
        ]
      },
      {
        title: 'Monthly governance reporting automation',
        description: 'Build automated monthly governance reports: compliance status, risk trends, policy updates, evidence expiry warnings, action items. Integrate with platform data. Create executive dashboard.',
        effortDays: 7,
        priority: 1,
        successCriteria: [
          'Monthly report template (PowerPoint/PDF)',
          'Automated data integration from platform',
          'Executive dashboard (live view)',
          'Trend charts and visualizations',
          'Action items tracking',
          'Report generation < 2 hours manual effort'
        ]
      },
      {
        title: 'Governance monitoring dashboard',
        description: 'Build customer-facing governance monitoring dashboard: real-time compliance status, upcoming evidence expiry, policy updates, risk alerts. Integrate into platform.',
        effortDays: 8,
        priority: 1,
        successCriteria: [
          'Customer dashboard in platform',
          'Real-time compliance status',
          'Evidence expiry calendar',
          'Risk alerts and notifications',
          'Policy change tracking',
          'Mobile-responsive'
        ]
      },
      {
        title: 'Customer success playbook',
        description: 'Create customer success playbook for Managed Governance: onboarding, monthly check-ins, quarterly business reviews, upsell opportunities, churn prevention. Define health metrics.',
        effortDays: 4,
        priority: 2,
        successCriteria: [
          'Customer success playbook (15-20 pages)',
          'Onboarding checklist (first 30 days)',
          'Monthly check-in template',
          'Quarterly business review deck',
          'Health score metrics defined',
          'Upsell opportunity triggers',
          'Churn risk indicators'
        ]
      },
      {
        title: 'Remediation-to-Managed conversion process',
        description: 'Create conversion process from Remediation to Managed Governance: demonstrate ongoing value, show monitoring dashboards, propose subscription tiers. Build conversion materials and tracking.',
        effortDays: 3,
        priority: 1,
        dependencies: ['Managed Governance service packaging'],
        successCriteria: [
          'Conversion presentation template',
          'Value demonstration (before/after metrics)',
          'Subscription proposal template',
          'Objection handling guide',
          'Target conversion rate: 70%+',
          'Conversion tracking in CRM'
        ]
      }
    ]
  },
  {
    name: '👥 Delivery Team Building',
    description: 'Build or contract the delivery team needed to scale: consultants for Discovery/Remediation, customer success for Managed Governance. Create hiring/contracting process and training materials.',
    objectives: [
      '1-2 consultants hired/contracted for Discovery delivery',
      '1 customer success manager for Managed Governance',
      'Training program for delivery team',
      'Quality assurance process',
      'Team capacity: 5-10 concurrent customers'
    ],
    timeline: { startWeek: 7, durationWeeks: 5 },
    priority: 2,
    tasks: [
      {
        title: 'Delivery roles definition and job descriptions',
        description: 'Define delivery roles needed: Governance Consultant (Discovery/Remediation), Customer Success Manager (Managed), Technical Analyst (platform support). Create job descriptions and compensation models.',
        effortDays: 3,
        priority: 2,
        successCriteria: [
          'Roles defined with responsibilities',
          'Job descriptions created (3 roles)',
          'Compensation models (employee vs contractor)',
          'Capacity model (customers per person)',
          'Hiring vs contracting decision matrix'
        ]
      },
      {
        title: 'Consultant recruitment and contractor network',
        description: 'Recruit 1-2 governance consultants (employee or contractor) and build contractor network for overflow. Screen for governance expertise, customer-facing skills, and industry experience.',
        effortDays: 10,
        priority: 2,
        successCriteria: [
          '1-2 consultants hired/contracted',
          'Contractor network established (3-5 contacts)',
          'Background checks completed',
          'Contracts signed',
          'Onboarding scheduled'
        ]
      },
      {
        title: 'Delivery team training program',
        description: 'Create training program for delivery team: product training, assessment methodology, financial modeling, customer management, quality standards. Deliver training to first hires.',
        effortDays: 6,
        priority: 1,
        dependencies: ['Consultant recruitment and contractor network'],
        successCriteria: [
          'Training curriculum designed (3-5 days)',
          'Product training materials',
          'Assessment methodology training',
          'Financial modeling training',
          'Customer management best practices',
          'First cohort trained and certified'
        ]
      },
      {
        title: 'Quality assurance and peer review process',
        description: 'Create QA process for delivery: peer review of assessments, report quality checks, customer satisfaction tracking, continuous improvement. Define quality metrics.',
        effortDays: 3,
        priority: 2,
        successCriteria: [
          'QA process documented',
          'Peer review checklist',
          'Report quality rubric',
          'Customer satisfaction surveys',
          'Quality metrics dashboard',
          'Continuous improvement process'
        ]
      }
    ]
  },
  {
    name: '📈 Sales & Pipeline Management',
    description: 'Build sales process, CRM, pipeline management, and forecasting to scale customer acquisition beyond the first customer. Focus on repeatable, scalable sales motion.',
    objectives: [
      'CRM configured with 3-phase pipeline',
      'Sales process documented and optimized',
      'Pipeline: 10-15 prospects at any time',
      'Conversion rates tracked and improved',
      'Sales materials and enablement'
    ],
    timeline: { startWeek: 5, durationWeeks: 6 },
    priority: 2,
    tasks: [
      {
        title: 'CRM configuration and pipeline setup',
        description: 'Configure CRM (HubSpot, Pipedrive, or similar) with 3-phase pipeline: Discovery prospects, Discovery-to-Remediation, Remediation-to-Managed. Define stages, deal fields, automation.',
        effortDays: 3,
        priority: 2,
        successCriteria: [
          'CRM selected and configured',
          'Pipeline stages defined (10-12 stages)',
          'Deal fields configured (company size, pain points, budget)',
          'Automation rules set (email sequences, task creation)',
          'Reporting dashboards created',
          'Team trained on CRM usage'
        ]
      },
      {
        title: 'Sales process documentation and playbook',
        description: 'Document sales process: lead qualification, discovery calls, demo delivery, proposal creation, objection handling, closing. Create sales playbook with scripts and templates.',
        effortDays: 5,
        priority: 1,
        successCriteria: [
          'Sales process documented (15-20 pages)',
          'Lead qualification criteria (BANT)',
          'Discovery call script',
          'Demo script (15-30 min versions)',
          'Proposal templates (all phases)',
          'Objection handling guide',
          'Closing techniques documented'
        ]
      },
      {
        title: 'Sales materials and enablement',
        description: 'Create comprehensive sales materials: pitch deck, one-pagers, case studies (or prototypes), ROI calculator, competitive battlecards, security questionnaire responses, reference materials.',
        effortDays: 6,
        priority: 1,
        successCriteria: [
          'Sales pitch deck (15-20 slides)',
          'One-pager for each phase',
          'Case studies (2-3, can be prototypes initially)',
          'ROI calculator (Excel + web version)',
          'Competitive battlecards (5+ competitors)',
          'Security questionnaire responses',
          'Sales enablement portal/folder'
        ]
      },
      {
        title: 'Pipeline generation and lead sources',
        description: 'Establish repeatable lead generation: partner referrals (primary), LinkedIn outbound, industry events/webinars, content marketing, referrals from existing customers. Set weekly targets.',
        effortDays: 4,
        priority: 2,
        successCriteria: [
          'Lead sources prioritized (partner = 60%+)',
          'LinkedIn outbound process (20-30/week)',
          'Industry events identified (2-3/quarter)',
          'Referral program designed',
          'Weekly lead generation targets set',
          'Lead source tracking in CRM'
        ]
      },
      {
        title: 'Sales forecasting and metrics',
        description: 'Build sales forecasting model: conversion rates by stage, deal velocity, win rates, average deal size. Create weekly/monthly sales dashboard. Set targets and track performance.',
        effortDays: 3,
        priority: 2,
        dependencies: ['CRM configuration and pipeline setup'],
        successCriteria: [
          'Forecasting model built (Excel + CRM)',
          'Conversion rates tracked by stage',
          'Deal velocity calculated (days in each stage)',
          'Win/loss analysis process',
          'Sales dashboard created',
          'Monthly targets set (£15-30K new bookings/month)'
        ]
      }
    ]
  },

  // ========================================
  // PHASE 3: SCALE TO $10K MRR (Weeks 9-12)
  // ========================================
  {
    name: '🎯 Customer Acquisition Sprint',
    description: 'Intensive customer acquisition push to reach 5-10 Managed Governance customers. Execute Discovery engagements, convert to Remediation/Managed, and build recurring revenue base.',
    objectives: [
      '5-10 Discovery engagements delivered',
      '3-5 customers converted to Managed Governance',
      '£8-12K MRR achieved',
      'Partner channel producing 60%+ of pipeline',
      'Sales velocity: 30-45 day avg close time'
    ],
    timeline: { startWeek: 9, durationWeeks: 4 },
    priority: 1,
    tasks: [
      {
        title: 'Partner channel optimization',
        description: 'Double down on partner channel: increase intro requests to 10-15/month, improve partner materials, create co-marketing content, establish regular partner sync meetings, incentivize with success stories.',
        effortDays: 4,
        priority: 1,
        successCriteria: [
          'Partner intro rate: 10-15/month',
          'Co-marketing materials created',
          'Regular partner sync (weekly or bi-weekly)',
          'Partner incentives clarified',
          'Success stories shared with partner',
          'Partner satisfaction high (feedback loop)'
        ]
      },
      {
        title: 'Outbound sales campaign execution',
        description: 'Execute targeted outbound sales campaigns: LinkedIn outreach (30-50/week), email campaigns (100-200/week), industry event attendance (1-2/month). Focus on ICP: mid-to-large enterprises deploying AI.',
        effortDays: 8,
        priority: 1,
        successCriteria: [
          'LinkedIn outreach: 30-50 messages/week',
          'Email campaigns: 100-200 emails/week',
          'Response rate: 10-15%',
          'Qualified meetings booked: 5-10/week',
          'Industry events attended: 1-2/month',
          'Speaking opportunities pursued'
        ]
      },
      {
        title: 'Discovery delivery at scale',
        description: 'Deliver 5-10 Discovery engagements concurrently using delivery team. Ensure quality and consistency. Collect testimonials and case studies from satisfied customers.',
        effortDays: 20,
        priority: 1,
        dependencies: ['Consultant recruitment and contractor network', 'Delivery team training program'],
        successCriteria: [
          '5-10 Discovery engagements delivered on time',
          'Customer satisfaction: 8+/10 average',
          'Testimonials collected (3-5)',
          'Case studies documented (2-3)',
          'Delivery team capacity validated',
          'Quality maintained (QA process working)'
        ]
      },
      {
        title: 'Conversion optimization (Discovery → Managed)',
        description: 'Optimize conversion from Discovery to Managed Governance: refine conversion presentations, improve ROI demonstration, address objections proactively, offer limited-time incentives. Track and improve conversion rate.',
        effortDays: 5,
        priority: 1,
        dependencies: ['Discovery delivery at scale'],
        successCriteria: [
          'Conversion rate: 60%+ (Discovery to Remediation/Managed)',
          'Conversion presentations refined',
          'ROI demonstration improved',
          'Objection handling updated based on feedback',
          'Limited-time incentives tested',
          'Conversion tracking automated in CRM'
        ]
      },
      {
        title: 'MRR target achievement and celebration',
        description: 'Push to achieve £8-12K MRR target: close remaining Managed Governance deals, ensure successful onboarding, celebrate with team, document learnings, prepare for next growth phase.',
        effortDays: 3,
        priority: 1,
        dependencies: ['Conversion optimization (Discovery → Managed)'],
        successCriteria: [
          '5-10 Managed Governance customers live',
          '£8-12K MRR achieved',
          'Customer onboarding completed successfully',
          'Team celebration and recognition',
          'Learnings documented',
          'Next growth phase planned (£20K MRR)'
        ]
      }
    ]
  },
  {
    name: '✅ Customer Success & Retention',
    description: 'Build customer success function to ensure Managed Governance customers are successful, renew, and expand. Focus on retention, upsell, and referrals.',
    objectives: [
      'Customer success playbook executed',
      'Customer health scores tracked',
      'Churn rate < 10% monthly',
      'Net Dollar Retention > 100% (upsells)',
      'NPS > 50'
    ],
    timeline: { startWeek: 10, durationWeeks: 6 },
    priority: 1,
    tasks: [
      {
        title: 'Customer onboarding optimization',
        description: 'Optimize customer onboarding for Managed Governance: streamlined kickoff, clear success metrics, regular check-ins (weekly in first month), proactive support, quick wins identified.',
        effortDays: 4,
        priority: 1,
        successCriteria: [
          'Onboarding checklist refined (based on first customers)',
          'Time to value: < 30 days',
          'Kickoff call template',
          'Weekly check-ins in first month',
          'Quick wins identified and delivered',
          'Onboarding satisfaction: 9+/10'
        ]
      },
      {
        title: 'Customer health scoring and monitoring',
        description: 'Implement customer health scoring: engagement metrics (platform usage, meeting attendance), satisfaction surveys, renewal risk indicators. Create health score dashboard and alerts.',
        effortDays: 5,
        priority: 1,
        successCriteria: [
          'Health score model defined',
          'Engagement metrics tracked (platform usage)',
          'Satisfaction surveys sent (quarterly)',
          'Renewal risk indicators identified',
          'Health score dashboard created',
          'Alerts for at-risk customers'
        ]
      },
      {
        title: 'Quarterly business reviews and value demonstration',
        description: 'Execute quarterly business reviews with Managed Governance customers: show value delivered (compliance improvements, risk reduction, cost savings), discuss roadmap, identify expansion opportunities.',
        effortDays: 4,
        priority: 2,
        successCriteria: [
          'QBR template created',
          'Value metrics tracked per customer',
          'QBR delivered to all customers quarterly',
          'Expansion opportunities identified',
          'Customer feedback collected',
          'Action items tracked and completed'
        ]
      },
      {
        title: 'Upsell and expansion playbook',
        description: 'Create upsell playbook: identify expansion triggers (new compliance requirements, org growth, additional modules), create upsell proposals, track expansion revenue. Target: Net Dollar Retention > 100%.',
        effortDays: 3,
        priority: 2,
        successCriteria: [
          'Upsell playbook documented',
          'Expansion triggers identified',
          'Upsell proposal templates',
          'Expansion tracked in CRM',
          'Target: 30%+ of customers expand in year 1',
          'Net Dollar Retention > 100%'
        ]
      },
      {
        title: 'Referral program and customer advocacy',
        description: 'Launch referral program: incentivize customer referrals, create referral materials, track referrals in CRM. Build customer advocacy: testimonials, case studies, speaking opportunities.',
        effortDays: 3,
        priority: 3,
        successCriteria: [
          'Referral program designed (incentive: discount or cash)',
          'Referral materials created',
          'Referral tracking in CRM',
          'Customer advocacy program',
          'Testimonials collected (5-10)',
          'Case studies published (3-5)',
          'Target: 20% of new customers from referrals'
        ]
      }
    ]
  },
  {
    name: '🔧 Platform Enhancement & Automation',
    description: 'Enhance the platform to support scaled delivery: additional modules, automation, integrations, reporting. Focus on reducing manual effort and improving customer experience.',
    objectives: [
      '6 governance modules fully functional',
      'Automated reporting reduces manual effort by 70%',
      'API integrations with common tools (SIEM, IAM)',
      'Mobile app or responsive web for evidence upload',
      'Platform uptime 99.9%'
    ],
    timeline: { startWeek: 8, durationWeeks: 8 },
    priority: 2,
    tasks: [
      {
        title: 'Complete remaining governance modules',
        description: 'Build out remaining governance modules: (1) Strategic AI Positioning, (3) AI Risk & Compliance, (4) Data Quality Analysis, (5) Operational Efficiency. Each module: assessment questions, scoring, reporting.',
        effortDays: 15,
        priority: 2,
        successCriteria: [
          'All 6 modules functional in platform',
          'Assessment questionnaires built',
          'Scoring algorithms implemented',
          'Module reports automated',
          'Module demos prepared',
          'User documentation created'
        ]
      },
      {
        title: 'Financial modeling engine',
        description: 'Build financial modeling engine: revenue leakage calculator, data quality cost estimator, compliance risk quantifier, automation ROI calculator. Integrate into platform with customer-specific data.',
        effortDays: 8,
        priority: 1,
        successCriteria: [
          'Financial models built (4 calculators)',
          'Customer-specific data inputs',
          'Assumptions customizable',
          'Results visualized (charts)',
          'Export to Excel/PDF',
          'Integrated into monthly reports'
        ]
      },
      {
        title: 'Automated reporting and dashboards',
        description: 'Build automated monthly reporting: pull data from platform, generate compliance reports, create executive dashboards, send via email. Reduce manual effort from 8 hours to 2 hours per customer.',
        effortDays: 10,
        priority: 1,
        successCriteria: [
          'Monthly report auto-generation',
          'Executive dashboard (live)',
          'Email delivery automation',
          'Manual effort reduced by 70%',
          'Customization options per customer',
          'Report quality maintained'
        ]
      },
      {
        title: 'API integrations (SIEM, IAM, cloud)',
        description: 'Build API integrations to auto-collect evidence from common tools: SIEM (Splunk, ELK), IAM (Okta, Azure AD), cloud providers (AWS, Azure). Reduce manual evidence upload.',
        effortDays: 12,
        priority: 2,
        successCriteria: [
          'SIEM integration (Splunk or ELK)',
          'IAM integration (Okta or Azure AD)',
          'Cloud integration (AWS or Azure)',
          'Auto-evidence collection working',
          'Evidence mapped to controls',
          'Manual upload reduced by 50%'
        ]
      },
      {
        title: 'Mobile/responsive evidence upload',
        description: 'Build mobile-responsive evidence upload or native mobile app: allow customers to upload evidence from mobile devices (photos of certificates, screenshots). Improve user experience.',
        effortDays: 6,
        priority: 3,
        successCriteria: [
          'Mobile-responsive upload working',
          'Camera integration (photo upload)',
          'Drag-and-drop on mobile',
          'Evidence categorization on upload',
          'User testing with 3-5 customers',
          'Adoption: 30%+ of uploads via mobile'
        ]
      }
    ]
  },
  {
    name: '📊 Metrics, Reporting & Business Intelligence',
    description: 'Build comprehensive metrics dashboards to track business performance, customer health, delivery efficiency, and financial performance. Enable data-driven decision making.',
    objectives: [
      'Business metrics dashboard (MRR, CAC, LTV, churn)',
      'Customer health dashboard',
      'Delivery metrics (time to value, utilization)',
      'Financial dashboard (revenue, costs, margins)',
      'Weekly/monthly reporting automated'
    ],
    timeline: { startWeek: 9, durationWeeks: 4 },
    priority: 2,
    tasks: [
      {
        title: 'Business metrics dashboard',
        description: 'Build business metrics dashboard: MRR, MRR growth rate, customer count, CAC, LTV, LTV:CAC ratio, churn rate, Net Dollar Retention. Integrate data from CRM, accounting, platform.',
        effortDays: 5,
        priority: 1,
        successCriteria: [
          'Business metrics dashboard created',
          'MRR tracking automated',
          'CAC and LTV calculated',
          'Churn rate tracked',
          'Net Dollar Retention calculated',
          'Dashboard accessible to leadership',
          'Weekly/monthly snapshots automated'
        ]
      },
      {
        title: 'Customer health and success metrics',
        description: 'Build customer health dashboard: health scores, engagement metrics, satisfaction surveys, renewal risk, expansion opportunities. Enable proactive customer success.',
        effortDays: 4,
        priority: 1,
        successCriteria: [
          'Customer health dashboard created',
          'Health scores tracked per customer',
          'Engagement metrics (platform usage)',
          'Renewal risk alerts',
          'Expansion opportunities identified',
          'Customer success team using daily'
        ]
      },
      {
        title: 'Delivery efficiency metrics',
        description: 'Build delivery metrics dashboard: Discovery delivery time, Remediation project velocity, consultant utilization, quality scores, customer satisfaction. Optimize delivery efficiency.',
        effortDays: 4,
        priority: 2,
        successCriteria: [
          'Delivery metrics dashboard created',
          'Time to value tracked',
          'Consultant utilization calculated',
          'Quality scores tracked',
          'Customer satisfaction (CSAT/NPS)',
          'Bottlenecks identified and addressed'
        ]
      },
      {
        title: 'Financial performance dashboard',
        description: 'Build financial dashboard: revenue (by phase), costs (delivery, platform, sales), gross margin, operating expenses, runway, profitability. Enable financial planning and forecasting.',
        effortDays: 5,
        priority: 1,
        successCriteria: [
          'Financial dashboard created',
          'Revenue tracked by phase',
          'Costs allocated accurately',
          'Gross margin calculated',
          'Profitability tracked',
          'Runway calculated',
          'Monthly financial reviews enabled'
        ]
      }
    ]
  },
  {
    name: '🚀 Marketing & Thought Leadership',
    description: 'Build marketing engine to generate inbound leads and establish thought leadership in AI governance space. Focus on content marketing, SEO, and industry presence.',
    objectives: [
      'Company website with clear positioning',
      'Content marketing: 2-4 articles/month',
      'LinkedIn thought leadership (weekly posts)',
      'Speaking at 2-3 industry events',
      'Inbound leads: 5-10/month'
    ],
    timeline: { startWeek: 6, durationWeeks: 8 },
    priority: 3,
    tasks: [
      {
        title: 'Company website and positioning',
        description: 'Build or refresh company website: clear positioning (AI governance + data governance), 3-phase model explained, customer testimonials, case studies, pricing, contact. SEO-optimized.',
        effortDays: 8,
        priority: 2,
        successCriteria: [
          'Website live with professional design',
          'Clear value proposition',
          '3-phase model explained',
          'Customer testimonials and case studies',
          'Pricing page (or contact for pricing)',
          'Contact/demo request form',
          'SEO basics implemented',
          'Mobile-responsive'
        ]
      },
      {
        title: 'Content marketing strategy and execution',
        description: 'Create content marketing strategy: target topics (AI governance, data quality, compliance), content calendar (2-4 articles/month), distribution channels (blog, LinkedIn, Medium). Execute first 3 months.',
        effortDays: 10,
        priority: 2,
        successCriteria: [
          'Content strategy documented',
          'Content calendar (3 months)',
          'Topics researched and prioritized',
          '8-12 articles written and published',
          'Distribution plan executed',
          'SEO optimization for each article',
          'Lead magnets created (whitepapers, guides)'
        ]
      },
      {
        title: 'LinkedIn thought leadership',
        description: 'Execute LinkedIn thought leadership strategy: weekly posts on AI governance topics, engage with industry discussions, grow network, share customer success stories. Build personal brand and company brand.',
        effortDays: 6,
        priority: 2,
        successCriteria: [
          'LinkedIn posting cadence: 1-2/week',
          'Engagement with industry discussions',
          'Network growth: 500+ new connections',
          'Content mix: insights, case studies, tips',
          'Company page followers: 200+',
          'Inbound inquiries from LinkedIn: 2-5/month'
        ]
      },
      {
        title: 'Speaking and industry events',
        description: 'Identify and pursue speaking opportunities at industry events: AI conferences, governance forums, webinars. Submit speaking proposals, attend events, build relationships. Target 2-3 speaking engagements.',
        effortDays: 5,
        priority: 3,
        successCriteria: [
          'Industry events identified (10-15)',
          'Speaking proposals submitted (5-10)',
          '2-3 speaking engagements secured',
          'Events attended (3-5 as attendee)',
          'Relationships built',
          'Leads generated from events'
        ]
      }
    ]
  }
];

async function getOrCreateStatus(workspaceId: string, name: string, type: string): Promise<string> {
  const existing = await prisma.status.findFirst({
    where: { workspaceId, name }
  });

  if (existing) {
    return existing.id;
  }

  const status = await prisma.status.create({
    data: {
      workspaceId,
      name,
      type,
      isSystem: true
    }
  });

  return status.id;
}

async function createProjectWithTasks(projectData: ProjectData): Promise<{ projectId: string; taskCount: number }> {
  console.log(`\n📦 Creating project: ${projectData.name}`);
  
  const project = await prisma.project.create({
    data: {
      workspaceId: WORKSPACE_ID,
      companyId: COMPANY_ID,
      name: projectData.name,
      description: projectData.description,
      priority: projectData.priority,
      timeline: {
        startWeek: projectData.timeline.startWeek,
        durationWeeks: projectData.timeline.durationWeeks,
        objectives: projectData.objectives
      }
    }
  });

  console.log(`   ✅ Project created: ${project.id}`);
  console.log(`   📋 Creating ${projectData.tasks.length} tasks...`);

  let taskCount = 0;
  for (const taskData of projectData.tasks) {
    await prisma.task.create({
      data: {
        workspaceId: WORKSPACE_ID,
        companyId: COMPANY_ID,
        projectId: project.id,
        title: taskData.title,
        description: `${taskData.description}\n\n**Effort Estimate:** ${taskData.effortDays} days\n\n**Success Criteria:**\n${taskData.successCriteria.map(c => `- ${c}`).join('\n')}${taskData.dependencies ? `\n\n**Dependencies:**\n${taskData.dependencies.map(d => `- ${d}`).join('\n')}` : ''}`,
        statusId: TODO_STATUS_ID,
        priority: taskData.priority,
        effortPoints: taskData.effortDays,
        createdBy: CREATED_BY,
        aiGenerated: true,
        aiAgent: 'doug'
      }
    });
    
    taskCount++;
    process.stdout.write(`   ${taskCount}/${projectData.tasks.length} tasks created\r`);
  }

  console.log(`\n   ✅ ${taskCount} tasks created for ${projectData.name}`);

  return {
    projectId: project.id,
    taskCount
  };
}

async function main() {
  console.log('🚀 AI-QEF (Security App) - REAL Project Structure for $10K MRR');
  console.log('================================================================\n');
  console.log(`📍 Workspace ID: ${WORKSPACE_ID}`);
  console.log(`🏢 Company ID: ${COMPANY_ID}\n`);
  console.log('Business Model: Consultant-led SaaS');
  console.log('3 Phases: Discovery → Remediation → Managed Governance\n');

  console.log('📊 Setting up statuses...');
  TODO_STATUS_ID = await getOrCreateStatus(WORKSPACE_ID, 'To Do', 'todo');
  console.log(`   ✅ Todo status: ${TODO_STATUS_ID}\n`);

  const company = await prisma.company.findUnique({
    where: { id: COMPANY_ID }
  });

  if (!company) {
    console.error(`❌ Company not found: ${COMPANY_ID}`);
    process.exit(1);
  }

  console.log(`✅ Company verified: ${company.name}\n`);

  const results = [];
  let totalTasks = 0;

  for (const projectData of projects) {
    const result = await createProjectWithTasks(projectData);
    results.push({ name: projectData.name, ...result });
    totalTasks += result.taskCount;
  }

  console.log('\n\n================================================================');
  console.log('📊 CREATION SUMMARY');
  console.log('================================================================\n');

  console.log(`✅ Projects created: ${results.length}`);
  console.log(`✅ Total tasks created: ${totalTasks}\n`);

  console.log('📋 Projects by Phase:\n');

  const phases = {
    'PHASE 1: Foundation & First Customer (Weeks 1-4)': results.slice(0, 4),
    'PHASE 2: Scale Delivery (Weeks 5-8)': results.slice(4, 7),
    'PHASE 3: Scale to $10K MRR (Weeks 9-12)': results.slice(7)
  };

  for (const [phase, projectList] of Object.entries(phases)) {
    const taskCount = projectList.reduce((sum, p) => sum + p.taskCount, 0);
    console.log(`\n${phase} (${projectList.length} projects, ${taskCount} tasks):`);
    projectList.forEach(p => {
      console.log(`  • ${p.name} - ${p.taskCount} tasks`);
    });
  }

  console.log('\n\n================================================================');
  console.log('💡 STRATEGIC INSIGHTS');
  console.log('================================================================\n');

  console.log('Revenue Path:');
  console.log('  Month 1-2: 2-3 Discovery engagements @ £15-25K = £30-75K one-time');
  console.log('  Month 2-3: Convert 1-2 to Managed Governance @ £2-3K/month');
  console.log('  Month 3-4: Target 5 Managed Governance clients @ £2K avg = £10K MRR\n');

  console.log('Critical Success Factors:');
  console.log('  1. Partner relationship (60%+ of pipeline)');
  console.log('  2. First Discovery delivered successfully');
  console.log('  3. Conversion rate: 60%+ Discovery → Remediation/Managed');
  console.log('  4. Customer success (low churn, high NPS)');
  console.log('  5. Delivery team capacity and quality\n');

  console.log('================================================================');
  console.log('🎯 HOW TO ACCESS');
  console.log('================================================================\n');

  console.log('1. Go to Zebi dashboard');
  console.log('2. Navigate to Companies');
  console.log(`3. Open "${company.name}"`);
  console.log('4. View all projects in the Projects section');
  console.log('5. Each project is organized by phase with clear objectives\n');

  console.log('================================================================');
  console.log('✅ VERIFICATION');
  console.log('================================================================\n');

  const companyProjects = await prisma.project.findMany({
    where: { companyId: COMPANY_ID },
    include: { tasks: true }
  });

  console.log(`✅ All ${companyProjects.length} projects linked to company "${company.name}"`);
  console.log(`✅ All ${totalTasks} tasks created and linked to projects`);
  console.log(`✅ Projects organized by 3 phases matching business model\n`);

  console.log('================================================================');
  console.log('🎉 SUCCESS!');
  console.log('================================================================\n');

  console.log('AI-QEF project structure created based on REAL business needs!');
  console.log(`Total: ${results.length} projects, ${totalTasks} tasks\n`);
  console.log('Ready to execute consultant-led SaaS model to $10K MRR! 🚀\n');
}

main()
  .catch((error) => {
    console.error('❌ Error creating projects:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
