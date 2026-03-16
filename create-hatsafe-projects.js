#!/usr/bin/env node

/**
 * HatSafe Project & Task Creation Script for Zebi
 * 
 * Creates comprehensive project structure to achieve $10,000+ MRR launch
 * Target: Same detail level as Security App (38 projects, 173 tasks)
 * 
 * Run from zebi folder: node create-hatsafe-projects.js
 */

const { PrismaClient } = require('@prisma/client');

// Configuration
const CONFIG = {
  companyId: '740849c1-6f6d-42c8-87ca-de7bb042644f', // HatSafe
  workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
  createdBy: 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74', // Placeholder user ID
};

// Initialize Prisma
const prisma = new PrismaClient();

// Project and task definitions
const PROJECTS_DATA = [
  // =====================================================
  // WORKSTREAM 1: PRODUCT DEVELOPMENT (12 projects)
  // =====================================================
  {
    name: 'AI Document Processing Engine',
    description: 'Core AI system for extracting compliance data from certificates and documents. Includes OCR, classification, field extraction, and entity matching with confidence scoring.',
    workstream: 'Product Development',
    tasks: [
      {
        title: 'Integrate AWS Bedrock Claude API',
        description: 'Set up AWS Bedrock access, configure Claude Sonnet model, implement retry logic and error handling. Test with sample documents.',
        effort: 'Medium',
        priority: 1,
        dependencies: 'None'
      },
      {
        title: 'Build OCR text extraction pipeline',
        description: 'Implement AWS Textract or Claude Vision for extracting text from PDF and image documents. Handle multi-page PDFs, rotated images, and poor quality scans.',
        effort: 'Large',
        priority: 1,
        dependencies: 'AWS Bedrock integration'
      },
      {
        title: 'Create document classification prompt system',
        description: 'Design and test prompts to identify document types (CSCS, MOT, PAT, Insurance, etc.). Achieve >90% accuracy on test dataset.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'OCR pipeline'
      },
      {
        title: 'Implement structured field extraction',
        description: 'Build prompts and parsing logic to extract: expiry date, issue date, certificate number, holder name, issuing authority. Return structured JSON.',
        effort: 'Large',
        priority: 1,
        dependencies: 'Classification system'
      },
      {
        title: 'Build entity matching AI system',
        description: 'Fuzzy matching + AI to link extracted names to existing people/vehicles/assets. Handle variations, nicknames, typos. Confidence scoring.',
        effort: 'Large',
        priority: 2,
        dependencies: 'Field extraction'
      },
      {
        title: 'Create AI confidence scoring system',
        description: 'Implement confidence levels (High/Medium/Low) for all extractions. Define thresholds: >0.7 auto-approve, 0.4-0.7 review queue, <0.4 manual.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'All extraction components'
      },
      {
        title: 'Build review queue for low-confidence extractions',
        description: 'UI for reviewing AI suggestions: split view (document + extracted data), edit fields, approve/reject, create new entities inline.',
        effort: 'Large',
        priority: 2,
        dependencies: 'Confidence scoring'
      },
      {
        title: 'Implement background job processing',
        description: 'Async processing for AI extraction (Vercel background jobs or Supabase Edge Functions). Queue management, status tracking, error retry.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Extraction pipeline complete'
      }
    ]
  },
  {
    name: 'Document Upload & Storage System',
    description: 'File upload infrastructure with drag-drop UI, Supabase Storage integration, file validation, and document versioning support.',
    workstream: 'Product Development',
    tasks: [
      {
        title: 'Build drag-drop upload UI component',
        description: 'React component with drag-drop zone, file preview, progress bar, multi-file support. Accept PDF, JPG, PNG up to 10MB.',
        effort: 'Medium',
        priority: 1,
        dependencies: 'None'
      },
      {
        title: 'Integrate Supabase Storage buckets',
        description: 'Configure storage buckets, implement RLS policies for org-level isolation, signed URL generation, file encryption at rest.',
        effort: 'Medium',
        priority: 1,
        dependencies: 'None'
      },
      {
        title: 'Implement file validation and sanitization',
        description: 'Validate file type, size, scan for malware (ClamAV or cloud scanning), reject suspicious files, log attempts.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Storage integration'
      },
      {
        title: 'Build document version history system',
        description: 'Track all versions when renewals uploaded. Show version timeline, compare versions, restore previous versions, link to replacements.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Storage system'
      },
      {
        title: 'Create manual metadata entry form',
        description: 'Fallback form for manual entry when AI fails: select entity, document type, dates, certificate number. Prefill from AI when available.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      }
    ]
  },
  {
    name: 'Entity Management System',
    description: 'CRUD interfaces for managing people, vehicles, assets, teams, sites, and suppliers with search, filters, and bulk operations.',
    workstream: 'Product Development',
    tasks: [
      {
        title: 'Build People management UI',
        description: 'List view, profile pages, create/edit forms. Fields: name, role, team, contact info, photo, status. Search and filter by team/status.',
        effort: 'Large',
        priority: 1,
        dependencies: 'None'
      },
      {
        title: 'Build Vehicles management UI',
        description: 'List view, vehicle profiles, create/edit. Fields: registration, type, make/model, driver, current location. Search by reg or driver.',
        effort: 'Medium',
        priority: 1,
        dependencies: 'People management'
      },
      {
        title: 'Build Assets/Equipment management UI',
        description: 'List view, asset profiles, create/edit. Fields: asset tag, type, location, assigned to, purchase date, serial number. Filter by location.',
        effort: 'Medium',
        priority: 1,
        dependencies: 'People management'
      },
      {
        title: 'Build Teams & Sites management',
        description: 'Create teams, assign members, define sites/locations. Hierarchical org structure support. Team lead assignment.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'People management'
      },
      {
        title: 'Build Suppliers/Vendors management',
        description: 'Track third-party suppliers and their compliance docs (insurance, accreditations). Supplier profiles with contact info and documents.',
        effort: 'Small',
        priority: 3,
        dependencies: 'None'
      },
      {
        title: 'Implement global search across entities',
        description: 'Fast search across people, vehicles, assets, documents by name, tag, reg number. Debounced input, result grouping.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'All entity types built'
      },
      {
        title: 'Build bulk import from CSV',
        description: 'CSV upload for bulk people/vehicle/asset import. Column mapping UI, validation, duplicate detection, rollback on error.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Entity management complete'
      }
    ]
  },
  {
    name: 'Compliance Dashboard & Calendar',
    description: 'Real-time compliance status dashboard with widgets, KPIs, and calendar views showing upcoming expirations.',
    workstream: 'Product Development',
    tasks: [
      {
        title: 'Build status calculation engine',
        description: 'Calculate document status: Valid (green), Expiring Soon (amber), Expired (red), Missing (grey). Configurable lead times.',
        effort: 'Small',
        priority: 1,
        dependencies: 'None'
      },
      {
        title: 'Create dashboard widgets',
        description: 'Widget components: Expiring Soon count, Expired count, Compliance % by entity type, Recent uploads, Action required.',
        effort: 'Medium',
        priority: 1,
        dependencies: 'Status engine'
      },
      {
        title: 'Build calendar view (month/week)',
        description: 'Calendar showing expiry dates color-coded by status. Click to see details. Filter by entity type or document type.',
        effort: 'Large',
        priority: 2,
        dependencies: 'Status engine'
      },
      {
        title: 'Implement real-time updates',
        description: 'Dashboard updates automatically when documents uploaded or status changes. Use Supabase realtime subscriptions.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Dashboard complete'
      },
      {
        title: 'Create compliance summary reports',
        description: 'Generate summary: X% compliant, breakdown by entity type, top risks (expiring soon), coverage gaps.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Status engine'
      }
    ]
  },
  {
    name: 'Notification & Alert System',
    description: 'Automated email alerts for expiring documents with configurable lead times, digest reports, and in-app notifications.',
    workstream: 'Product Development',
    tasks: [
      {
        title: 'Design email templates',
        description: 'Professional email templates: Expiry alerts (30/14/7 days), Daily digest, Weekly summary, Document uploaded confirmation. Branded.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Integrate SendGrid or Resend API',
        description: 'Set up email provider, configure domain authentication (SPF/DKIM), implement send function with retry logic.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Build notification scheduling logic',
        description: 'Calculate when to send alerts based on expiry date and lead time (30/14/7 days). Respect user timezone. Deduplication.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Email integration'
      },
      {
        title: 'Implement Vercel Cron for daily checks',
        description: 'Daily cron job to check expiring documents, queue notifications, generate digest reports. Run at 7am user timezone.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Notification logic'
      },
      {
        title: 'Create in-app notification center',
        description: 'Notification bell icon, dropdown with recent alerts, mark as read, link to documents. Unread count badge.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Notification system'
      },
      {
        title: 'Build user notification preferences',
        description: 'Settings UI: Enable/disable email types, choose digest frequency (daily/weekly/never), notification email override.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Notification system'
      }
    ]
  },
  {
    name: 'Document Type Configuration',
    description: 'Admin settings for defining custom document types, expiry calculation rules, and renewal workflows specific to each industry.',
    workstream: 'Product Development',
    tasks: [
      {
        title: 'Build document type CRUD interface',
        description: 'Settings page to create/edit document types: name, category, default validity period, required fields, color coding.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Create default document type library',
        description: 'Pre-populate common types: CSCS, SSSTS, SMSTS, First Aid, PAT, MOT, Insurance, Asbestos, Confined Space, IPAF, etc.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Document type CRUD'
      },
      {
        title: 'Implement custom validity rules',
        description: 'Allow org to set custom validity periods per document type (e.g., First Aid = 3 years, MOT = 1 year).',
        effort: 'Small',
        priority: 3,
        dependencies: 'Document type CRUD'
      },
      {
        title: 'Build renewal workflow configuration',
        description: 'Define who to notify for renewals, auto-assignment rules, approval workflows for certain doc types.',
        effort: 'Medium',
        priority: 4,
        dependencies: 'Notification system'
      }
    ]
  },
  {
    name: 'Reporting & Export System',
    description: 'Compliance reports, audit logs, CSV exports, and PDF summary reports for management and auditors.',
    workstream: 'Product Development',
    tasks: [
      {
        title: 'Build Expiring Soon report',
        description: 'List of all documents expiring in next 30 days. Sortable, filterable by entity/doc type. Export to CSV.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Status engine'
      },
      {
        title: 'Build Expired Documents report',
        description: 'All expired documents. Show who owns them, when they expired, last reminder sent. Export to CSV.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Status engine'
      },
      {
        title: 'Build Coverage Gap report',
        description: 'Entities missing required documents. Define required doc types per entity type, show gaps, assign action items.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Document type config'
      },
      {
        title: 'Implement CSV export for all data',
        description: 'Export people, vehicles, assets, documents to CSV. Include all fields, handle large datasets, streaming export.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Build PDF compliance summary',
        description: 'Generate PDF report: org overview, compliance %, breakdown by type, top risks, action items. For management/auditors.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Reporting complete'
      },
      {
        title: 'Create audit log viewer',
        description: 'Searchable log of all actions: document uploads, edits, deletions, user logins. Filter by user/action/date. Immutable.',
        effort: 'Small',
        priority: 3,
        dependencies: 'None'
      }
    ]
  },
  {
    name: 'Multi-Tenancy & Security',
    description: 'Organization isolation, role-based access control, Row Level Security policies, and data encryption.',
    workstream: 'Product Development',
    tasks: [
      {
        title: 'Implement Row Level Security policies',
        description: 'Supabase RLS policies for all tables. Org-level isolation: users only see their org data. Test with multiple orgs.',
        effort: 'Medium',
        priority: 1,
        dependencies: 'Database schema'
      },
      {
        title: 'Build role-based access control',
        description: 'Define roles: Admin, Manager, Contributor, Viewer. Permissions matrix. Enforce at API and UI level.',
        effort: 'Medium',
        priority: 1,
        dependencies: 'Auth system'
      },
      {
        title: 'Implement team-based visibility',
        description: 'Team members only see their team entities unless Admin/Manager. Configurable per org.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'RBAC complete'
      },
      {
        title: 'Add audit logging for all actions',
        description: 'Log every create/update/delete with user, timestamp, old/new values. Immutable log. Retention policy.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Implement soft delete for data recovery',
        description: 'Soft delete for all entities and documents. Admin can restore within 30 days. Hard delete after retention period.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Configure encryption at rest and in transit',
        description: 'Verify Supabase encryption enabled. Force HTTPS. Encrypt sensitive fields (personal data). Key rotation policy.',
        effort: 'Small',
        priority: 1,
        dependencies: 'None'
      }
    ]
  },
  {
    name: 'Stripe Subscription & Billing',
    description: 'Subscription management, pricing tiers, usage limits, payment collection, and billing portal integration.',
    workstream: 'Product Development',
    tasks: [
      {
        title: 'Set up Stripe account and products',
        description: 'Create Stripe products for Starter/Professional/Business plans. Define pricing, billing intervals, trial period.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Integrate Stripe Checkout',
        description: 'Implement subscription checkout flow. Handle payment, create customer, store subscription ID in database.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Stripe setup'
      },
      {
        title: 'Build subscription management UI',
        description: 'Settings page: view current plan, usage stats, upgrade/downgrade, cancel subscription, payment method.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Stripe Checkout'
      },
      {
        title: 'Implement usage limits enforcement',
        description: 'Enforce entity/document limits per plan. Show usage warnings at 80%. Block creation at 100%. Prompt to upgrade.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Subscription system'
      },
      {
        title: 'Set up Stripe webhooks',
        description: 'Handle subscription events: payment succeeded/failed, subscription canceled, trial ending. Update database, send emails.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Stripe integration'
      },
      {
        title: 'Build billing portal integration',
        description: 'Link to Stripe Customer Portal for invoices, payment history, update payment method. Single-click access.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Subscription system'
      }
    ]
  },
  {
    name: 'Performance & Optimization',
    description: 'Database indexing, query optimization, caching, image optimization, and load testing for production readiness.',
    workstream: 'Product Development',
    tasks: [
      {
        title: 'Add database indexes',
        description: 'Index frequently queried fields: orgId, entityId, expiryDate, documentType, status. Measure query performance improvement.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Schema finalized'
      },
      {
        title: 'Implement API response caching',
        description: 'Cache dashboard widgets, entity lists, document types. Use Vercel Edge Cache or Redis. Invalidate on updates.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'API complete'
      },
      {
        title: 'Optimize image loading',
        description: 'Use Next.js Image component, lazy loading, blur placeholders, WebP format. Compress uploads before storage.',
        effort: 'Small',
        priority: 3,
        dependencies: 'None'
      },
      {
        title: 'Implement pagination for large lists',
        description: 'Paginate entity lists, document lists (50 per page). Load more on scroll or page buttons. Show total count.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Entity management'
      },
      {
        title: 'Run load testing',
        description: 'Test with 1000+ entities, 10,000+ documents. Simulate 100 concurrent users. Identify bottlenecks, optimize.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'All features complete'
      }
    ]
  },
  {
    name: 'Mobile Responsiveness',
    description: 'Ensure full mobile optimization for construction managers using tablets and phones in the field.',
    workstream: 'Product Development',
    tasks: [
      {
        title: 'Design mobile-first navigation',
        description: 'Hamburger menu, bottom nav bar for key actions, swipe gestures. Thumb-friendly tap targets (min 44px).',
        effort: 'Medium',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Optimize forms for mobile',
        description: 'Large inputs, appropriate keyboard types, auto-focus, minimize typing. Use select/date pickers where possible.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Forms built'
      },
      {
        title: 'Build mobile document upload',
        description: 'Camera capture in addition to file upload. Preview before upload. Works on iOS and Android.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Upload system'
      },
      {
        title: 'Test on real devices',
        description: 'Test on iPhone, Android phone, iPad. Test offline behavior, slow network. Fix layout issues.',
        effort: 'Small',
        priority: 3,
        dependencies: 'All features built'
      }
    ]
  },
  {
    name: 'Integrations & API',
    description: 'Third-party integrations (CITB, CSCS), webhook support, and public API for custom integrations.',
    workstream: 'Product Development',
    tasks: [
      {
        title: 'Research CITB/CSCS API availability',
        description: 'Investigate if CITB and CSCS offer APIs for card verification. Document API access requirements, costs.',
        effort: 'Small',
        priority: 4,
        dependencies: 'None'
      },
      {
        title: 'Build webhook system for external events',
        description: 'Allow orgs to register webhooks. Send events: document uploaded, document expiring, entity created. Retry on failure.',
        effort: 'Medium',
        priority: 4,
        dependencies: 'Core features complete'
      },
      {
        title: 'Design public REST API',
        description: 'API for Business plan customers: CRUD entities, upload documents, query compliance status. API key auth, rate limiting.',
        effort: 'Large',
        priority: 4,
        dependencies: 'Core features complete'
      },
      {
        title: 'Create API documentation',
        description: 'OpenAPI spec, interactive docs (Swagger), code examples (curl, JS, Python). Self-serve API key generation.',
        effort: 'Medium',
        priority: 4,
        dependencies: 'API built'
      }
    ]
  },

  // =====================================================
  // WORKSTREAM 2: WEBSITE & POSITIONING (7 projects)
  // =====================================================
  {
    name: 'Marketing Website Development',
    description: 'Public marketing site with hero section, features, pricing, testimonials, and conversion-optimized landing pages.',
    workstream: 'Website & Positioning',
    tasks: [
      {
        title: 'Design homepage hero section',
        description: 'Compelling headline + subhead focused on pain (missed renewals = fines/incidents). Hero image/video. Strong CTA (Start Free Trial).',
        effort: 'Small',
        priority: 1,
        dependencies: 'Messaging framework'
      },
      {
        title: 'Build features section',
        description: 'Highlight 5-6 core features with icons: AI extraction, Alerts, Dashboard, Versioning, Team access, Reporting. Benefit-focused copy.',
        effort: 'Small',
        priority: 1,
        dependencies: 'Messaging framework'
      },
      {
        title: 'Create pricing page',
        description: 'Clear pricing table: Starter/Professional/Business. Show limits, features, annual discount. Trial CTA. FAQ below.',
        effort: 'Small',
        priority: 1,
        dependencies: 'Pricing strategy'
      },
      {
        title: 'Build social proof section',
        description: 'Testimonials (3-5 early users), logos of beta customers, stats (X documents processed, Y alerts sent).',
        effort: 'Small',
        priority: 2,
        dependencies: 'Beta customers'
      },
      {
        title: 'Create comparison page',
        description: 'HatSafe vs Spreadsheets vs Folders. Feature comparison table. Highlight automation, alerts, ease of use.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Messaging framework'
      },
      {
        title: 'Implement conversion tracking',
        description: 'Google Analytics 4, Plausible, or similar. Track: page views, trial signups, purchases. Goal funnels.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Website deployed'
      }
    ]
  },
  {
    name: 'Industry-Specific Landing Pages',
    description: 'Tailored landing pages for Construction, Facilities, Logistics, and Professional Services with industry-specific messaging and examples.',
    workstream: 'Website & Positioning',
    tasks: [
      {
        title: 'Create Construction landing page',
        description: 'Headline: track CSCS, SMSTS, plant certs. Pain: HSE fines, site shutdowns. Example docs: CSCS, CPCS, asbestos training.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Homepage complete'
      },
      {
        title: 'Create Facilities Management landing page',
        description: 'Focus on building compliance: PAT testing, fire safety, lift inspections, engineer qualifications. Regulatory emphasis.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Homepage complete'
      },
      {
        title: 'Create Logistics landing page',
        description: 'Fleet focus: MOT, insurance, driver licenses, tachograph certs. Pain: roadside checks, operator license risk.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Homepage complete'
      },
      {
        title: 'Create Professional Services landing page',
        description: 'Staff compliance: professional indemnity, accreditations, CPD, DBS checks. Audit readiness messaging.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Homepage complete'
      },
      {
        title: 'SEO optimize industry pages',
        description: 'Target keywords: "construction compliance software", "facilities document management", etc. Meta tags, schema markup.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Industry pages complete'
      }
    ]
  },
  {
    name: 'Content Hub & Resources',
    description: 'Blog, guides, templates, and educational resources to drive organic traffic and establish thought leadership.',
    workstream: 'Website & Positioning',
    tasks: [
      {
        title: 'Set up blog infrastructure',
        description: 'Markdown-based blog (MDX), category pages, author pages, RSS feed. SEO-friendly URLs.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Website framework'
      },
      {
        title: 'Write 10 foundational blog posts',
        description: 'Topics: compliance basics, document management best practices, avoiding fines, expiry tracking, AI benefits. 1000+ words each.',
        effort: 'Large',
        priority: 2,
        dependencies: 'Blog infrastructure'
      },
      {
        title: 'Create compliance checklist templates',
        description: 'Downloadable PDFs: construction site checklist, facilities compliance checklist, driver compliance checklist. Lead magnets.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Build resource library page',
        description: 'Categorized resources: guides, templates, webinar recordings, case studies. Search and filter.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Content created'
      },
      {
        title: 'Create video tutorials',
        description: '5-7 short videos: How to upload, how to set up alerts, how to read dashboard. Host on YouTube, embed on site.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Product complete'
      }
    ]
  },
  {
    name: 'Brand Identity & Design System',
    description: 'Logo, color palette, typography, component library, and brand guidelines for consistent visual identity.',
    workstream: 'Website & Positioning',
    tasks: [
      {
        title: 'Design logo and brand mark',
        description: 'Safety/construction theme. Hard hat visual? Bold, trustworthy. Works in black/yellow and monochrome.',
        effort: 'Small',
        priority: 1,
        dependencies: 'None'
      },
      {
        title: 'Define color palette and typography',
        description: 'Primary: Safety Yellow (#FFC107), Secondary: Deep Black (#1A1A1A). Status colors. Font stack (sans-serif for clarity).',
        effort: 'Small',
        priority: 1,
        dependencies: 'Logo complete'
      },
      {
        title: 'Create component library',
        description: 'Reusable components: buttons, forms, cards, modals, alerts. Documented in Storybook or Figma.',
        effort: 'Medium',
        priority: 1,
        dependencies: 'Design system defined'
      },
      {
        title: 'Write brand guidelines document',
        description: 'Voice/tone (professional, clear, helpful), logo usage, color codes, typography rules. PDF for partners/press.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Brand complete'
      }
    ]
  },
  {
    name: 'Product Demo & Screenshots',
    description: 'High-quality product screenshots, demo video, and interactive demo environment for prospects.',
    workstream: 'Website & Positioning',
    tasks: [
      {
        title: 'Create annotated product screenshots',
        description: '10-12 high-res screenshots of key features. Annotations highlighting key UI elements. Consistent fake data.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Product built'
      },
      {
        title: 'Record product demo video (2-3 min)',
        description: 'Screen recording + voiceover. Show: upload doc → AI extraction → dashboard update → alert sent. Professional editing.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Product complete'
      },
      {
        title: 'Build interactive demo environment',
        description: 'Sandbox mode with sample data. Prospects can click around without signing up. Reset on session end.',
        effort: 'Large',
        priority: 3,
        dependencies: 'Product complete'
      },
      {
        title: 'Create feature highlight animations',
        description: 'Short GIFs/videos (5-10s) showing individual features. Use in emails, social, ads.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Product complete'
      }
    ]
  },
  {
    name: 'SEO & Technical Optimization',
    description: 'On-page SEO, technical SEO, site speed optimization, and search engine indexing for organic discovery.',
    workstream: 'Website & Positioning',
    tasks: [
      {
        title: 'Implement on-page SEO',
        description: 'Optimize title tags, meta descriptions, H1-H6 structure, alt text. Target keywords per page.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Content written'
      },
      {
        title: 'Set up schema markup',
        description: 'Add structured data: Organization, Product, FAQPage, BlogPosting. Validate with Google Rich Results Test.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Website complete'
      },
      {
        title: 'Optimize site speed',
        description: 'Target <2s load time. Compress images, minify CSS/JS, lazy load, use CDN. Test with Lighthouse.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Website built'
      },
      {
        title: 'Create XML sitemap and robots.txt',
        description: 'Auto-generate sitemap, submit to Google Search Console and Bing Webmaster Tools. Configure robots.txt.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Website complete'
      },
      {
        title: 'Build internal linking structure',
        description: 'Link blog posts to product pages, industry pages to features. Logical hierarchy. Help Google understand site structure.',
        effort: 'Small',
        priority: 2,
        dependencies: 'All pages complete'
      }
    ]
  },
  {
    name: 'Competitive Analysis & Positioning',
    description: 'Research competitors, identify differentiation, and craft unique positioning that resonates with target market.',
    workstream: 'Website & Positioning',
    tasks: [
      {
        title: 'Research 10-15 competitors',
        description: 'Identify direct (compliance software) and indirect (generic document management) competitors. Document features, pricing, positioning.',
        effort: 'Medium',
        priority: 1,
        dependencies: 'None'
      },
      {
        title: 'Create competitive feature matrix',
        description: 'Compare HatSafe vs top 5 competitors on key features. Identify gaps and advantages. Where do we win?',
        effort: 'Small',
        priority: 1,
        dependencies: 'Competitor research'
      },
      {
        title: 'Define unique value proposition',
        description: 'Craft 1-2 sentence UVP. What makes HatSafe different? AI-powered, industry-specific, dead simple.',
        effort: 'Small',
        priority: 1,
        dependencies: 'Competitive analysis'
      },
      {
        title: 'Develop messaging framework',
        description: 'Key messages for each audience: construction, facilities, logistics. Pain points, benefits, proof points.',
        effort: 'Medium',
        priority: 1,
        dependencies: 'UVP defined'
      },
      {
        title: 'Write battle cards for sales',
        description: 'How to sell against top 3 competitors. Their weaknesses, our strengths. Objection handling.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Competitive matrix'
      }
    ]
  },

  // =====================================================
  // WORKSTREAM 3: MARKETING & GTM (6 projects)
  // =====================================================
  {
    name: 'Content Marketing Strategy',
    description: 'Long-form guides, case studies, thought leadership content, and guest posting to drive organic traffic and establish authority.',
    workstream: 'Marketing & GTM',
    tasks: [
      {
        title: 'Create content calendar (6 months)',
        description: 'Plan blog posts, guides, videos, social posts. 2-3 posts per week. Mix of SEO-driven and thought leadership.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Messaging framework'
      },
      {
        title: 'Write ultimate compliance guides (3-4)',
        description: '3000+ word guides: Construction Site Compliance, Facilities Compliance, Fleet Compliance. Downloadable PDFs.',
        effort: 'Large',
        priority: 2,
        dependencies: 'Content calendar'
      },
      {
        title: 'Develop case studies (3-5 beta customers)',
        description: 'Document customer problem, solution, results (time saved, fines avoided). Quote, stats, before/after.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Beta customers'
      },
      {
        title: 'Publish thought leadership on LinkedIn',
        description: 'Ben to post weekly on compliance trends, AI in construction, regulatory changes. Position as expert.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Guest post on industry publications',
        description: 'Target construction/facilities blogs, trade magazines. Offer expert articles. Include backlinks to HatSafe.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Content written'
      }
    ]
  },
  {
    name: 'Paid Advertising Launch',
    description: 'Google Ads, LinkedIn Ads, and retargeting campaigns to drive trial signups and accelerate growth.',
    workstream: 'Marketing & GTM',
    tasks: [
      {
        title: 'Set up Google Ads campaigns',
        description: 'Target keywords: compliance software, document management, construction compliance. Search ads. Budget: £500-1000/month.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Landing pages ready'
      },
      {
        title: 'Create LinkedIn Ads campaigns',
        description: 'Target job titles: Operations Manager, Compliance Officer, H&S Manager. Sponsored content + InMail.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Ad creative ready'
      },
      {
        title: 'Design ad creative (10-15 variants)',
        description: 'Static images, carousel ads, video ads. Test different messages: pain-focused vs benefit-focused.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Brand assets'
      },
      {
        title: 'Implement retargeting pixels',
        description: 'Google, Facebook, LinkedIn retargeting. Show ads to website visitors who didn\'t sign up. Frequency cap.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Website deployed'
      },
      {
        title: 'Set up conversion tracking',
        description: 'Track ad → landing page → trial signup → paid conversion. Calculate CAC, LTV. Optimize campaigns.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Ads running'
      }
    ]
  },
  {
    name: 'Partnership Development',
    description: 'Strategic partnerships with industry associations, training providers, and complementary software vendors.',
    workstream: 'Marketing & GTM',
    tasks: [
      {
        title: 'Identify 20-30 potential partners',
        description: 'Construction associations (FMB, NFBC), training providers (CITB), H&S consultancies, accountants, payroll software.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Create partnership pitch deck',
        description: '5-7 slides: HatSafe overview, mutual benefits, co-marketing opportunities, revenue share model.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Messaging framework'
      },
      {
        title: 'Reach out to top 10 partners',
        description: 'Email + LinkedIn outreach. Offer demo, discuss integration or co-marketing. Aim for 2-3 partnerships.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Pitch deck ready'
      },
      {
        title: 'Build partner portal',
        description: 'Partner dashboard: track referrals, commission, co-branded assets. Affiliate link tracking.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Partnership agreements'
      },
      {
        title: 'Create co-marketing materials',
        description: 'Co-branded one-pagers, webinar decks, email templates for partners to share with their audience.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Partnerships signed'
      }
    ]
  },
  {
    name: 'PR & Media Relations',
    description: 'Press releases, media outreach, award submissions, and industry event presence to build credibility.',
    workstream: 'Marketing & GTM',
    tasks: [
      {
        title: 'Write launch press release',
        description: 'Announce HatSafe launch. Headline, problem/solution, quotes, availability. Distribute via PR Newswire or similar.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Product launched'
      },
      {
        title: 'Build media contact list',
        description: 'Identify journalists covering construction tech, compliance, SaaS. 30-50 contacts. Note their beats.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Pitch top 10 media outlets',
        description: 'Target: Construction News, Building Magazine, Facilities Management Journal, TechCrunch UK. Personalized pitches.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Press release ready'
      },
      {
        title: 'Submit to SaaS/startup awards',
        description: 'Apply for: Best Construction Tech, SaaS Startup of the Year, Innovation Awards. 5-10 awards.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Product launched'
      },
      {
        title: 'Speak at industry events',
        description: 'Apply to speak at construction/facilities conferences. Topic: AI in compliance, digital transformation.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Case studies ready'
      }
    ]
  },
  {
    name: 'Social Media Presence',
    description: 'Build and grow LinkedIn, Twitter/X, and YouTube channels with consistent, valuable content.',
    workstream: 'Marketing & GTM',
    tasks: [
      {
        title: 'Set up branded social accounts',
        description: 'LinkedIn company page, Twitter/X, YouTube channel. Consistent branding, complete profiles, links to website.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Brand assets'
      },
      {
        title: 'Create social media content calendar',
        description: 'Plan 3-5 posts per week: tips, industry news, product updates, customer wins. Schedule in Buffer/Hootsuite.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Social accounts live'
      },
      {
        title: 'Grow LinkedIn company page to 1000 followers',
        description: 'Invite contacts, employee advocacy, engage in groups, share valuable content. Target decision-makers.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Content calendar'
      },
      {
        title: 'Build YouTube tutorial library',
        description: '10-15 short how-to videos: product features, compliance tips, industry insights. SEO-optimized titles.',
        effort: 'Large',
        priority: 3,
        dependencies: 'Product complete'
      },
      {
        title: 'Engage in industry LinkedIn groups',
        description: 'Join 10-15 groups (construction, facilities management). Answer questions, share insights. Build authority.',
        effort: 'Small',
        priority: 3,
        dependencies: 'None'
      }
    ]
  },
  {
    name: 'Referral & Affiliate Program',
    description: 'Customer referral incentives and affiliate program to drive word-of-mouth growth.',
    workstream: 'Marketing & GTM',
    tasks: [
      {
        title: 'Design referral program structure',
        description: 'Rewards: referrer gets 1 month free, referee gets discount. Track with unique referral links.',
        effort: 'Small',
        priority: 3,
        dependencies: 'None'
      },
      {
        title: 'Build referral tracking system',
        description: 'Generate unique referral links per customer. Track clicks, signups, conversions. Auto-apply rewards.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Subscription system'
      },
      {
        title: 'Create referral marketing materials',
        description: 'Email templates, social share buttons, referral cards. Make it easy for customers to share.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Referral system built'
      },
      {
        title: 'Launch affiliate program',
        description: 'Recruit H&S consultants, industry influencers. 20-30% commission on sales. Provide affiliate dashboard.',
        effort: 'Medium',
        priority: 4,
        dependencies: 'Referral system'
      }
    ]
  },

  // =====================================================
  // WORKSTREAM 4: MAILING LIST & NURTURE (4 projects)
  // =====================================================
  {
    name: 'Email List Building',
    description: 'Lead magnets, landing pages, and opt-in strategies to build a high-quality email list of prospects.',
    workstream: 'Mailing List & Nurture',
    tasks: [
      {
        title: 'Create 3-5 lead magnets',
        description: 'Downloadable PDFs: Compliance checklist, expiry tracking template, ROI calculator, guide to avoiding fines.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Build dedicated landing pages for lead magnets',
        description: 'One page per lead magnet. Headline, benefit bullets, form (name + email). Thank you page with download.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Lead magnets created'
      },
      {
        title: 'Set up email capture forms',
        description: 'Embed forms on blog posts, resource pages. Popup on exit intent. Inline forms in high-traffic pages.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Email provider integrated'
      },
      {
        title: 'Integrate email marketing platform',
        description: 'Choose platform: ConvertKit, Mailchimp, or ActiveCampaign. Set up lists, tags, automation.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Run lead gen ads (LinkedIn/Google)',
        description: 'Promote lead magnets via ads. Test: compliance checklist vs ROI calculator. Budget: £300-500/month.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Lead magnets + landing pages'
      }
    ]
  },
  {
    name: 'Email Nurture Sequences',
    description: 'Automated drip campaigns to educate prospects, build trust, and drive trial signups.',
    workstream: 'Mailing List & Nurture',
    tasks: [
      {
        title: 'Write welcome email sequence (5 emails)',
        description: 'Email 1: Welcome + deliver lead magnet. 2: Pain story. 3: Introduce HatSafe. 4: Case study. 5: Trial CTA.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Email platform'
      },
      {
        title: 'Create trial onboarding email sequence (7 emails)',
        description: 'Day 0: Welcome + getting started. Day 1: Upload first doc. Day 3: Set up alerts. Day 5: Invite team. Day 14: Trial ending.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Email platform'
      },
      {
        title: 'Build abandoned trial follow-up sequence',
        description: 'Trigger: signed up but didn\'t upload doc. 3 emails: tips, support offer, case study. Recover 10-20% of trials.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Trial sequence'
      },
      {
        title: 'Create churn prevention email sequence',
        description: 'Trigger: subscription canceled. 3 emails: feedback request, discount offer, win-back story. Measure re-activation rate.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Subscription system'
      },
      {
        title: 'Write re-engagement campaign (cold leads)',
        description: 'For leads inactive >90 days. 3 emails: what\'s new, case study, special offer. Unsubscribe non-responders.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Email platform'
      }
    ]
  },
  {
    name: 'Newsletter & Thought Leadership',
    description: 'Weekly or monthly newsletter with compliance tips, industry news, and product updates to keep subscribers engaged.',
    workstream: 'Mailing List & Nurture',
    tasks: [
      {
        title: 'Define newsletter strategy',
        description: 'Frequency: weekly or biweekly. Content: compliance tips, industry news, product updates, customer stories.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Design newsletter template',
        description: 'Branded email template. Sections: intro, tip of the week, industry news, product update, CTA.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Brand assets'
      },
      {
        title: 'Write first 10 newsletters',
        description: 'Batch-create content for first 10 weeks. Schedule in advance. Monitor open/click rates.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Newsletter template'
      },
      {
        title: 'Build newsletter signup widget',
        description: 'Footer form on all pages. Separate list for newsletter subscribers vs trial signups. Double opt-in.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Email platform'
      },
      {
        title: 'Optimize send times and subject lines',
        description: 'A/B test: Tuesday vs Thursday, morning vs afternoon. Test subject lines. Aim for 25%+ open rate.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Newsletters sent'
      }
    ]
  },
  {
    name: 'Email Segmentation & Personalization',
    description: 'Tag-based segmentation and personalized email content based on industry, role, and behavior.',
    workstream: 'Mailing List & Nurture',
    tasks: [
      {
        title: 'Define segmentation strategy',
        description: 'Segments: by industry (construction/facilities/logistics), by role, by engagement level, by trial status.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Implement tagging on signup forms',
        description: 'Ask: What industry? What role? Add tags automatically. Use for targeting.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Email platform'
      },
      {
        title: 'Create industry-specific email content',
        description: 'Write variants: construction-focused examples, facilities examples, logistics examples. Swap based on tags.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Segmentation defined'
      },
      {
        title: 'Build behavioral triggers',
        description: 'Trigger emails based on actions: visited pricing page, watched demo video, opened 3+ emails (hot lead).',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Tracking implemented'
      },
      {
        title: 'Test personalization impact',
        description: 'A/B test: generic emails vs personalized. Measure: open rate, click rate, conversion rate. Iterate.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Personalization live'
      }
    ]
  },

  // =====================================================
  // WORKSTREAM 5: ONBOARDING & CUSTOMER SUCCESS (5 projects)
  // =====================================================
  {
    name: 'Trial Onboarding Experience',
    description: 'Smooth onboarding flow to get trial users to their first success moment quickly and reduce drop-off.',
    workstream: 'Onboarding & Customer Success',
    tasks: [
      {
        title: 'Design onboarding checklist',
        description: 'In-app checklist: Upload first doc, Set up first entity, Configure alerts, Invite team member. Track completion.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Product built'
      },
      {
        title: 'Build interactive product tour',
        description: 'Use Intro.js or similar. 5-step tour on first login: Dashboard, Upload, Entities, Alerts, Settings.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Product complete'
      },
      {
        title: 'Create empty state guidance',
        description: 'When no data: show example screenshots + CTA to upload/create. Make it obvious what to do next.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Product built'
      },
      {
        title: 'Implement onboarding email sequence',
        description: 'Day 0: Welcome. Day 1: Upload reminder. Day 3: Tips. Day 7: Support offer. Day 14: Trial ending warning.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Email platform'
      },
      {
        title: 'Add in-app messaging for key actions',
        description: 'Tooltips, progress indicators, success messages. Celebrate milestones (First doc uploaded!).',
        effort: 'Small',
        priority: 2,
        dependencies: 'Product built'
      },
      {
        title: 'Track onboarding funnel metrics',
        description: 'Measure: signup → first login → first upload → first entity created → invite sent. Identify drop-off points.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Analytics set up'
      }
    ]
  },
  {
    name: 'Documentation & Help Center',
    description: 'Comprehensive documentation, FAQs, video tutorials, and searchable help center for self-service support.',
    workstream: 'Onboarding & Customer Success',
    tasks: [
      {
        title: 'Build help center infrastructure',
        description: 'Use Notion, GitBook, or custom. Categories: Getting Started, Features, Billing, Troubleshooting, API.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Write getting started guide',
        description: 'Step-by-step: Sign up, Upload first document, Create entity, Set up alerts, Invite team. Screenshots.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Help center live'
      },
      {
        title: 'Document all features',
        description: '20-30 articles covering every feature. How to use, tips, troubleshooting. Keep updated as features evolve.',
        effort: 'Large',
        priority: 2,
        dependencies: 'Product complete'
      },
      {
        title: 'Create FAQ page',
        description: '20-30 common questions: pricing, security, data privacy, integrations, mobile app. Clear answers.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Record video tutorials (10-15)',
        description: 'Screen recordings with voiceover. 2-5 minutes each. Upload to YouTube, embed in help center.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Product complete'
      },
      {
        title: 'Implement in-app help widget',
        description: 'Contextual help icon. Search documentation, open ticket, chat. Powered by Intercom or similar.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Help center complete'
      }
    ]
  },
  {
    name: 'Customer Support System',
    description: 'Ticketing, live chat, email support, and SLA management to ensure responsive customer service.',
    workstream: 'Onboarding & Customer Success',
    tasks: [
      {
        title: 'Set up support ticketing system',
        description: 'Choose platform: Zendesk, Freshdesk, or Front. Email → ticket. Track status, priority, response time.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Define support SLAs',
        description: 'Response times: Urgent 2h, High 8h, Normal 24h. Resolution targets. Communicate in docs.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Create support email templates',
        description: 'Templates for common issues: password reset, billing questions, feature requests, bug reports.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Support system live'
      },
      {
        title: 'Implement live chat (optional)',
        description: 'Use Intercom or Crisp. Available during business hours. Route to support team. Set auto-responses.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Support team ready'
      },
      {
        title: 'Build internal knowledge base for support',
        description: 'Document how to handle common issues, escalation paths, troubleshooting steps. Train support team.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Support tickets collected'
      }
    ]
  },
  {
    name: 'Customer Success Program',
    description: 'Proactive outreach, health monitoring, and success milestones to drive retention and expansion.',
    workstream: 'Onboarding & Customer Success',
    tasks: [
      {
        title: 'Define customer health scoring',
        description: 'Score based on: logins, documents uploaded, alerts configured, team members invited. Green/Yellow/Red status.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Analytics platform'
      },
      {
        title: 'Build customer success dashboard',
        description: 'View all customers, health scores, usage stats, last activity. Flag at-risk accounts.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Health scoring defined'
      },
      {
        title: 'Create success milestone emails',
        description: 'Celebrate: 10 docs uploaded, 1 month active, 100% compliance achieved. Reinforce value.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Email platform'
      },
      {
        title: 'Implement proactive outreach for at-risk accounts',
        description: 'Weekly review of red/yellow accounts. Email or call to offer help. Aim to prevent churn.',
        effort: 'Small',
        priority: 3,
        dependencies: 'CS dashboard'
      },
      {
        title: 'Build quarterly business reviews (QBRs)',
        description: 'For Professional/Business customers. Review usage, value delivered, upcoming features. Identify upsell opportunities.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Customer data available'
      }
    ]
  },
  {
    name: 'Training & Webinars',
    description: 'Live training sessions, recorded webinars, and certification programs to help customers maximize value.',
    workstream: 'Onboarding & Customer Success',
    tasks: [
      {
        title: 'Create live onboarding webinar',
        description: '30-45 min session. Run weekly. Cover: setup, upload, alerts, reporting. Q&A at end. Record for library.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Product complete'
      },
      {
        title: 'Build on-demand training library',
        description: 'Recorded webinars on advanced topics: bulk imports, custom workflows, API usage. Host on help center.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Webinars recorded'
      },
      {
        title: 'Develop admin training program',
        description: 'Deep-dive training for org admins. Cover: user management, settings, integrations, reporting. 1-2 hours.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Product complete'
      },
      {
        title: 'Create certification program (optional)',
        description: 'HatSafe Certified Admin badge. Complete training + pass quiz. Gamification, social proof.',
        effort: 'Medium',
        priority: 4,
        dependencies: 'Training program live'
      }
    ]
  },

  // =====================================================
  // WORKSTREAM 6: SALES & PARTNERSHIPS (4 projects)
  // =====================================================
  {
    name: 'Sales Process & Collateral',
    description: 'Define sales methodology, create pitch decks, demo scripts, and proposal templates for consistent selling.',
    workstream: 'Sales & Partnerships',
    tasks: [
      {
        title: 'Define sales methodology',
        description: 'Decide: self-serve vs sales-assisted. Qualify criteria (BANT). Sales stages: Lead → Demo → Trial → Negotiation → Closed.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Create sales pitch deck',
        description: '10-12 slides: Problem, Solution, Demo, Case studies, Pricing, Next steps. Editable template for sales team.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Messaging framework'
      },
      {
        title: 'Write demo script',
        description: 'Step-by-step demo flow (15-20 min). Discovery questions, feature walkthrough, handle objections, close.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Product complete'
      },
      {
        title: 'Create proposal template',
        description: 'Customizable proposal: customer name, pain points addressed, solution overview, pricing, terms. PDF export.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Pricing finalized'
      },
      {
        title: 'Build ROI calculator',
        description: 'Interactive tool: input # of entities, time spent manually → calculate time/cost saved with HatSafe. Use in demos.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Document objection handling',
        description: 'Common objections: too expensive, already have a system, AI concerns. Prepare responses. Role-play practice.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Sales experience'
      }
    ]
  },
  {
    name: 'CRM & Lead Management',
    description: 'CRM setup, lead scoring, pipeline management, and sales analytics to track and optimize conversions.',
    workstream: 'Sales & Partnerships',
    tasks: [
      {
        title: 'Set up CRM system',
        description: 'Choose CRM: HubSpot, Pipedrive, or Close. Configure: lead stages, custom fields, deal tracking.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Integrate website forms with CRM',
        description: 'Auto-create leads from trial signups, demo requests, contact forms. Tag by source.',
        effort: 'Small',
        priority: 2,
        dependencies: 'CRM set up'
      },
      {
        title: 'Define lead scoring criteria',
        description: 'Score based on: company size, industry, engagement (email opens, page views), fit (budget, authority).',
        effort: 'Small',
        priority: 2,
        dependencies: 'CRM integration'
      },
      {
        title: 'Build sales pipeline dashboards',
        description: 'Track: leads by stage, conversion rates, deal value, time in stage. Identify bottlenecks.',
        effort: 'Small',
        priority: 2,
        dependencies: 'CRM data flowing'
      },
      {
        title: 'Create lead nurture automation in CRM',
        description: 'Auto-send: demo invite, case study, pricing info based on lead score and behavior. Sequence until response.',
        effort: 'Small',
        priority: 2,
        dependencies: 'CRM set up'
      }
    ]
  },
  {
    name: 'Channel Partnerships',
    description: 'Recruit and enable resellers, affiliates, and referral partners to extend reach and drive indirect sales.',
    workstream: 'Sales & Partnerships',
    tasks: [
      {
        title: 'Define partner program tiers',
        description: 'Tiers: Referral (one-time commission), Affiliate (recurring), Reseller (white-label). Commission rates.',
        effort: 'Small',
        priority: 3,
        dependencies: 'None'
      },
      {
        title: 'Create partner onboarding kit',
        description: 'Welcome packet: program overview, commission structure, marketing assets, demo access, contact.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Partner program defined'
      },
      {
        title: 'Recruit 5-10 initial partners',
        description: 'Target: H&S consultancies, construction accountants, payroll providers. Personalized outreach. Pilot program.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Partner kit ready'
      },
      {
        title: 'Build partner enablement resources',
        description: 'Sales training deck, objection handling guide, demo videos. Make it easy for partners to sell.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Partners recruited'
      },
      {
        title: 'Track partner performance',
        description: 'Dashboard: leads from each partner, conversion rate, revenue generated. Monthly reports. Optimize top performers.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Partners active'
      }
    ]
  },
  {
    name: 'Industry Partnerships',
    description: 'Strategic alliances with construction associations, training bodies, and industry influencers.',
    workstream: 'Sales & Partnerships',
    tasks: [
      {
        title: 'Identify top industry associations',
        description: 'Research: FMB, NFBC, CITB, BIFM, RICS. Understand member base, engagement channels.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Develop association partnership proposal',
        description: 'Offer: member discount, co-marketing, webinar, sponsor events. Mutual value proposition.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Messaging framework'
      },
      {
        title: 'Reach out to 3-5 associations',
        description: 'Email decision-makers. Offer demo. Discuss partnership options. Aim for 1-2 partnerships.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Proposal ready'
      },
      {
        title: 'Co-host webinar with partner association',
        description: 'Topic: compliance best practices, avoiding fines. HatSafe demo at end. Promote to their members.',
        effort: 'Medium',
        priority: 3,
        dependencies: 'Partnership signed'
      },
      {
        title: 'Secure industry influencer endorsements',
        description: 'Identify LinkedIn influencers in construction/facilities. Offer free access. Ask for testimonial/review.',
        effort: 'Small',
        priority: 3,
        dependencies: 'Product proven'
      }
    ]
  },

  // =====================================================
  // WORKSTREAM 7: OPERATIONS & LAUNCH (5 projects)
  // =====================================================
  {
    name: 'Launch Planning & Coordination',
    description: 'Comprehensive launch plan with timeline, milestones, go-to-market activities, and cross-functional coordination.',
    workstream: 'Operations & Launch',
    tasks: [
      {
        title: 'Create master launch timeline',
        description: 'Gantt chart or roadmap: all projects, tasks, dependencies, owners, deadlines. Weekly review meetings.',
        effort: 'Small',
        priority: 1,
        dependencies: 'None'
      },
      {
        title: 'Define launch readiness criteria',
        description: 'Checklist: product features, docs, marketing site, email sequences, support, pricing, analytics. Gate for go-live.',
        effort: 'Small',
        priority: 1,
        dependencies: 'None'
      },
      {
        title: 'Plan launch day activities',
        description: 'Sequence: press release, social posts, email to waitlist, Product Hunt launch, LinkedIn announcement.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Launch date set'
      },
      {
        title: 'Coordinate cross-functional teams',
        description: 'Weekly stand-ups: product, marketing, sales, support. Blockers, dependencies, status. Keep everyone aligned.',
        effort: 'Small',
        priority: 1,
        dependencies: 'Teams formed'
      },
      {
        title: 'Build launch day war room',
        description: 'Slack channel or Zoom room. Monitor: site traffic, signups, errors, support tickets. Real-time triage.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Launch day near'
      }
    ]
  },
  {
    name: 'Beta Testing Program',
    description: 'Recruit beta testers, collect feedback, iterate on product, and gather case studies and testimonials.',
    workstream: 'Operations & Launch',
    tasks: [
      {
        title: 'Define beta program structure',
        description: 'Duration: 4-6 weeks. Benefits: free access, early adopter badge, input on roadmap. Requirements: feedback sessions.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Product MVP ready'
      },
      {
        title: 'Recruit 10-20 beta customers',
        description: 'Outreach to network, LinkedIn, industry groups. Target: mix of construction, facilities, logistics. Diverse company sizes.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Beta program defined'
      },
      {
        title: 'Create beta feedback survey',
        description: 'Questions: ease of use, value, missing features, pricing perception, willingness to recommend. Sent after 2 weeks.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Beta users onboarded'
      },
      {
        title: 'Conduct 1-on-1 feedback sessions',
        description: 'Schedule 30 min calls with each beta user. Watch them use product. Note friction points. Capture testimonials.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Beta users active'
      },
      {
        title: 'Iterate based on beta feedback',
        description: 'Prioritize top 5-10 issues/requests. Fix bugs, tweak UX, add quick wins. Re-test with beta users.',
        effort: 'Medium',
        priority: 2,
        dependencies: 'Feedback collected'
      },
      {
        title: 'Collect testimonials and case studies',
        description: 'Ask beta users for quotes, stories, results. Use on website, in emails, in sales deck.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Beta complete'
      }
    ]
  },
  {
    name: 'Metrics & Analytics Setup',
    description: 'Define KPIs, set up tracking, build dashboards, and establish reporting cadence for data-driven decisions.',
    workstream: 'Operations & Launch',
    tasks: [
      {
        title: 'Define core business metrics',
        description: 'KPIs: MRR, trial-to-paid %, churn rate, CAC, LTV, NPS. Product: DAU/MAU, docs uploaded, alerts sent.',
        effort: 'Small',
        priority: 1,
        dependencies: 'None'
      },
      {
        title: 'Set up analytics infrastructure',
        description: 'Use: Mixpanel, Amplitude, or custom. Track: signups, feature usage, conversions, retention cohorts.',
        effort: 'Medium',
        priority: 1,
        dependencies: 'Product built'
      },
      {
        title: 'Build real-time business dashboard',
        description: 'Show: current MRR, today\'s signups, active trials, churn this month. Share with team. Update daily.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Analytics set up'
      },
      {
        title: 'Implement revenue tracking',
        description: 'Integrate Stripe revenue data. Track: MRR, ARR, growth rate, upgrades/downgrades, churn revenue.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Stripe integration'
      },
      {
        title: 'Set up weekly/monthly reporting',
        description: 'Automate reports: weekly highlights email, monthly board deck. Key metrics, trends, action items.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Dashboard built'
      },
      {
        title: 'Build funnel conversion tracking',
        description: 'Track: visitor → signup → trial → paid. Measure drop-off at each stage. A/B test improvements.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Analytics platform'
      }
    ]
  },
  {
    name: 'Legal & Compliance',
    description: 'Terms of service, privacy policy, data processing agreements, and GDPR compliance for legal protection.',
    workstream: 'Operations & Launch',
    tasks: [
      {
        title: 'Draft Terms of Service',
        description: 'Cover: user rights, acceptable use, liability, termination, dispute resolution. Review by lawyer.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Draft Privacy Policy',
        description: 'GDPR-compliant. Cover: data collected, usage, retention, user rights (access, deletion), cookies.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Create Data Processing Agreement (DPA)',
        description: 'For enterprise customers. Define: data ownership, processor obligations, security, breach notification.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Legal review'
      },
      {
        title: 'Implement GDPR compliance',
        description: 'Features: data export, data deletion on request, cookie consent banner, audit logs.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Product built'
      },
      {
        title: 'Set up cookie consent',
        description: 'Use CookieYes or similar. Compliant banner, cookie policy page, opt-out options.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Website deployed'
      }
    ]
  },
  {
    name: 'Operations Runbook & Monitoring',
    description: 'Incident response, monitoring, backup/recovery, and operational playbooks to ensure reliability and uptime.',
    workstream: 'Operations & Launch',
    tasks: [
      {
        title: 'Set up uptime monitoring',
        description: 'Use UptimeRobot or Pingdom. Monitor: website, app, API. Alert via Slack/email on downtime.',
        effort: 'Small',
        priority: 2,
        dependencies: 'App deployed'
      },
      {
        title: 'Implement error tracking',
        description: 'Use Sentry or Rollbar. Track: frontend errors, API errors, failed jobs. Alert on critical errors.',
        effort: 'Small',
        priority: 2,
        dependencies: 'App deployed'
      },
      {
        title: 'Create incident response playbook',
        description: 'Document: who to notify, triage steps, communication templates, escalation path. Test with simulation.',
        effort: 'Small',
        priority: 2,
        dependencies: 'None'
      },
      {
        title: 'Set up automated database backups',
        description: 'Supabase auto-backups enabled. Test restore process. Retention: daily for 7 days, weekly for 4 weeks.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Database live'
      },
      {
        title: 'Build status page',
        description: 'Public status page (StatusPage.io or custom). Show: uptime, incidents, scheduled maintenance. Link in app footer.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Monitoring set up'
      },
      {
        title: 'Document operational procedures',
        description: 'Runbook: deploy process, rollback, database migrations, scaling, customer data export. For team continuity.',
        effort: 'Small',
        priority: 2,
        dependencies: 'Operations experience'
      }
    ]
  }
];

// Get status by default (inbox)
async function getDefaultStatus(workspaceId) {
  const status = await prisma.status.findFirst({
    where: {
      workspaceId,
      type: 'inbox',
    },
  });
  
  if (!status) {
    throw new Error('No inbox status found. Please create a default status first.');
  }
  
  return status;
}

// Create all projects and tasks
async function createProjects() {
  console.log('🦺 HatSafe Project Creation Script');
  console.log('=====================================\n');
  
  try {
    // Get default status
    const defaultStatus = await getDefaultStatus(CONFIG.workspaceId);
    console.log(`✅ Found default status: ${defaultStatus.name} (${defaultStatus.id})\n`);
    
    let totalProjects = 0;
    let totalTasks = 0;
    const workstreamSummary = {};
    const allProjectIds = [];
    
    for (const projectData of PROJECTS_DATA) {
      console.log(`\n📋 Creating project: ${projectData.name}`);
      console.log(`   Workstream: ${projectData.workstream}`);
      
      // Create project
      const project = await prisma.project.create({
        data: {
          workspaceId: CONFIG.workspaceId,
          companyId: CONFIG.companyId,
          name: projectData.name,
          description: projectData.description,
        },
      });
      
      totalProjects++;
      allProjectIds.push(project.id);
      
      // Track workstream
      if (!workstreamSummary[projectData.workstream]) {
        workstreamSummary[projectData.workstream] = { projects: 0, tasks: 0 };
      }
      workstreamSummary[projectData.workstream].projects++;
      
      console.log(`   ✅ Project created: ${project.id}`);
      console.log(`   📝 Creating ${projectData.tasks.length} tasks...`);
      
      // Create tasks for this project
      for (const taskData of projectData.tasks) {
        const task = await prisma.task.create({
          data: {
            title: taskData.title,
            description: `${taskData.description}\n\nEffort: ${taskData.effort}\nDependencies: ${taskData.dependencies}`,
            priority: taskData.priority || 2,
            createdBy: CONFIG.createdBy,
            workspace: {
              connect: { id: CONFIG.workspaceId }
            },
            status: {
              connect: { id: defaultStatus.id }
            },
            project: {
              connect: { id: project.id }
            }
          },
        });
        
        totalTasks++;
        workstreamSummary[projectData.workstream].tasks++;
      }
      
      console.log(`   ✅ ${projectData.tasks.length} tasks created`);
    }
    
    // Print summary
    console.log('\n\n🎉 PROJECT CREATION COMPLETE!');
    console.log('=====================================\n');
    console.log(`📊 SUMMARY:`);
    console.log(`   Total Projects: ${totalProjects}`);
    console.log(`   Total Tasks: ${totalTasks}`);
    console.log(`   Company: HatSafe (${CONFIG.companyId})`);
    console.log(`   Workspace: ${CONFIG.workspaceId}\n`);
    
    console.log('📋 BREAKDOWN BY WORKSTREAM:\n');
    for (const [workstream, stats] of Object.entries(workstreamSummary)) {
      console.log(`   ${workstream}:`);
      console.log(`      Projects: ${stats.projects}`);
      console.log(`      Tasks: ${stats.tasks}`);
      console.log('');
    }
    
    console.log('\n🔗 ALL PROJECT IDs:\n');
    allProjectIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
    
    console.log('\n\n✅ VERIFICATION:');
    
    // Verify all projects are linked to HatSafe
    const verifyProjects = await prisma.project.count({
      where: {
        companyId: CONFIG.companyId,
        workspaceId: CONFIG.workspaceId,
      },
    });
    
    const verifyTasks = await prisma.task.count({
      where: {
        workspaceId: CONFIG.workspaceId,
        project: {
          companyId: CONFIG.companyId,
        },
      },
    });
    
    console.log(`   Projects linked to HatSafe: ${verifyProjects}/${totalProjects}`);
    console.log(`   Tasks linked via projects: ${verifyTasks}/${totalTasks}`);
    
    if (verifyProjects === totalProjects && verifyTasks === totalTasks) {
      console.log('\n   ✅ All projects and tasks correctly linked!\n');
    } else {
      console.log('\n   ⚠️  Warning: Some projects/tasks may not be linked correctly\n');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createProjects()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
