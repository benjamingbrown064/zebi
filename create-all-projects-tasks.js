const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';

// Complete project and task structure for all 9 objectives
const OBJECTIVE_STRUCTURE = {
  'Brand positioned for overwhelmed business owners': {
    deadline: '2026-03-20',
    projects: [
      {
        name: 'Brand Identity Finalization',
        description: 'Finalize all brand assets including logo, colors, typography, and visual guidelines to ensure consistent brand presentation.',
        tasks: [
          {
            title: 'Finalize brand logo',
            description: 'Create final logo variations (primary, secondary, icon) with clear usage guidelines. Must convey simplicity and clarity for overwhelmed business owners.',
            priority: 5,
            deadline: '2026-03-15'
          },
          {
            title: 'Define color palette',
            description: 'Establish primary and secondary color palette that feels calm, professional, and approachable. Include hex codes and usage rules.',
            priority: 5,
            deadline: '2026-03-15'
          },
          {
            title: 'Set typography guidelines',
            description: 'Choose and document primary and secondary fonts for headings, body text, and UI. Ensure readability and accessibility.',
            priority: 4,
            deadline: '2026-03-16'
          },
          {
            title: 'Write brand voice guidelines',
            description: 'Document tone of voice: supportive, clear, non-technical. Include do\'s and don\'ts with examples.',
            priority: 5,
            deadline: '2026-03-18'
          },
          {
            title: 'Create visual style guide',
            description: 'Compile comprehensive style guide with logo usage, colors, typography, imagery style, and UI patterns.',
            priority: 4,
            deadline: '2026-03-20'
          }
        ]
      },
      {
        name: 'Core Messaging Framework',
        description: 'Develop clear, compelling messaging that speaks directly to overwhelmed business owners and communicates Zebi\'s unique value.',
        tasks: [
          {
            title: 'Write positioning statement',
            description: 'Craft concise positioning: "Simple AI-powered execution system for overwhelmed business owners who need clarity, structure, and time back."',
            priority: 5,
            deadline: '2026-03-14'
          },
          {
            title: 'Document target customer pain points',
            description: 'List 8-10 specific pain points: feeling overwhelmed, scattered tasks, no clarity, wasted time, complexity overload, etc.',
            priority: 5,
            deadline: '2026-03-14'
          },
          {
            title: 'Create value propositions (3 variations)',
            description: 'Write 3 different value proposition variations to test which resonates best. Focus on clarity, time savings, and simplicity.',
            priority: 4,
            deadline: '2026-03-16'
          },
          {
            title: 'Develop target customer profiles',
            description: 'Create 2-3 detailed personas: solopreneur consultant, small agency owner, overwhelmed founder. Include goals, challenges, tech comfort.',
            priority: 4,
            deadline: '2026-03-17'
          },
          {
            title: 'Write elevator pitches (30s/60s/2min)',
            description: 'Craft three elevator pitch versions for different contexts. Must be clear, jargon-free, and compelling.',
            priority: 3,
            deadline: '2026-03-19'
          }
        ]
      },
      {
        name: 'Competitive Positioning',
        description: 'Research competitors and clearly define what makes Zebi unique and better for the target audience.',
        tasks: [
          {
            title: 'Research 5 key competitors',
            description: 'Analyze Asana, Monday, ClickUp, Notion, Todoist. Document pricing, target audience, complexity level, AI features.',
            priority: 4,
            deadline: '2026-03-15'
          },
          {
            title: 'Identify market gaps',
            description: 'Find gaps competitors miss: over-complexity, lack of AI guidance, poor focus on overwhelmed users, steep learning curves.',
            priority: 4,
            deadline: '2026-03-16'
          },
          {
            title: 'Document key differentiators',
            description: 'List Zebi\'s unique advantages: AI-powered simplicity, built for overwhelmed users, self-service clarity, execution focus.',
            priority: 5,
            deadline: '2026-03-17'
          },
          {
            title: 'Create comparison matrix',
            description: 'Build feature comparison table: Zebi vs top 3 competitors. Highlight simplicity, AI features, and ease of use.',
            priority: 3,
            deadline: '2026-03-20'
          }
        ]
      }
    ]
  },

  'Landing page converting visitors to early access signups': {
    deadline: '2026-03-25',
    projects: [
      {
        name: 'Landing Page Copywriting',
        description: 'Write compelling, conversion-focused copy that speaks to overwhelmed business owners and drives early access signups.',
        tasks: [
          {
            title: 'Write headline variations',
            description: 'Create 5-7 headline options focusing on clarity, time saved, and relief from overwhelm. Test with target audience.',
            priority: 5,
            deadline: '2026-03-18'
          },
          {
            title: 'Craft hero section copy',
            description: 'Write hero section with headline, subheadline, and primary CTA. Must immediately resonate with overwhelmed business owners.',
            priority: 5,
            deadline: '2026-03-19'
          },
          {
            title: 'Write benefits section',
            description: 'List 3-5 key benefits with clear, jargon-free descriptions. Focus on outcomes: clarity, time back, stress reduction.',
            priority: 4,
            deadline: '2026-03-20'
          },
          {
            title: 'Develop social proof section',
            description: 'Write placeholder copy for testimonials and trust indicators. Prepare structure for beta customer quotes.',
            priority: 3,
            deadline: '2026-03-22'
          },
          {
            title: 'Create CTA copy variations',
            description: 'Write multiple CTA options: "Get Early Access", "Start Getting Clear", etc. Test for conversion.',
            priority: 4,
            deadline: '2026-03-21'
          },
          {
            title: 'Write FAQ section',
            description: 'Answer 5-7 common questions: pricing, what makes it different, who it\'s for, technical requirements, time to value.',
            priority: 3,
            deadline: '2026-03-24'
          }
        ]
      },
      {
        name: 'Landing Page Design & Build',
        description: 'Design and develop high-converting landing page that works perfectly on all devices. DEPENDENCY: Brand identity must be finalized first.',
        tasks: [
          {
            title: 'Create wireframe',
            description: 'Design low-fidelity wireframe showing layout, sections, and user flow. Focus on clarity and conversion path.',
            priority: 5,
            deadline: '2026-03-20'
          },
          {
            title: 'Design high-fidelity mockup',
            description: 'Create pixel-perfect design mockup using finalized brand assets. Ensure clean, uncluttered, calming aesthetic.',
            priority: 5,
            deadline: '2026-03-22'
          },
          {
            title: 'Develop landing page',
            description: 'Build landing page with Next.js. Implement all sections: hero, benefits, social proof, FAQ, CTA.',
            priority: 5,
            deadline: '2026-03-24'
          },
          {
            title: 'Optimize for mobile responsive',
            description: 'Ensure perfect display and functionality on mobile, tablet, desktop. Test on multiple devices and browsers.',
            priority: 5,
            deadline: '2026-03-24'
          },
          {
            title: 'Performance optimization',
            description: 'Optimize images, implement lazy loading, ensure fast page load (<2s). Test with Lighthouse and PageSpeed.',
            priority: 4,
            deadline: '2026-03-25'
          }
        ]
      },
      {
        name: 'Early Access Campaign Setup',
        description: 'Set up email capture system and automated follow-up to convert visitors into qualified leads.',
        tasks: [
          {
            title: 'Implement email capture form',
            description: 'Build form with name and email fields. Add to Airtable/database. Include proper validation and error handling.',
            priority: 5,
            deadline: '2026-03-23'
          },
          {
            title: 'Create thank you page',
            description: 'Design confirmation page with next steps, expected timeline, and optional ways to engage (social, Discord, etc.).',
            priority: 4,
            deadline: '2026-03-24'
          },
          {
            title: 'Write confirmation email',
            description: 'Create automated welcome email sent immediately after signup. Set expectations and build anticipation.',
            priority: 4,
            deadline: '2026-03-24'
          },
          {
            title: 'Set up segmentation tags',
            description: 'Add ability to tag signups by source, industry, company size for later targeting and personalization.',
            priority: 3,
            deadline: '2026-03-25'
          }
        ]
      }
    ]
  },

  'Product stable with zero critical bugs': {
    deadline: '2026-04-01',
    projects: [
      {
        name: 'Bug Fixing & Stabilization',
        description: 'Audit, prioritize, and fix all critical and high-priority bugs to ensure product stability.',
        tasks: [
          {
            title: 'Audit all existing bugs',
            description: 'Review all known issues, error logs, and user reports. Document in centralized bug tracker with reproduction steps.',
            priority: 5,
            deadline: '2026-03-22'
          },
          {
            title: 'Prioritize critical issues',
            description: 'Categorize bugs by severity. Critical = crashes, data loss, security. High = broken features. Medium/Low = polish.',
            priority: 5,
            deadline: '2026-03-23'
          },
          {
            title: 'Fix all critical bugs',
            description: 'Resolve every critical bug. No crashes, no data loss, no security issues. This is non-negotiable for launch.',
            priority: 5,
            deadline: '2026-03-28'
          },
          {
            title: 'Fix high-priority bugs',
            description: 'Fix bugs that break core functionality: task creation, status changes, project management, user access.',
            priority: 5,
            deadline: '2026-03-30'
          },
          {
            title: 'Run regression testing',
            description: 'Test all previously fixed bugs to ensure they stay fixed. Create regression test suite for future use.',
            priority: 4,
            deadline: '2026-03-31'
          },
          {
            title: 'Performance testing',
            description: 'Test app with realistic data loads (100+ tasks, 10+ projects). Ensure no slowdowns or crashes.',
            priority: 4,
            deadline: '2026-04-01'
          }
        ]
      },
      {
        name: 'Core Feature Completion',
        description: 'Complete and polish essential features required for first paying customers.',
        tasks: [
          {
            title: 'Complete user management system',
            description: 'Finish user invite, role assignment, permission system. Ensure users can only see their workspace data.',
            priority: 5,
            deadline: '2026-03-26'
          },
          {
            title: 'Complete email notifications',
            description: 'Implement notifications for task assignments, mentions, deadlines, and updates. Must be reliable and timely.',
            priority: 5,
            deadline: '2026-03-28'
          },
          {
            title: 'Complete team collaboration features',
            description: 'Finish comments, @mentions, task assignments, activity feed. Ensure real-time updates work correctly.',
            priority: 4,
            deadline: '2026-03-30'
          },
          {
            title: 'Polish AI features',
            description: 'Refine AI recommendations, task breakdown, proactive alerts. Ensure they provide genuine value without being intrusive.',
            priority: 4,
            deadline: '2026-04-01'
          }
        ]
      },
      {
        name: 'Testing & QA',
        description: 'Comprehensive testing across all features, browsers, and devices to ensure quality.',
        tasks: [
          {
            title: 'Create comprehensive test plan',
            description: 'Document all test scenarios for core features: task CRUD, projects, objectives, team features, AI features.',
            priority: 5,
            deadline: '2026-03-24'
          },
          {
            title: 'Execute manual testing',
            description: 'Test every user flow end-to-end. Document any issues found. Focus on happy paths and common use cases.',
            priority: 5,
            deadline: '2026-03-29'
          },
          {
            title: 'Test edge cases',
            description: 'Test unusual scenarios: empty states, very long inputs, special characters, simultaneous edits, offline/online.',
            priority: 4,
            deadline: '2026-03-30'
          },
          {
            title: 'Browser compatibility testing',
            description: 'Test on Chrome, Firefox, Safari, Edge (latest versions). Ensure consistent experience.',
            priority: 4,
            deadline: '2026-03-31'
          },
          {
            title: 'Mobile device testing',
            description: 'Test on iOS and Android devices. Verify touch interactions, responsive design, and mobile-specific features.',
            priority: 4,
            deadline: '2026-04-01'
          }
        ]
      }
    ]
  },

  'Product ready for first paying customers': {
    deadline: '2026-04-05',
    projects: [
      {
        name: 'User & Team Management',
        description: 'Complete user invitation, permissions, and team management features for multi-user workspaces.',
        tasks: [
          {
            title: 'Build user invitation system',
            description: 'Allow workspace owners to invite team members via email. Generate secure invite links with expiration.',
            priority: 5,
            deadline: '2026-03-28'
          },
          {
            title: 'Implement permission system',
            description: 'Define roles (Owner, Admin, Member, Viewer) with appropriate permissions for data access and actions.',
            priority: 5,
            deadline: '2026-03-30'
          },
          {
            title: 'Create team roles management',
            description: 'UI for assigning roles, changing permissions, removing team members. Include proper confirmation dialogs.',
            priority: 4,
            deadline: '2026-04-01'
          },
          {
            title: 'Build workspace settings',
            description: 'Settings page for workspace name, description, team management, notification preferences.',
            priority: 4,
            deadline: '2026-04-02'
          },
          {
            title: 'Create user profile management',
            description: 'Allow users to update their name, email, avatar, notification preferences, and password.',
            priority: 3,
            deadline: '2026-04-04'
          }
        ]
      },
      {
        name: 'Email Notification System',
        description: 'Build reliable email notification system for task updates, mentions, and deadlines.',
        tasks: [
          {
            title: 'Define notification triggers',
            description: 'Document all scenarios that trigger emails: assignments, mentions, comments, deadline reminders, status changes.',
            priority: 5,
            deadline: '2026-03-26'
          },
          {
            title: 'Design email templates',
            description: 'Create branded, mobile-responsive email templates for each notification type. Keep simple and actionable.',
            priority: 4,
            deadline: '2026-03-28'
          },
          {
            title: 'Build notification preferences',
            description: 'Allow users to customize which notifications they receive. Include frequency options (instant, daily digest, none).',
            priority: 4,
            deadline: '2026-03-30'
          },
          {
            title: 'Test email delivery',
            description: 'Test all notification types across major email providers (Gmail, Outlook, Apple Mail). Verify deliverability.',
            priority: 5,
            deadline: '2026-04-03'
          }
        ]
      },
      {
        name: 'Team Collaboration Features',
        description: 'Implement commenting, mentions, and activity tracking for effective team collaboration.',
        tasks: [
          {
            title: 'Build comments system',
            description: 'Add commenting to tasks with rich text support. Show comment count and latest activity.',
            priority: 5,
            deadline: '2026-03-29'
          },
          {
            title: 'Implement @mentions',
            description: 'Support @mentions in comments and task descriptions. Send notifications to mentioned users.',
            priority: 4,
            deadline: '2026-03-31'
          },
          {
            title: 'Create task assignment flow',
            description: 'Allow assigning tasks to team members with notifications. Support reassignment and unassignment.',
            priority: 5,
            deadline: '2026-04-01'
          },
          {
            title: 'Build activity feed',
            description: 'Show recent activity across workspace: new tasks, status changes, comments, assignments.',
            priority: 3,
            deadline: '2026-04-03'
          },
          {
            title: 'Add real-time notifications',
            description: 'Implement in-app notification center showing recent mentions, assignments, and updates.',
            priority: 3,
            deadline: '2026-04-04'
          }
        ]
      },
      {
        name: 'Payment Integration',
        description: 'Integrate Stripe for subscription payments and billing management.',
        tasks: [
          {
            title: 'Set up Stripe account',
            description: 'Create Stripe account, configure payment methods, set up webhooks for subscription events.',
            priority: 5,
            deadline: '2026-03-27'
          },
          {
            title: 'Implement pricing tiers',
            description: 'Build pricing tiers in Stripe and database: Free (1 user), Pro ($29/mo), Team ($79/mo). Define feature limits.',
            priority: 5,
            deadline: '2026-03-29'
          },
          {
            title: 'Build subscription management',
            description: 'Allow users to start subscription, upgrade/downgrade plans, and cancel. Handle webhook events for status changes.',
            priority: 5,
            deadline: '2026-04-02'
          },
          {
            title: 'Create billing portal',
            description: 'Integrate Stripe billing portal for users to manage payment methods, view invoices, update billing info.',
            priority: 4,
            deadline: '2026-04-04'
          }
        ]
      }
    ]
  },

  '100 qualified leads engaged and interested': {
    deadline: '2026-04-06',
    projects: [
      {
        name: 'Database Segmentation (8,000 contacts)',
        description: 'Segment and prioritize 8,000 contact database for targeted outreach campaigns.',
        tasks: [
          {
            title: 'Export contact database',
            description: 'Export all 8,000 contacts with available data: name, email, company, industry, past interactions.',
            priority: 5,
            deadline: '2026-03-25'
          },
          {
            title: 'Segment into A/B/C priority tiers',
            description: 'A-list (50-100): hot leads, past customers. B-list (300-500): warm leads. C-list: cold but relevant.',
            priority: 5,
            deadline: '2026-03-27'
          },
          {
            title: 'Enrich contact data',
            description: 'Use tools to enrich missing data: LinkedIn profiles, company size, industry, role. Focus on A and B lists.',
            priority: 4,
            deadline: '2026-03-29'
          },
          {
            title: 'Clean and remove duplicates',
            description: 'Remove duplicate emails, invalid addresses, unsubscribes. Ensure GDPR compliance.',
            priority: 4,
            deadline: '2026-03-30'
          },
          {
            title: 'Define targeting criteria',
            description: 'Document ideal customer criteria: solopreneurs, consultants, small agencies, overwhelmed founders, 1-10 employees.',
            priority: 4,
            deadline: '2026-03-26'
          }
        ]
      },
      {
        name: 'Outbound Campaign Strategy',
        description: 'Create email campaign strategy and messaging to engage qualified leads.',
        tasks: [
          {
            title: 'Write campaign messaging',
            description: 'Develop core message for outreach: address pain (overwhelm), present solution (Zebi), offer value (early access).',
            priority: 5,
            deadline: '2026-03-28'
          },
          {
            title: 'Create email sequence (3-5 emails)',
            description: 'Write 3-5 email sequence: 1) Intro + pain point, 2) Solution + value, 3) Social proof + CTA, 4-5) Follow-ups.',
            priority: 5,
            deadline: '2026-03-30'
          },
          {
            title: 'Develop personalization strategy',
            description: 'Define personalization variables: name, company, industry, pain point. Create templates for different segments.',
            priority: 4,
            deadline: '2026-03-31'
          },
          {
            title: 'Design clear call-to-action',
            description: 'Create compelling CTA: "Get early access", "Book a demo", "Join beta". Make it easy to respond.',
            priority: 4,
            deadline: '2026-04-01'
          }
        ]
      },
      {
        name: 'Early Adopter Outreach',
        description: 'Personal outreach to top-tier prospects for beta participation and feedback.',
        tasks: [
          {
            title: 'Identify 50 A-list contacts',
            description: 'Select 50 highest-priority contacts: past customers, warm leads, referrals, engaged LinkedIn connections.',
            priority: 5,
            deadline: '2026-03-26'
          },
          {
            title: 'Send personalized outreach',
            description: 'Manually write personalized emails to A-list contacts. Reference specific context, offer exclusive early access.',
            priority: 5,
            deadline: '2026-04-02'
          },
          {
            title: 'Create follow-up sequence',
            description: 'Schedule 2-3 follow-ups for non-responders. Keep friendly, value-focused, non-pushy.',
            priority: 4,
            deadline: '2026-04-04'
          },
          {
            title: 'Track engagement metrics',
            description: 'Monitor open rates, click rates, reply rates. Document which messages work best for iteration.',
            priority: 3,
            deadline: '2026-04-06'
          }
        ]
      }
    ]
  },

  '10 beta customers actively using product daily': {
    deadline: '2026-04-06',
    projects: [
      {
        name: 'Beta Recruitment',
        description: 'Recruit and onboard 10-15 beta customers who match ideal customer profile.',
        tasks: [
          {
            title: 'Define beta program criteria',
            description: 'Document ideal beta user: willing to give feedback, active daily, matches ICP, tolerant of bugs, communicative.',
            priority: 5,
            deadline: '2026-03-26'
          },
          {
            title: 'Recruit 10-15 beta candidates',
            description: 'Reach out to A-list contacts, landing page signups, network. Aim for 15 to account for dropouts.',
            priority: 5,
            deadline: '2026-04-01'
          },
          {
            title: 'Onboard beta users',
            description: 'Personal onboarding calls or videos for each beta user. Help them set up workspace and first tasks.',
            priority: 5,
            deadline: '2026-04-03'
          },
          {
            title: 'Set expectations clearly',
            description: 'Communicate beta timeline, expected bugs, feedback expectations, and what they get (early access, influence).',
            priority: 4,
            deadline: '2026-04-02'
          },
          {
            title: 'Create feedback channel',
            description: 'Set up dedicated Slack/Discord channel or email group for beta users to share feedback and issues.',
            priority: 4,
            deadline: '2026-04-02'
          }
        ]
      },
      {
        name: 'Feedback Collection System',
        description: 'Build systematic approach to collecting, organizing, and acting on beta feedback.',
        tasks: [
          {
            title: 'Add in-app feedback widget',
            description: 'Implement feedback button that lets users report bugs or suggestions without leaving the app.',
            priority: 4,
            deadline: '2026-03-30'
          },
          {
            title: 'Schedule weekly check-in calls',
            description: 'Book 15-30 min calls with each beta user weekly. Ask about experience, pain points, feature requests.',
            priority: 5,
            deadline: '2026-04-03'
          },
          {
            title: 'Build feedback database',
            description: 'Create system (Airtable, Notion, etc.) to track all feedback: feature requests, bugs, UX issues, quotes.',
            priority: 4,
            deadline: '2026-04-01'
          },
          {
            title: 'Create prioritization framework',
            description: 'Define how to prioritize feedback: frequency mentioned, impact on UX, alignment with vision, effort required.',
            priority: 3,
            deadline: '2026-04-04'
          }
        ]
      },
      {
        name: 'Beta Success Metrics',
        description: 'Define and track metrics to measure beta program success and user engagement.',
        tasks: [
          {
            title: 'Define success metrics',
            description: 'Set clear metrics: daily active users (target 10), tasks created per user, session length, feature adoption.',
            priority: 5,
            deadline: '2026-03-28'
          },
          {
            title: 'Track daily usage',
            description: 'Monitor which beta users are active daily. Reach out to inactive users to understand blockers.',
            priority: 5,
            deadline: '2026-04-04'
          },
          {
            title: 'Monitor task completion rates',
            description: 'Track how many tasks users create vs complete. Low completion may indicate UX issues or value mismatch.',
            priority: 4,
            deadline: '2026-04-05'
          },
          {
            title: 'Identify and remove blockers',
            description: 'Actively identify what prevents daily use: bugs, missing features, confusing UX. Fix highest-impact blockers.',
            priority: 5,
            deadline: '2026-04-06'
          }
        ]
      }
    ]
  },

  'Sales materials ready to close first customers': {
    deadline: '2026-03-28',
    projects: [
      {
        name: 'Pricing Strategy Finalization',
        description: 'Finalize pricing tiers, test pricing, and create pricing page copy.',
        tasks: [
          {
            title: 'Test pricing with early users',
            description: 'Show pricing options to 5-10 target customers. Gauge reactions. Ask: "Would you pay this? Why or why not?"',
            priority: 5,
            deadline: '2026-03-22'
          },
          {
            title: 'Research competitor pricing',
            description: 'Document competitor pricing: Asana, Monday, ClickUp, Notion. Ensure Zebi is positioned competitively.',
            priority: 4,
            deadline: '2026-03-20'
          },
          {
            title: 'Calculate value-based pricing',
            description: 'Estimate value delivered: hours saved per week × hourly rate. Ensure price is fraction of value created.',
            priority: 4,
            deadline: '2026-03-23'
          },
          {
            title: 'Define tier structure',
            description: 'Finalize tiers: Free (1 user, limited), Pro ($29/mo per user), Team ($79/mo for 5 users). Document feature limits.',
            priority: 5,
            deadline: '2026-03-24'
          },
          {
            title: 'Write pricing page copy',
            description: 'Create pricing page copy explaining each tier, features included, and why each tier exists. Address objections.',
            priority: 4,
            deadline: '2026-03-26'
          }
        ]
      },
      {
        name: 'Demo Environment Setup',
        description: 'Create compelling demo environment with sample data for prospects.',
        tasks: [
          {
            title: 'Create sample companies',
            description: 'Build 2-3 demo workspaces representing different use cases: consultant, agency, solopreneur.',
            priority: 4,
            deadline: '2026-03-24'
          },
          {
            title: 'Populate with realistic data',
            description: 'Add sample projects, tasks, objectives that show typical workflows. Make it feel real and relatable.',
            priority: 4,
            deadline: '2026-03-25'
          },
          {
            title: 'Write demo script',
            description: 'Create step-by-step demo script showing key features and value. Keep it focused (10-15 min max).',
            priority: 4,
            deadline: '2026-03-26'
          },
          {
            title: 'Record walkthrough video',
            description: 'Record 5-10 min walkthrough video showing key features and workflows. Keep it casual and authentic.',
            priority: 3,
            deadline: '2026-03-28'
          }
        ]
      },
      {
        name: 'Sales Collateral Creation',
        description: 'Create all necessary sales materials: one-pager, pitch deck, comparison sheets.',
        tasks: [
          {
            title: 'Design one-pager',
            description: 'Create single-page overview: what it is, who it\'s for, key benefits, pricing, CTA. PDF format.',
            priority: 4,
            deadline: '2026-03-24'
          },
          {
            title: 'Build pitch deck (10 slides)',
            description: 'Create deck: Problem, Solution, How it works, Key features, Pricing, Success stories (placeholder), CTA.',
            priority: 4,
            deadline: '2026-03-26'
          },
          {
            title: 'Create feature comparison sheet',
            description: 'Build comparison table: Zebi vs top 3 competitors. Highlight simplicity, AI features, ease of use.',
            priority: 3,
            deadline: '2026-03-27'
          },
          {
            title: 'Build ROI calculator',
            description: 'Create simple calculator showing time/money saved. Input: hours spent on planning. Output: value of time saved.',
            priority: 3,
            deadline: '2026-03-28'
          },
          {
            title: 'Create case study template',
            description: 'Design template for future case studies: Challenge, Solution, Results. Ready to populate with beta success stories.',
            priority: 2,
            deadline: '2026-03-28'
          }
        ]
      }
    ]
  },

  'Customer onboarding enables self-service success': {
    deadline: '2026-04-02',
    projects: [
      {
        name: 'First-Run Onboarding Flow',
        description: 'Create guided onboarding experience for new users to get value quickly.',
        tasks: [
          {
            title: 'Design welcome screen',
            description: 'Create welcoming first screen explaining what to expect. Set positive tone. Offer guided setup or skip option.',
            priority: 5,
            deadline: '2026-03-26'
          },
          {
            title: 'Build tutorial steps',
            description: 'Create step-by-step tutorial: 1) Create first task, 2) Add objective, 3) Try AI recommendation, 4) Complete task.',
            priority: 5,
            deadline: '2026-03-29'
          },
          {
            title: 'Add sample templates',
            description: 'Offer pre-built templates users can start with: "Launch a product", "Manage client work", "Plan quarter".',
            priority: 4,
            deadline: '2026-03-30'
          },
          {
            title: 'Implement AI-guided setup',
            description: 'Allow AI to interview user about their goals and auto-create relevant tasks and structure.',
            priority: 3,
            deadline: '2026-04-01'
          },
          {
            title: 'Add skip/complete tracking',
            description: 'Track onboarding progress. Allow users to skip steps. Offer to resume later if they exit early.',
            priority: 4,
            deadline: '2026-04-02'
          }
        ]
      },
      {
        name: 'Documentation & Help Center',
        description: 'Create comprehensive, searchable help documentation for self-service support.',
        tasks: [
          {
            title: 'Write getting started guide',
            description: 'Create beginner-friendly guide: account setup, first tasks, organizing with projects, using AI features.',
            priority: 5,
            deadline: '2026-03-28'
          },
          {
            title: 'Document all features',
            description: 'Write help docs for every feature: tasks, projects, objectives, team features, AI, settings. Include screenshots.',
            priority: 5,
            deadline: '2026-03-31'
          },
          {
            title: 'Create video tutorials',
            description: 'Record 5-7 short tutorial videos (2-3 min each) covering key features and workflows.',
            priority: 3,
            deadline: '2026-04-01'
          },
          {
            title: 'Build FAQ section',
            description: 'Answer common questions: pricing, team features, data privacy, mobile app, integrations, cancellation.',
            priority: 4,
            deadline: '2026-03-30'
          },
          {
            title: 'Create troubleshooting guide',
            description: 'Document solutions for common issues: login problems, missing data, sync issues, performance problems.',
            priority: 4,
            deadline: '2026-04-02'
          }
        ]
      },
      {
        name: 'Onboarding Templates',
        description: 'Create pre-built workspace templates for different user types and use cases.',
        tasks: [
          {
            title: 'Build consultant template',
            description: 'Create template for solo consultants: client projects, business development, admin tasks, goals.',
            priority: 4,
            deadline: '2026-03-29'
          },
          {
            title: 'Build agency template',
            description: 'Create template for small agencies: client work, team tasks, business goals, project pipelines.',
            priority: 4,
            deadline: '2026-03-30'
          },
          {
            title: 'Build solopreneur template',
            description: 'Create template for solopreneurs: product development, marketing, sales, operations, goals.',
            priority: 4,
            deadline: '2026-03-31'
          },
          {
            title: 'Add sample goals to templates',
            description: 'Pre-populate templates with realistic sample objectives relevant to each user type.',
            priority: 3,
            deadline: '2026-04-01'
          },
          {
            title: 'Add sample tasks to templates',
            description: 'Include 10-15 sample tasks in each template showing typical workflows and organization.',
            priority: 3,
            deadline: '2026-04-02'
          }
        ]
      }
    ]
  },

  '£5,000 MRR from first customers': {
    deadline: '2026-04-06',
    projects: [
      {
        name: 'Pricing & Conversion Optimization',
        description: 'Optimize pricing page and payment flow to maximize conversion from trial to paid.',
        tasks: [
          {
            title: 'Optimize pricing page design',
            description: 'Ensure pricing page is clear, compelling, and answers objections. Test with target users.',
            priority: 5,
            deadline: '2026-03-30'
          },
          {
            title: 'Add social proof elements',
            description: 'Add testimonials, logos, usage stats to build trust. Use beta customer quotes once available.',
            priority: 4,
            deadline: '2026-04-02'
          },
          {
            title: 'Test payment flow',
            description: 'Walk through entire payment process. Ensure smooth, no friction, clear confirmation. Test with Stripe test mode.',
            priority: 5,
            deadline: '2026-04-03'
          },
          {
            title: 'Implement conversion tracking',
            description: 'Track conversion funnel: landing page → signup → trial → paid. Identify drop-off points.',
            priority: 4,
            deadline: '2026-04-01'
          }
        ]
      },
      {
        name: 'First Customer Acquisition',
        description: 'Convert beta users and early leads into first paying customers.',
        tasks: [
          {
            title: 'Close first 5 paying customers',
            description: 'Convert beta users and warm leads to paid plans. Personal outreach, address objections, offer launch discount.',
            priority: 5,
            deadline: '2026-04-05'
          },
          {
            title: 'Collect testimonials',
            description: 'Request testimonials from first customers. Ask about specific results: time saved, clarity gained, stress reduced.',
            priority: 4,
            deadline: '2026-04-06'
          },
          {
            title: 'Document success stories',
            description: 'Create 2-3 detailed success stories from early customers. Include before/after, specific outcomes, quotes.',
            priority: 4,
            deadline: '2026-04-06'
          },
          {
            title: 'Set up referral program',
            description: 'Create simple referral incentive: refer a customer, get 1 month free. Make it easy to share.',
            priority: 3,
            deadline: '2026-04-06'
          }
        ]
      },
      {
        name: 'Retention & Success',
        description: 'Ensure first customers succeed and stick around, building foundation for growth.',
        tasks: [
          {
            title: 'Schedule customer success check-ins',
            description: 'Book weekly calls with first customers. Help them succeed, gather feedback, build relationships.',
            priority: 5,
            deadline: '2026-04-05'
          },
          {
            title: 'Monitor usage patterns',
            description: 'Track daily active users, feature usage, completion rates. Identify at-risk customers early.',
            priority: 4,
            deadline: '2026-04-05'
          },
          {
            title: 'Build churn prevention process',
            description: 'Create early warning system for churn risk: low usage, support tickets, no logins. Proactive outreach plan.',
            priority: 4,
            deadline: '2026-04-06'
          },
          {
            title: 'Create upsell strategy',
            description: 'Identify when customers are ready to upgrade: team growth, feature needs, usage patterns. Soft upsell approach.',
            priority: 3,
            deadline: '2026-04-06'
          }
        ]
      }
    ]
  }
};

