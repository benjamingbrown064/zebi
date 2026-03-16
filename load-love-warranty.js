#!/usr/bin/env node

/**
 * Complete Love Warranty Growth Plan Loader
 * Loads all objectives, projects, and tasks into Zebi database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const COMPANY_ID = 'a50c15be-afec-49fa-81d3-0bb34570b74b';
const BENJAMIN_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';

// Task size to effort mapping
const EFFORT_MAP = {
  small: 2,
  medium: 5,
  large: 8,
  xlarge: 13
};

// Calculate deadline from days
function getDeadline(days) {
  const date = new Date('2026-03-16'); // Start date
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// Complete workstream structure with ALL projects and tasks
const COMPLETE_STRUCTURE = [
  {
    code: 'H',
    name: 'Business Management',
    description: 'Define team structure, roles, decision rights, and management dashboards',
    priority: 1,
    deadline: getDeadline(7),
    projects: [
      {
        name: 'Define organization structure',
        tasks: [
          { title: 'Define all roles and reporting lines', assignee: 'benjamin', size: 'large' },
          { title: 'Assign workstream owners for all 10 workstreams', assignee: 'benjamin', size: 'large' },
          { title: 'Clarify decision rights at each level', assignee: 'benjamin', size: 'medium' },
          { title: 'Document organization structure', assignee: 'ai', size: 'small' },
          { title: 'Create workstream owner contact list', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Establish governance framework',
        tasks: [
          { title: 'Define weekly review cadence and format', assignee: 'benjamin', size: 'medium' },
          { title: 'Establish escalation and decision-making process', assignee: 'benjamin', size: 'medium' },
          { title: 'Set up project tracking mechanisms', assignee: 'ai', size: 'small' },
          { title: 'Create governance documentation', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Set up management dashboards',
        tasks: [
          { title: 'Define key management metrics and KPIs', assignee: 'benjamin', size: 'medium' },
          { title: 'Design management dashboard layout', assignee: 'ai', size: 'medium' },
          { title: 'Set up automated reporting mechanisms', assignee: 'ai', size: 'medium' },
          { title: 'Create executive summary template', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Define KPI framework',
        tasks: [
          { title: 'Establish company-wide KPI structure', assignee: 'benjamin', size: 'medium' },
          { title: 'Set baseline metrics for each workstream', assignee: 'ai', size: 'medium' },
          { title: 'Create KPI tracking dashboard', assignee: 'ai', size: 'medium' },
          { title: 'Document KPI definitions and calculation methods', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Establish resource allocation process',
        tasks: [
          { title: 'Define budget allocation framework', assignee: 'benjamin', size: 'medium' },
          { title: 'Create resource request and approval process', assignee: 'benjamin', size: 'small' },
          { title: 'Set up capacity planning tools', assignee: 'ai', size: 'medium' },
          { title: 'Document resource allocation guidelines', assignee: 'ai', size: 'small' }
        ]
      }
    ]
  },
  {
    code: 'A',
    name: 'Claims and Customer Support',
    description: 'Systematize claims approval framework and customer operations',
    priority: 1,
    deadline: getDeadline(30),
    projects: [
      {
        name: 'Refine the claims process',
        tasks: [
          { title: 'Map current claims process from first contact to closure', assignee: 'benjamin', size: 'small' },
          { title: 'Identify gaps, delays, inconsistencies, and repeated issues', assignee: 'benjamin', size: 'small' },
          { title: 'Define required stages of claims journey', assignee: 'benjamin', size: 'medium' },
          { title: 'Document ideal claims workflow', assignee: 'ai', size: 'medium' },
          { title: 'Create claims process documentation', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Improve the support process',
        tasks: [
          { title: 'Map current support workflow and touchpoints', assignee: 'benjamin', size: 'small' },
          { title: 'Define support tiers and escalation paths', assignee: 'benjamin', size: 'medium' },
          { title: 'Create support process documentation', assignee: 'ai', size: 'medium' },
          { title: 'Set up support ticket tracking system', assignee: 'ai', size: 'medium' },
          { title: 'Create support team training materials', assignee: 'ai', size: 'medium' }
        ]
      },
      {
        name: 'Create approval and rejection clarity',
        tasks: [
          { title: 'Define clear approval criteria for each claim type', assignee: 'benjamin', size: 'medium' },
          { title: 'Establish rejection criteria and documentation requirements', assignee: 'benjamin', size: 'medium' },
          { title: 'Create decision tree for claims adjudication', assignee: 'ai', size: 'medium' },
          { title: 'Document approval and rejection frameworks', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Set up AI support process',
        tasks: [
          { title: 'Define AI support scope and limitations', assignee: 'benjamin', size: 'medium' },
          { title: 'Identify AI support use cases', assignee: 'ai', size: 'medium' },
          { title: 'Design AI-human handoff process', assignee: 'ai', size: 'medium' },
          { title: 'Set up AI support system', assignee: 'ai', size: 'large' },
          { title: 'Create AI support training materials', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Set support and claims KPIs',
        tasks: [
          { title: 'Define claims processing SLA targets', assignee: 'benjamin', size: 'medium' },
          { title: 'Establish support response time targets', assignee: 'benjamin', size: 'small' },
          { title: 'Set customer satisfaction measurement framework', assignee: 'benjamin', size: 'small' },
          { title: 'Create KPI tracking dashboard', assignee: 'ai', size: 'medium' },
          { title: 'Document all KPI definitions', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Build claims system',
        tasks: [
          { title: 'Define claims system technical requirements', assignee: 'benjamin', size: 'medium' },
          { title: 'Design claims database schema', assignee: 'ai', size: 'medium' },
          { title: 'Build claims submission interface', assignee: 'ai', size: 'large' },
          { title: 'Build claims adjudication workflow', assignee: 'ai', size: 'large' },
          { title: 'Set up claims status notifications', assignee: 'ai', size: 'medium' },
          { title: 'Test claims system end-to-end', assignee: 'ai', size: 'medium' }
        ]
      }
    ]
  },
  {
    code: 'B',
    name: 'Technical and Internal Enablement',
    description: 'Establish technical infrastructure and internal enablement',
    priority: 1,
    deadline: getDeadline(30),
    projects: [
      {
        name: 'Set up internal tools',
        tasks: [
          { title: 'Audit current internal tool stack', assignee: 'ai', size: 'small' },
          { title: 'Identify tool gaps and requirements', assignee: 'benjamin', size: 'medium' },
          { title: 'Select and procure needed tools', assignee: 'benjamin', size: 'medium' },
          { title: 'Configure and integrate internal tools', assignee: 'ai', size: 'large' },
          { title: 'Create tool usage documentation', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Establish team training program',
        tasks: [
          { title: 'Define training needs by role', assignee: 'benjamin', size: 'medium' },
          { title: 'Create onboarding training program', assignee: 'ai', size: 'medium' },
          { title: 'Develop ongoing training curriculum', assignee: 'ai', size: 'medium' },
          { title: 'Set up training tracking and assessment', assignee: 'ai', size: 'small' },
          { title: 'Create training materials library', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Create internal knowledge base',
        tasks: [
          { title: 'Define knowledge base structure and taxonomy', assignee: 'benjamin', size: 'small' },
          { title: 'Set up knowledge base platform', assignee: 'ai', size: 'medium' },
          { title: 'Create initial documentation', assignee: 'ai', size: 'large' },
          { title: 'Establish documentation maintenance process', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Define technical standards',
        tasks: [
          { title: 'Establish code quality and testing standards', assignee: 'benjamin', size: 'medium' },
          { title: 'Define security and compliance requirements', assignee: 'benjamin', size: 'medium' },
          { title: 'Create technical documentation standards', assignee: 'ai', size: 'small' },
          { title: 'Set up code review process', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Set up development environment',
        tasks: [
          { title: 'Define development environment requirements', assignee: 'benjamin', size: 'small' },
          { title: 'Set up version control and CI/CD', assignee: 'ai', size: 'medium' },
          { title: 'Configure development tools and IDE setup', assignee: 'ai', size: 'medium' },
          { title: 'Create environment setup documentation', assignee: 'ai', size: 'small' }
        ]
      }
    ]
  },
  {
    code: 'C',
    name: 'Product and Software',
    description: 'Define product engine requirements and build sequencing',
    priority: 2,
    deadline: getDeadline(90),
    projects: [
      {
        name: 'Product Engine requirements',
        tasks: [
          { title: 'Define product/pricing engine core requirements', assignee: 'benjamin', size: 'large' },
          { title: 'Establish pricing algorithm and rules', assignee: 'benjamin', size: 'large' },
          { title: 'Define product configuration data model', assignee: 'benjamin', size: 'medium' },
          { title: 'Document product engine technical specifications', assignee: 'ai', size: 'medium' },
          { title: 'Create product engine API documentation', assignee: 'ai', size: 'medium' }
        ]
      },
      {
        name: 'Product Engine build',
        tasks: [
          { title: 'Design product engine architecture', assignee: 'ai', size: 'large' },
          { title: 'Build core pricing calculation engine', assignee: 'ai', size: 'xlarge' },
          { title: 'Build product configuration interface', assignee: 'ai', size: 'large' },
          { title: 'Implement pricing rules engine', assignee: 'ai', size: 'large' },
          { title: 'Build product data management system', assignee: 'ai', size: 'large' },
          { title: 'Test product engine thoroughly', assignee: 'ai', size: 'medium' },
          { title: 'Deploy product engine to production', assignee: 'ai', size: 'medium' }
        ]
      },
      {
        name: 'CRM system requirements',
        tasks: [
          { title: 'Define CRM core requirements', assignee: 'benjamin', size: 'medium' },
          { title: 'Establish dealer and customer data models', assignee: 'benjamin', size: 'medium' },
          { title: 'Define CRM workflow requirements', assignee: 'ai', size: 'medium' },
          { title: 'Document CRM technical specifications', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'CRM system build',
        tasks: [
          { title: 'Design CRM database schema', assignee: 'ai', size: 'medium' },
          { title: 'Build dealer management interface', assignee: 'ai', size: 'large' },
          { title: 'Build customer management interface', assignee: 'ai', size: 'large' },
          { title: 'Build contact and communication tracking', assignee: 'ai', size: 'large' },
          { title: 'Integrate CRM with product engine', assignee: 'ai', size: 'medium' },
          { title: 'Migrate existing dealer and customer data', assignee: 'ai', size: 'medium' },
          { title: 'Test CRM system end-to-end', assignee: 'ai', size: 'medium' },
          { title: 'Deploy CRM to production', assignee: 'ai', size: 'medium' }
        ]
      },
      {
        name: 'Product roadmap planning',
        tasks: [
          { title: 'Define 6-month product roadmap', assignee: 'benjamin', size: 'medium' },
          { title: 'Prioritize feature development', assignee: 'benjamin', size: 'medium' },
          { title: 'Establish product release cadence', assignee: 'benjamin', size: 'small' },
          { title: 'Create product roadmap documentation', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Quality assurance framework',
        tasks: [
          { title: 'Define QA processes and standards', assignee: 'benjamin', size: 'medium' },
          { title: 'Set up automated testing framework', assignee: 'ai', size: 'large' },
          { title: 'Create test case library', assignee: 'ai', size: 'medium' },
          { title: 'Establish bug tracking and resolution process', assignee: 'ai', size: 'small' }
        ]
      }
    ]
  },
  {
    code: 'D',
    name: 'Brand',
    description: 'Define brand position, tone of voice, and key messaging pillars',
    priority: 4,
    deadline: getDeadline(180),
    projects: [
      {
        name: 'Define brand positioning',
        tasks: [
          { title: 'Conduct brand positioning workshop', assignee: 'benjamin', size: 'large' },
          { title: 'Define brand values and personality', assignee: 'benjamin', size: 'medium' },
          { title: 'Create brand positioning statement', assignee: 'benjamin', size: 'medium' },
          { title: 'Document brand guidelines', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Establish tone of voice',
        tasks: [
          { title: 'Define brand tone of voice principles', assignee: 'benjamin', size: 'medium' },
          { title: 'Create tone of voice examples and guidelines', assignee: 'ai', size: 'medium' },
          { title: 'Develop copy templates for different channels', assignee: 'ai', size: 'medium' },
          { title: 'Create tone of voice training materials', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Develop messaging framework',
        tasks: [
          { title: 'Define key messaging pillars', assignee: 'benjamin', size: 'medium' },
          { title: 'Create value propositions for different audiences', assignee: 'benjamin', size: 'medium' },
          { title: 'Develop messaging hierarchy', assignee: 'ai', size: 'small' },
          { title: 'Create messaging guide document', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Create visual identity',
        tasks: [
          { title: 'Review and refine logo and brand marks', assignee: 'benjamin', size: 'medium' },
          { title: 'Define color palette and typography', assignee: 'ai', size: 'medium' },
          { title: 'Create visual identity guidelines', assignee: 'ai', size: 'medium' },
          { title: 'Design brand assets library', assignee: 'ai', size: 'medium' }
        ]
      },
      {
        name: 'Build brand website',
        tasks: [
          { title: 'Define website structure and sitemap', assignee: 'benjamin', size: 'medium' },
          { title: 'Create website content and copy', assignee: 'ai', size: 'large' },
          { title: 'Design website UI/UX', assignee: 'ai', size: 'large' },
          { title: 'Build and deploy website', assignee: 'ai', size: 'large' },
          { title: 'Set up website analytics', assignee: 'ai', size: 'small' }
        ]
      }
    ]
  },
  {
    code: 'E',
    name: 'Marketing',
    description: 'Establish marketing strategy and execution',
    priority: 3,
    deadline: getDeadline(120),
    projects: [
      {
        name: 'Develop marketing strategy',
        tasks: [
          { title: 'Define target audiences and personas', assignee: 'benjamin', size: 'medium' },
          { title: 'Establish marketing goals and KPIs', assignee: 'benjamin', size: 'medium' },
          { title: 'Create marketing channel strategy', assignee: 'benjamin', size: 'medium' },
          { title: 'Document marketing strategy', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Create marketing materials',
        tasks: [
          { title: 'Design dealer marketing collateral', assignee: 'ai', size: 'large' },
          { title: 'Create customer-facing materials', assignee: 'ai', size: 'large' },
          { title: 'Develop email marketing templates', assignee: 'ai', size: 'medium' },
          { title: 'Create social media assets', assignee: 'ai', size: 'medium' }
        ]
      },
      {
        name: 'Set up email marketing',
        tasks: [
          { title: 'Select and configure email marketing platform', assignee: 'ai', size: 'medium' },
          { title: 'Create email campaign templates', assignee: 'ai', size: 'medium' },
          { title: 'Build email automation workflows', assignee: 'ai', size: 'medium' },
          { title: 'Set up email analytics and tracking', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Establish content marketing',
        tasks: [
          { title: 'Define content marketing strategy', assignee: 'benjamin', size: 'medium' },
          { title: 'Create content calendar and themes', assignee: 'ai', size: 'medium' },
          { title: 'Develop initial content pieces', assignee: 'ai', size: 'large' },
          { title: 'Set up content distribution channels', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Launch marketing campaigns',
        tasks: [
          { title: 'Plan initial campaign strategy', assignee: 'benjamin', size: 'medium' },
          { title: 'Create campaign creative assets', assignee: 'ai', size: 'large' },
          { title: 'Execute campaign launches', assignee: 'ai', size: 'medium' },
          { title: 'Monitor and optimize campaign performance', assignee: 'ai', size: 'medium' }
        ]
      }
    ]
  },
  {
    code: 'F',
    name: 'Sales',
    description: 'Define dealer qualification criteria and sales process',
    priority: 3,
    deadline: getDeadline(120),
    projects: [
      {
        name: 'Define sales strategy',
        tasks: [
          { title: 'Establish dealer qualification criteria', assignee: 'benjamin', size: 'medium' },
          { title: 'Define sales targets and territories', assignee: 'benjamin', size: 'medium' },
          { title: 'Create ideal customer profile', assignee: 'benjamin', size: 'small' },
          { title: 'Document sales strategy', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Build sales process',
        tasks: [
          { title: 'Map out sales funnel stages', assignee: 'benjamin', size: 'medium' },
          { title: 'Define qualification and discovery process', assignee: 'benjamin', size: 'medium' },
          { title: 'Create sales playbook', assignee: 'ai', size: 'medium' },
          { title: 'Develop sales scripts and templates', assignee: 'ai', size: 'medium' }
        ]
      },
      {
        name: 'Create sales materials',
        tasks: [
          { title: 'Design sales presentation deck', assignee: 'ai', size: 'large' },
          { title: 'Create product specification sheets', assignee: 'ai', size: 'medium' },
          { title: 'Develop ROI calculators and tools', assignee: 'ai', size: 'medium' },
          { title: 'Build proposal templates', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Establish sales operations',
        tasks: [
          { title: 'Set up sales pipeline management', assignee: 'ai', size: 'medium' },
          { title: 'Configure CRM for sales tracking', assignee: 'ai', size: 'medium' },
          { title: 'Create sales reporting dashboard', assignee: 'ai', size: 'medium' },
          { title: 'Establish sales forecasting process', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Build sales team',
        tasks: [
          { title: 'Define sales team structure and roles', assignee: 'benjamin', size: 'medium' },
          { title: 'Create sales hiring criteria', assignee: 'benjamin', size: 'small' },
          { title: 'Develop sales training program', assignee: 'ai', size: 'medium' },
          { title: 'Set up sales compensation plan', assignee: 'benjamin', size: 'medium' }
        ]
      }
    ]
  },
  {
    code: 'G',
    name: 'Onboarding',
    description: 'Define standardized onboarding checklist and success metrics',
    priority: 1,
    deadline: getDeadline(30),
    projects: [
      {
        name: 'Create dealer onboarding process',
        tasks: [
          { title: 'Map ideal dealer onboarding journey', assignee: 'benjamin', size: 'medium' },
          { title: 'Define onboarding stages and milestones', assignee: 'benjamin', size: 'medium' },
          { title: 'Create onboarding checklist', assignee: 'ai', size: 'medium' },
          { title: 'Document onboarding process', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Develop onboarding materials',
        tasks: [
          { title: 'Create dealer welcome pack', assignee: 'ai', size: 'medium' },
          { title: 'Build onboarding training modules', assignee: 'ai', size: 'large' },
          { title: 'Develop quick start guides', assignee: 'ai', size: 'medium' },
          { title: 'Create FAQ documentation', assignee: 'ai', size: 'medium' }
        ]
      },
      {
        name: 'Automate onboarding',
        tasks: [
          { title: 'Define onboarding automation requirements', assignee: 'benjamin', size: 'small' },
          { title: 'Build automated welcome sequence', assignee: 'ai', size: 'medium' },
          { title: 'Set up onboarding progress tracking', assignee: 'ai', size: 'medium' },
          { title: 'Create onboarding completion triggers', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Establish success metrics',
        tasks: [
          { title: 'Define onboarding success criteria', assignee: 'benjamin', size: 'medium' },
          { title: 'Set up onboarding KPI tracking', assignee: 'ai', size: 'small' },
          { title: 'Create onboarding analytics dashboard', assignee: 'ai', size: 'medium' },
          { title: 'Establish feedback collection process', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Create ongoing support program',
        tasks: [
          { title: 'Define post-onboarding support structure', assignee: 'benjamin', size: 'small' },
          { title: 'Create dealer success playbook', assignee: 'ai', size: 'medium' },
          { title: 'Set up regular check-in cadence', assignee: 'ai', size: 'small' },
          { title: 'Build dealer community platform', assignee: 'ai', size: 'large' }
        ]
      }
    ]
  },
  {
    code: 'H2',
    name: 'Dealer Management',
    description: 'Establish dealer review framework and relationship management',
    priority: 1,
    deadline: getDeadline(30),
    projects: [
      {
        name: 'Create dealer review framework',
        tasks: [
          { title: 'Define dealer performance criteria', assignee: 'benjamin', size: 'medium' },
          { title: 'Establish review frequency and format', assignee: 'benjamin', size: 'small' },
          { title: 'Create dealer scorecard template', assignee: 'ai', size: 'medium' },
          { title: 'Document review framework', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Build dealer portal',
        tasks: [
          { title: 'Define dealer portal requirements', assignee: 'benjamin', size: 'medium' },
          { title: 'Design dealer portal UI/UX', assignee: 'ai', size: 'medium' },
          { title: 'Build dealer portal features', assignee: 'ai', size: 'large' },
          { title: 'Integrate portal with CRM and reporting', assignee: 'ai', size: 'medium' }
        ]
      },
      {
        name: 'Establish dealer communication',
        tasks: [
          { title: 'Define dealer communication strategy', assignee: 'benjamin', size: 'small' },
          { title: 'Create dealer newsletter template', assignee: 'ai', size: 'medium' },
          { title: 'Set up dealer communication channels', assignee: 'ai', size: 'medium' },
          { title: 'Build dealer announcement system', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Create dealer incentive program',
        tasks: [
          { title: 'Define dealer incentive structure', assignee: 'benjamin', size: 'medium' },
          { title: 'Establish reward tiers and criteria', assignee: 'benjamin', size: 'medium' },
          { title: 'Create incentive program documentation', assignee: 'ai', size: 'small' },
          { title: 'Build incentive tracking system', assignee: 'ai', size: 'medium' }
        ]
      },
      {
        name: 'Set up dealer analytics',
        tasks: [
          { title: 'Define dealer performance metrics', assignee: 'benjamin', size: 'medium' },
          { title: 'Create dealer analytics dashboard', assignee: 'ai', size: 'large' },
          { title: 'Set up automated dealer reporting', assignee: 'ai', size: 'medium' },
          { title: 'Build dealer benchmarking tools', assignee: 'ai', size: 'medium' }
        ]
      }
    ]
  },
  {
    code: 'I',
    name: 'US Growth',
    description: 'Prepare US expansion: L1A visa, Delaware entity, insurance partnerships',
    priority: 4,
    deadline: getDeadline(180),
    projects: [
      {
        name: 'Legal entity setup',
        tasks: [
          { title: 'Research Delaware entity formation requirements', assignee: 'ai', size: 'medium' },
          { title: 'Engage legal counsel for US entity formation', assignee: 'benjamin', size: 'medium' },
          { title: 'Complete Delaware entity registration', assignee: 'benjamin', size: 'medium' },
          { title: 'Set up US bank account and financial infrastructure', assignee: 'ai', size: 'medium' }
        ]
      },
      {
        name: 'L1A visa preparation',
        tasks: [
          { title: 'Research L1A visa requirements and process', assignee: 'ai', size: 'medium' },
          { title: 'Engage immigration attorney', assignee: 'benjamin', size: 'medium' },
          { title: 'Prepare L1A visa application documents', assignee: 'ai', size: 'large' },
          { title: 'Submit and track L1A visa application', assignee: 'benjamin', size: 'small' }
        ]
      },
      {
        name: 'US market research',
        tasks: [
          { title: 'Conduct US automotive warranty market analysis', assignee: 'ai', size: 'large' },
          { title: 'Identify target US dealer markets', assignee: 'ai', size: 'medium' },
          { title: 'Research US regulatory requirements', assignee: 'ai', size: 'medium' },
          { title: 'Analyze competitive landscape in US', assignee: 'ai', size: 'medium' }
        ]
      },
      {
        name: 'US insurance partnerships',
        tasks: [
          { title: 'Research US insurance partners and requirements', assignee: 'ai', size: 'medium' },
          { title: 'Identify and approach potential partners', assignee: 'benjamin', size: 'large' },
          { title: 'Negotiate partnership terms', assignee: 'benjamin', size: 'large' },
          { title: 'Finalize insurance partnerships', assignee: 'benjamin', size: 'medium' }
        ]
      }
    ]
  },
  {
    code: 'J',
    name: 'Partners',
    description: 'Assess partnership opportunities and define integration approach',
    priority: 4,
    deadline: getDeadline(180),
    projects: [
      {
        name: 'Partnership strategy',
        tasks: [
          { title: 'Define partnership evaluation criteria', assignee: 'benjamin', size: 'medium' },
          { title: 'Identify potential strategic partners', assignee: 'ai', size: 'medium' },
          { title: 'Create partnership prioritization framework', assignee: 'benjamin', size: 'small' },
          { title: 'Document partnership strategy', assignee: 'ai', size: 'small' }
        ]
      },
      {
        name: 'Bumper partnership assessment',
        tasks: [
          { title: 'Research Bumper integration capabilities', assignee: 'ai', size: 'medium' },
          { title: 'Evaluate Bumper partnership potential', assignee: 'benjamin', size: 'medium' },
          { title: 'Define Bumper integration approach', assignee: 'ai', size: 'medium' },
          { title: 'Initiate Bumper partnership discussions', assignee: 'benjamin', size: 'medium' }
        ]
      },
      {
        name: 'Autofacets integration',
        tasks: [
          { title: 'Research Autofacets integration requirements', assignee: 'ai', size: 'medium' },
          { title: 'Assess Autofacets integration value', assignee: 'benjamin', size: 'medium' },
          { title: 'Design Autofacets integration architecture', assignee: 'ai', size: 'large' },
          { title: 'Build Autofacets integration', assignee: 'ai', size: 'large' }
        ]
      },
      {
        name: 'Stripe integration',
        tasks: [
          { title: 'Define payment processing requirements', assignee: 'benjamin', size: 'small' },
          { title: 'Design Stripe integration architecture', assignee: 'ai', size: 'medium' },
          { title: 'Build Stripe payment integration', assignee: 'ai', size: 'large' },
          { title: 'Test Stripe integration end-to-end', assignee: 'ai', size: 'medium' }
        ]
      }
    ]
  }
];

async function cleanUpExistingData() {
  console.log('🧹 Step 1: Cleaning up existing Love Warranty data...\n');
  
  try {
    // Get all objectives for Love Warranty
    const existingObjectives = await prisma.objective.findMany({
      where: { companyId: COMPANY_ID },
      include: {
        projects: {
          include: {
            tasks: true
          }
        }
      }
    });

    let deletedTasks = 0;
    let deletedProjects = 0;
    let deletedObjectives = 0;

    // Delete tasks
    for (const objective of existingObjectives) {
      for (const project of objective.projects) {
        const taskCount = await prisma.task.deleteMany({
          where: { projectId: project.id }
        });
        deletedTasks += taskCount.count;
      }
      
      // Delete projects
      const projectCount = await prisma.project.deleteMany({
        where: { objectiveId: objective.id }
      });
      deletedProjects += projectCount.count;
    }

    // Delete objectives
    const objectiveCount = await prisma.objective.deleteMany({
      where: { companyId: COMPANY_ID }
    });
    deletedObjectives = objectiveCount.count;

    console.log(`✅ Deleted: ${deletedObjectives} objectives, ${deletedProjects} projects, ${deletedTasks} tasks\n`);
    
    return { deletedObjectives, deletedProjects, deletedTasks };
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

async function createStructure() {
  console.log('🏗️  Step 2: Creating new structure...\n');
  
  // Get "To Do" status ID for this workspace
  const todoStatus = await prisma.status.findFirst({
    where: {
      workspaceId: WORKSPACE_ID,
      name: 'To Do'
    }
  });

  if (!todoStatus) {
    throw new Error('To Do status not found for workspace');
  }

  const stats = {
    objectives: 0,
    projects: 0,
    tasks: 0
  };

  try {
    for (const workstream of COMPLETE_STRUCTURE) {
      console.log(`📋 Creating objective: ${workstream.name}`);
      
      // Create objective
      const objective = await prisma.objective.create({
        data: {
          title: workstream.name,
          description: workstream.description,
          objectiveType: 'operational',
          metricType: 'completion',
          targetValue: 100,
          currentValue: 0,
          unit: '%',
          startDate: new Date('2026-03-16'),
          deadline: workstream.deadline,
          priority: workstream.priority,
          status: 'active',
          createdBy: BENJAMIN_ID,
          workspace: {
            connect: { id: WORKSPACE_ID }
          },
          company: {
            connect: { id: COMPANY_ID }
          }
        }
      });
      stats.objectives++;
      
      // Create projects
      for (const proj of workstream.projects) {
        console.log(`  📁 Creating project: ${proj.name}`);
        
        const project = await prisma.project.create({
          data: {
            name: proj.name,
            workspace: {
              connect: { id: WORKSPACE_ID }
            },
            objective: {
              connect: { id: objective.id }
            },
            company: {
              connect: { id: COMPANY_ID }
            }
          }
        });
        stats.projects++;
        
        // Create tasks
        for (const task of proj.tasks) {
          const assigneeId = task.assignee === 'benjamin' ? BENJAMIN_ID : null;
          const botAssignee = task.assignee === 'ai' ? 'doug' : null;
          
          const taskData = {
            title: task.title,
            status: {
              connect: { id: todoStatus.id }
            },
            effortPoints: EFFORT_MAP[task.size] || 2,
            assigneeId: assigneeId,
            botAssignee: botAssignee,
            createdBy: BENJAMIN_ID,
            workspace: {
              connect: { id: WORKSPACE_ID }
            },
            project: {
              connect: { id: project.id }
            },
            company: {
              connect: { id: COMPANY_ID }
            }
          };

          await prisma.task.create({ data: taskData });
          stats.tasks++;
        }
      }
    }

    console.log('\n✅ Structure created successfully!\n');
    return stats;
  } catch (error) {
    console.error('❌ Error creating structure:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Love Warranty Growth Plan Loader\n');
  console.log('='  .repeat(50));
  console.log('\n');

  try {
    // Step 1: Clean up
    const cleanupStats = await cleanUpExistingData();
    
    // Step 2: Create new structure
    const createStats = await createStructure();
    
    // Final report
    console.log('='  .repeat(50));
    console.log('\n📊 FINAL REPORT\n');
    console.log('Deleted:');
    console.log(`  - ${cleanupStats.deletedObjectives} objectives`);
    console.log(`  - ${cleanupStats.deletedProjects} projects`);
    console.log(`  - ${cleanupStats.deletedTasks} tasks`);
    console.log('\nCreated:');
    console.log(`  - ${createStats.objectives} objectives`);
    console.log(`  - ${createStats.projects} projects`);
    console.log(`  - ${createStats.tasks} tasks`);
    console.log('\n✅ All data is now live in Zebi at:');
    console.log('   https://zebi.app/objectives\n');
    console.log('='  .repeat(50));
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