async function main() {
  console.log('🚀 Starting creation of all Zebi launch projects and tasks...\n');

  // Get all objectives
  const objectives = await prisma.objective.findMany({
    where: { workspaceId: WORKSPACE_ID },
    orderBy: { deadline: 'asc' }
  });

  console.log(`📋 Found ${objectives.length} objectives\n`);

  // Get inbox status
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

  // Track counts
  let projectCount = 0;
  let taskCount = 0;

  // Create projects and tasks for each objective
  for (const objective of objectives) {
    console.log(`\n📌 Processing: ${objective.title}`);
    console.log(`   Deadline: ${objective.deadline}`);

    const structure = OBJECTIVE_STRUCTURE[objective.title];
    if (!structure) {
      console.log(`   ⚠️  No structure found for: ${objective.title}`);
      continue;
    }

    // Create each project
    for (const projectData of structure.projects) {
      console.log(`\n   📁 Creating project: ${projectData.name}`);

      const project = await prisma.project.create({
        data: {
          workspace: { connect: { id: WORKSPACE_ID } },
          objective: { connect: { id: objective.id } },
          name: projectData.name,
          description: projectData.description,
          priority: 3,
          owner: USER_ID
        }
      });

      projectCount++;
      console.log(`      ✅ Project created: ${project.id}`);

      // Create each task for this project
      for (const taskData of projectData.tasks) {
        const task = await prisma.task.create({
          data: {
            workspace: { connect: { id: WORKSPACE_ID } },
            status: { connect: { id: inboxStatus.id } },
            project: { connect: { id: project.id } },
            objective: { connect: { id: objective.id } },
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            dueAt: taskData.deadline ? new Date(taskData.deadline) : null,
            assigneeId: USER_ID,
            createdBy: USER_ID
          }
        });

        taskCount++;
        console.log(`         ✅ Task created: ${task.title}`);
      }

      console.log(`      📊 Created ${projectData.tasks.length} tasks for ${projectData.name}`);
    }

    console.log(`   ✅ Completed ${structure.projects.length} projects for ${objective.title}`);
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('🎉 CREATION COMPLETE!');
  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   • Objectives: ${objectives.length}`);
  console.log(`   • Projects created: ${projectCount}`);
  console.log(`   • Tasks created: ${taskCount}`);
  console.log('\n✅ All projects and tasks have been created in the database!');
  console.log('\n📝 Next: Creating summary document...');
}

main()
  .catch((e) => {
    console.error('\n❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
