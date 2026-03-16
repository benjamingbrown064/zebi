// Create 5 comprehensive HatSafe documents in Zebi
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const COMPANY_ID = '740849c1-6f6d-42c8-87ca-de7bb042644f';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// Helper to convert markdown-like structure to ProseMirror JSON
function createContent(sections) {
  const content = [];
  
  sections.forEach(section => {
    if (section.type === 'heading') {
      content.push({
        type: 'heading',
        attrs: { level: section.level || 2 },
        content: [{ type: 'text', text: section.text }]
      });
    } else if (section.type === 'paragraph') {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: section.text }]
      });
    } else if (section.type === 'bulletList') {
      content.push({
        type: 'bulletList',
        content: section.items.map(item => ({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: item }]
          }]
        }))
      });
    } else if (section.type === 'orderedList') {
      content.push({
        type: 'orderedList',
        attrs: { start: 1 },
        content: section.items.map(item => ({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: item }]
          }]
        }))
      });
    } else if (section.type === 'codeBlock') {
      content.push({
        type: 'codeBlock',
        content: [{ type: 'text', text: section.text }]
      });
    }
  });
  
  return { type: 'doc', content };
}

// Document 1: Technical Specification
const technicalSpec = createContent([
  { type: 'heading', level: 1, text: 'HatSafe - Technical Specification' },
  { type: 'paragraph', text: 'AI-powered compliance document management platform for construction and trades industries.' },
  
  { type: 'heading', level: 2, text: '1. System Architecture' },
  { type: 'paragraph', text: 'HatSafe employs a modern, scalable serverless architecture built on Next.js 14 and Supabase.' },
  
  { type: 'heading', level: 3, text: '1.1 Frontend Architecture' },
  { type: 'bulletList', items: [
    'Next.js 14 with App Router for optimal performance and SEO',
    'React Server Components for reduced client-side JavaScript',
    'TypeScript in strict mode for type safety',
    'Tailwind CSS for utility-first styling',
    'HeroUI component library for consistent design system'
  ]},
  
  { type: 'heading', level: 3, text: '1.2 Backend Architecture' },
  { type: 'bulletList', items: [
    'Supabase PostgreSQL 15 database with 15-table schema',
    'Row Level Security (RLS) for multi-tenant data isolation',
    'Supabase Auth for authentication and session management',
    'Supabase Storage for encrypted document storage',
    'Serverless API routes via Next.js on Vercel'
  ]},
  
  { type: 'heading', level: 2, text: '2. AI Processing Pipeline' },
  { type: 'paragraph', text: 'The AI extraction system uses OpenAI GPT-4o-mini Vision API to automatically extract compliance data from uploaded documents.' },
  
  { type: 'heading', level: 3, text: '2.1 Processing Flow' },
  { type: 'orderedList', items: [
    'User uploads document (PDF, image, or photo)',
    'File stored in Supabase Storage bucket with encryption',
    'Document metadata inserted into documents table',
    'Async job triggers AI extraction via OpenAI Vision API',
    'AI extracts: document type, holder name, certificate number, issue/expiry dates, issuer',
    'Confidence score calculated (0.0-1.0 scale)',
    'High-confidence extractions (>0.7) auto-approved',
    'Low-confidence extractions queued for manual review',
    'Extraction audit trail stored in document_extractions table'
  ]},
  
  { type: 'heading', level: 3, text: '2.2 AI Model Configuration' },
  { type: 'bulletList', items: [
    'Model: gpt-4o-mini',
    'Input: Base64-encoded image or PDF first page',
    'Prompt: Structured extraction of compliance fields',
    'Output: JSON with extracted fields + confidence scores',
    'Cost: ~£0.005 per document',
    'Processing time: 2-5 seconds average'
  ]},
  
  { type: 'heading', level: 2, text: '3. Document Storage' },
  { type: 'paragraph', text: 'All documents stored in Supabase Storage with enterprise-grade security.' },
  
  { type: 'heading', level: 3, text: '3.1 Storage Architecture' },
  { type: 'bulletList', items: [
    'Bucket: documents (private)',
    'Encryption: AES-256 at rest',
    'Access control: RLS policies enforce org-level isolation',
    'Versioning: All document uploads preserved in document_versions table',
    'Soft delete: Archived documents recoverable (compliance requirement)',
    'CDN: Global edge caching for fast retrieval'
  ]},
  
  { type: 'heading', level: 3, text: '3.2 File Organization' },
  { type: 'paragraph', text: 'Path structure: {orgId}/{entityType}/{entityId}/{documentId}.{ext}' },
  { type: 'bulletList', items: [
    'Supports: PDF, JPG, PNG, HEIC',
    'Max file size: 10MB',
    'Naming: UUID-based to prevent collisions'
  ]},
  
  { type: 'heading', level: 2, text: '4. Security Measures' },
  
  { type: 'heading', level: 3, text: '4.1 Authentication' },
  { type: 'bulletList', items: [
    'Supabase Auth with email/password',
    'Secure password hashing (bcrypt)',
    'Session tokens with 7-day expiry',
    'Refresh token rotation',
    'Password reset via email'
  ]},
  
  { type: 'heading', level: 3, text: '4.2 Authorization' },
  { type: 'bulletList', items: [
    'Row Level Security (RLS) on all tables',
    'Organisation-level data isolation',
    'Role-based access control (Admin, Manager, Viewer)',
    'API middleware validates workspace context',
    'All queries scoped to authenticated user\'s organisation'
  ]},
  
  { type: 'heading', level: 3, text: '4.3 Data Protection' },
  { type: 'bulletList', items: [
    'HTTPS/TLS 1.3 for all connections',
    'Environment variables for secrets (never in code)',
    'Database encryption at rest (AES-256)',
    'Storage encryption at rest (AES-256)',
    'Audit logging for all data access',
    'GDPR compliance ready (data export/deletion APIs)'
  ]},
  
  { type: 'heading', level: 2, text: '5. Database Schema' },
  { type: 'paragraph', text: '15 tables with comprehensive relationships:' },
  { type: 'bulletList', items: [
    'organisations - Multi-tenant root (billing, settings)',
    'users - User accounts (auth, profile)',
    'teams - Organisational structure',
    'people - Employees/contractors',
    'vehicles - Fleet management',
    'assets - Equipment/tools',
    'sites - Work locations',
    'suppliers - External vendors',
    'documents - Document metadata',
    'document_versions - Version history',
    'document_extractions - AI audit trail',
    'document_types - Custom document types',
    'notifications - Alert system',
    'notification_schedules - Recurring alerts',
    'audit_log - Security audit trail'
  ]},
  
  { type: 'heading', level: 2, text: '6. API Design' },
  { type: 'paragraph', text: 'RESTful API routes with Next.js serverless functions.' },
  
  { type: 'heading', level: 3, text: '6.1 Core Endpoints' },
  { type: 'bulletList', items: [
    'GET /api/dashboard/stats - Dashboard metrics',
    'GET /api/people - List people with filters',
    'POST /api/people - Create person',
    'GET /api/people/[id] - Get person details',
    'PATCH /api/people/[id] - Update person',
    'DELETE /api/people/[id] - Soft delete person',
    'POST /api/documents/upload - Upload document',
    'POST /api/documents/extract - Trigger AI extraction',
    'GET /api/documents - List documents with filters',
    'POST /api/auth/create-organisation - Organisation signup'
  ]},
  
  { type: 'heading', level: 3, text: '6.2 Response Format' },
  { type: 'codeBlock', text: `{
  "success": true,
  "data": {...},
  "total": 100,
  "limit": 50,
  "offset": 0
}` },
  
  { type: 'heading', level: 2, text: '7. Integrations' },
  { type: 'bulletList', items: [
    'OpenAI - AI document extraction',
    'Stripe - Subscription billing (planned)',
    'SendGrid/Resend - Email notifications (planned)',
    'Vercel - Hosting and CDN',
    'Supabase - Database, auth, storage'
  ]},
  
  { type: 'heading', level: 2, text: '8. Scalability' },
  
  { type: 'heading', level: 3, text: '8.1 Performance Targets' },
  { type: 'bulletList', items: [
    'Page load: < 1.5s (LCP)',
    'Time to Interactive: < 3s',
    'API response: < 500ms (p95)',
    'Document upload: < 5s end-to-end',
    'AI extraction: < 10s (async, doesn\'t block UI)',
    'Concurrent users: 10,000+ supported'
  ]},
  
  { type: 'heading', level: 3, text: '8.2 Scaling Strategy' },
  { type: 'bulletList', items: [
    'Serverless architecture - auto-scales with traffic',
    'CDN edge caching - reduces origin load',
    'Database connection pooling - Supabase handles this',
    'Async processing - AI extraction doesn\'t block requests',
    'Pagination - all lists support limit/offset',
    'Indexing - strategic database indexes on query paths'
  ]},
  
  { type: 'heading', level: 2, text: '9. Monitoring & Observability' },
  { type: 'bulletList', items: [
    'Vercel Analytics - Real user monitoring',
    'Supabase Metrics - Database performance',
    'API logging - All requests/responses logged',
    'Error tracking - Sentry integration (planned)',
    'Uptime monitoring - Healthcheck endpoint'
  ]},
  
  { type: 'heading', level: 2, text: '10. Deployment Pipeline' },
  { type: 'orderedList', items: [
    'Code push to main branch',
    'Vercel auto-builds and runs tests',
    'Preview deployment created for review',
    'Manual approval for production',
    'Zero-downtime deployment via Vercel',
    'Automatic rollback on errors'
  ]},
  
  { type: 'paragraph', text: '---' },
  { type: 'paragraph', text: 'Last updated: March 15, 2026' }
]);

// Document 2: Product Overview
const productOverview = createContent([
  { type: 'heading', level: 1, text: 'HatSafe - Product Overview' },
  { type: 'paragraph', text: 'Compliance made simple. Never miss a deadline.' },
  
  { type: 'heading', level: 2, text: '1. Core Features' },
  
  { type: 'heading', level: 3, text: '1.1 AI Document Processing' },
  { type: 'bulletList', items: [
    'Upload certificates, licenses, and compliance documents',
    'AI automatically extracts key information (expiry dates, holder names, cert numbers)',
    'Confidence scoring ensures accuracy',
    'Manual review queue for low-confidence extractions',
    'Supports PDF, images, and mobile photos'
  ]},
  
  { type: 'heading', level: 3, text: '1.2 Smart Dashboard' },
  { type: 'bulletList', items: [
    'Live compliance status at a glance',
    'Alert cards: Expired, Expiring Soon, Valid, Pending Review',
    'AI-powered insights and recommendations',
    'Quick actions to common tasks',
    'Upcoming renewals calendar preview'
  ]},
  
  { type: 'heading', level: 3, text: '1.3 Entity Management' },
  { type: 'paragraph', text: 'Track compliance across all your assets:' },
  { type: 'bulletList', items: [
    'People - Employees, contractors, visitors',
    'Vehicles - Fleet, personal cars, hired vehicles',
    'Assets - Equipment, tools, machinery',
    'Sites - Work locations, offices, warehouses',
    'Suppliers - External vendors and partners'
  ]},
  
  { type: 'heading', level: 3, text: '1.4 Proactive Alerts' },
  { type: 'bulletList', items: [
    'Email notifications before documents expire',
    'Customizable alert schedules (30/60/90 days)',
    'Daily digest of upcoming renewals',
    'Mobile push notifications (planned)',
    'SMS alerts for critical expirations (planned)'
  ]},
  
  { type: 'heading', level: 3, text: '1.5 Powerful Search & Filters' },
  { type: 'bulletList', items: [
    'Search across all documents by name, number, or type',
    'Filter by status (valid, expiring, expired)',
    'Filter by entity type or document type',
    'Saved filter presets',
    'Export filtered results to CSV'
  ]},
  
  { type: 'heading', level: 2, text: '2. User Interface' },
  { type: 'paragraph', text: 'Clean, modern design inspired by Apple, Linear, and Arc Browser.' },
  
  { type: 'heading', level: 3, text: '2.1 Design Principles' },
  { type: 'bulletList', items: [
    'Simplicity - Remove clutter, show what matters',
    'Speed - Fast page loads, instant interactions',
    'Safety - Yellow accent color reflects safety industry',
    'Clarity - Clear hierarchy, readable typography',
    'Responsiveness - Works on desktop, tablet, mobile'
  ]},
  
  { type: 'heading', level: 3, text: '2.2 Key Pages' },
  { type: 'bulletList', items: [
    'Dashboard - Compliance overview and quick actions',
    'People - Employee list with document status',
    'Vehicles - Fleet management with MOT/insurance tracking',
    'Documents - Document library with search and filters',
    'Calendar - Visual timeline of upcoming expirations',
    'Reports - Compliance reports and analytics',
    'Settings - Organisation settings and billing'
  ]},
  
  { type: 'heading', level: 2, text: '3. Key Components' },
  
  { type: 'heading', level: 3, text: '3.1 Upload Modal' },
  { type: 'bulletList', items: [
    'Drag-and-drop file upload',
    'Live AI extraction preview',
    'Entity linking (attach to person, vehicle, or asset)',
    'Document type selection',
    'Bulk upload support'
  ]},
  
  { type: 'heading', level: 3, text: '3.2 Document Cards' },
  { type: 'bulletList', items: [
    'Visual status indicators (green/amber/red)',
    'Days until expiry countdown',
    'Quick actions: View, Edit, Delete, Download',
    'Thumbnail preview',
    'Last updated timestamp'
  ]},
  
  { type: 'heading', level: 3, text: '3.3 Entity Profiles' },
  { type: 'bulletList', items: [
    'Complete entity details and metadata',
    'All associated documents in one view',
    'Compliance status summary',
    'Activity timeline',
    'Quick add document button'
  ]},
  
  { type: 'heading', level: 2, text: '4. User Flows' },
  
  { type: 'heading', level: 3, text: '4.1 Onboarding Flow' },
  { type: 'orderedList', items: [
    'Sign up with email and password',
    'Create organisation (company name, industry)',
    'Skip or add first team member',
    'Upload first document (guided walkthrough)',
    'See AI extraction in action',
    'Arrive at dashboard with sample data'
  ]},
  
  { type: 'heading', level: 3, text: '4.2 Document Upload Flow' },
  { type: 'orderedList', items: [
    'Click "Upload Document" from any page',
    'Drag file or select from device',
    'AI extracts data (2-5 seconds)',
    'Review extracted fields',
    'Link to person/vehicle/asset (optional)',
    'Confirm and save',
    'Document appears in relevant lists'
  ]},
  
  { type: 'heading', level: 3, text: '4.3 Daily Workflow' },
  { type: 'orderedList', items: [
    'Login and view dashboard',
    'Check "Expiring Soon" alerts',
    'Click alert to see affected documents',
    'Contact relevant people to renew',
    'Upload renewed certificates',
    'Dashboard updates in real-time'
  ]},
  
  { type: 'heading', level: 2, text: '5. System Capabilities' },
  
  { type: 'heading', level: 3, text: '5.1 Document Types Supported' },
  { type: 'bulletList', items: [
    'CSCS Cards (construction skills)',
    'IPAF Certificates (aerial platforms)',
    'First Aid Certificates',
    'MOT Certificates',
    'Insurance Certificates',
    'Driving Licenses',
    'Passports',
    'PAT Testing Certificates',
    'Gas Safe Certificates',
    'Custom document types (user-defined)'
  ]},
  
  { type: 'heading', level: 3, text: '5.2 Multi-Tenant Architecture' },
  { type: 'bulletList', items: [
    'Each organisation has isolated data',
    'Teams within organisations for departments',
    'Role-based permissions (Admin, Manager, Viewer)',
    'Invite team members via email',
    'Organisation settings and branding'
  ]},
  
  { type: 'heading', level: 2, text: '6. Document Processing' },
  
  { type: 'heading', level: 3, text: '6.1 Extraction Accuracy' },
  { type: 'bulletList', items: [
    'Field recognition: 95%+ accuracy for standard certificates',
    'Date formats: Supports UK and US date formats',
    'Handwriting: Limited support (typed text preferred)',
    'Multi-page: Processes first page only',
    'Languages: English only (for MVP)'
  ]},
  
  { type: 'heading', level: 3, text: '6.2 Processing States' },
  { type: 'orderedList', items: [
    'Uploaded - File received, queued for processing',
    'Processing - AI extraction in progress',
    'Review - Low confidence, needs manual review',
    'Approved - High confidence, auto-approved',
    'Active - Document is valid and in use',
    'Expiring - Within alert threshold (30 days default)',
    'Expired - Past expiry date',
    'Archived - Soft deleted, recoverable'
  ]},
  
  { type: 'heading', level: 2, text: '7. Organization System' },
  
  { type: 'heading', level: 3, text: '7.1 Teams' },
  { type: 'bulletList', items: [
    'Create departments or project teams',
    'Assign people to teams',
    'Team-level document views',
    'Team compliance dashboards'
  ]},
  
  { type: 'heading', level: 3, text: '7.2 Document Types' },
  { type: 'bulletList', items: [
    'Pre-configured common types (CSCS, MOT, etc.)',
    'Create custom document types',
    'Set default alert schedules per type',
    'Color coding and icons'
  ]},
  
  { type: 'heading', level: 2, text: '8. Monitoring & Reporting' },
  
  { type: 'heading', level: 3, text: '8.1 Dashboard Metrics' },
  { type: 'bulletList', items: [
    'Total documents tracked',
    'Documents expiring this month',
    'Documents expired',
    'Compliance rate percentage',
    'Recent uploads',
    'Top expiring categories'
  ]},
  
  { type: 'heading', level: 3, text: '8.2 Reports' },
  { type: 'bulletList', items: [
    'Compliance status report (by entity type)',
    'Expiry forecast (next 30/60/90 days)',
    'Document type breakdown',
    'Team compliance summary',
    'Export to PDF or CSV'
  ]},
  
  { type: 'heading', level: 2, text: '9. Mobile Experience' },
  { type: 'paragraph', text: 'Fully responsive design works on any device:' },
  { type: 'bulletList', items: [
    'Mobile-optimized layouts',
    'Touch-friendly buttons and controls',
    'Photo upload from camera',
    'Push notifications (planned)',
    'Offline mode (planned)'
  ]},
  
  { type: 'paragraph', text: '---' },
  { type: 'paragraph', text: 'Last updated: March 15, 2026' }
]);

// Document 3: USP Overview
const uspOverview = createContent([
  { type: 'heading', level: 1, text: 'HatSafe - Unique Selling Propositions' },
  { type: 'paragraph', text: 'Why HatSafe is the smartest choice for compliance management.' },
  
  { type: 'heading', level: 2, text: '1. Competitive Positioning' },
  { type: 'paragraph', text: 'HatSafe is positioned as the modern, AI-powered alternative to traditional compliance tracking methods.' },
  
  { type: 'heading', level: 3, text: '1.1 Market Position' },
  { type: 'bulletList', items: [
    'Premium quality at mid-market pricing',
    'Built for small-medium businesses (10-200 employees)',
    'Industry-specific focus on construction and trades',
    'Modern design and user experience',
    'AI-first approach to automation'
  ]},
  
  { type: 'heading', level: 2, text: '2. Unique Value Propositions' },
  
  { type: 'heading', level: 3, text: '2.1 AI Automation (Primary USP)' },
  { type: 'paragraph', text: 'PROBLEM: Manual data entry from certificates takes hours each week and is error-prone.' },
  { type: 'paragraph', text: 'SOLUTION: AI automatically extracts all key information in seconds with 95%+ accuracy.' },
  { type: 'bulletList', items: [
    'Upload a photo or PDF - AI does the rest',
    'No typing certificate numbers, dates, or names',
    'Confidence scoring ensures accuracy',
    'Manual review only when needed',
    'Saves 20+ hours per month on data entry'
  ]},
  
  { type: 'heading', level: 3, text: '2.2 Proactive, Not Reactive' },
  { type: 'paragraph', text: 'PROBLEM: Companies only discover expired certificates when it\'s too late (during audits or incidents).' },
  { type: 'paragraph', text: 'SOLUTION: HatSafe alerts you before documents expire, with customizable notice periods.' },
  { type: 'bulletList', items: [
    'Email alerts 30/60/90 days before expiry',
    'Daily digest of upcoming renewals',
    'Dashboard shows "expiring soon" at a glance',
    'Never miss a compliance deadline again'
  ]},
  
  { type: 'heading', level: 3, text: '2.3 All-in-One Platform' },
  { type: 'paragraph', text: 'PROBLEM: Compliance data scattered across spreadsheets, folders, email, and filing cabinets.' },
  { type: 'paragraph', text: 'SOLUTION: One central platform for people, vehicles, equipment, and supplier compliance.' },
  { type: 'bulletList', items: [
    'Track everything in one place',
    'No more hunting for documents',
    'Instant search across all records',
    'Accessible from anywhere, any device',
    'Team members see same live data'
  ]},
  
  { type: 'heading', level: 3, text: '2.4 Beautiful, Modern Design' },
  { type: 'paragraph', text: 'PROBLEM: Legacy compliance software looks like it was built in 2005 and is painful to use.' },
  { type: 'paragraph', text: 'SOLUTION: HatSafe feels like a modern consumer app - clean, fast, and enjoyable to use.' },
  { type: 'bulletList', items: [
    'Apple/Linear-inspired design aesthetic',
    'Fast page loads (< 1.5s)',
    'Intuitive navigation',
    'Mobile-first responsive design',
    'Safety yellow branding (industry-appropriate)'
  ]},
  
  { type: 'heading', level: 3, text: '2.5 Compliance-First Architecture' },
  { type: 'paragraph', text: 'PROBLEM: Generic document management systems don\'t understand compliance workflows.' },
  { type: 'paragraph', text: 'SOLUTION: HatSafe is purpose-built for compliance tracking with industry-specific features.' },
  { type: 'bulletList', items: [
    'Built-in document types (CSCS, IPAF, MOT, etc.)',
    'Expiry date tracking and alerting',
    'Compliance status dashboards',
    'Audit trail for every action',
    'Soft delete (documents recoverable)'
  ]},
  
  { type: 'heading', level: 2, text: '3. Differentiation Points' },
  
  { type: 'heading', level: 3, text: '3.1 vs. Spreadsheets' },
  { type: 'bulletList', items: [
    'AI extracts data (no manual typing)',
    'Proactive alerts (no need to check spreadsheet daily)',
    'Version control (no lost data)',
    'Collaboration (no email attachments)',
    'Mobile access (no laptop needed)',
    'Search and filter (instant vs. scrolling)',
    'Professional (vs. amateur appearance)'
  ]},
  
  { type: 'heading', level: 3, text: '3.2 vs. Generic Document Management (Dropbox, SharePoint)' },
  { type: 'bulletList', items: [
    'AI extraction (vs. manual filing)',
    'Expiry tracking (vs. just storage)',
    'Compliance dashboard (vs. folder view)',
    'Industry-specific (vs. generic)',
    'Proactive alerts (vs. passive storage)',
    'Lower cost (£49 vs. £100+)',
    'Purpose-built workflow (vs. adaptation required)'
  ]},
  
  { type: 'heading', level: 3, text: '3.3 vs. Legacy Compliance Software (Tracker, Comply, etc.)' },
  { type: 'bulletList', items: [
    'Modern UI (vs. outdated design)',
    'AI automation (vs. manual entry)',
    'Fast performance (vs. slow page loads)',
    'Simple setup (vs. complex onboarding)',
    'Transparent pricing (vs. custom quotes)',
    'Mobile-friendly (vs. desktop-only)',
    'Regular updates (vs. stagnant products)'
  ]},
  
  { type: 'heading', level: 3, text: '3.4 vs. Industry-Specific Competitors' },
  { type: 'bulletList', items: [
    'Better AI (OpenAI vs. custom/limited models)',
    'Cleaner design (consumer-grade UX)',
    'Faster performance (serverless architecture)',
    'Lower price (£49 vs. £70-150)',
    'Simpler onboarding (self-service vs. sales calls)',
    'Broader entity coverage (people + vehicles + assets)',
    'More integrations planned (open ecosystem)'
  ]},
  
  { type: 'heading', level: 2, text: '4. Why Choose HatSafe?' },
  
  { type: 'heading', level: 3, text: '4.1 For Construction Companies' },
  { type: 'bulletList', items: [
    'Stop chasing expired CSCS cards',
    'Track MOT/insurance for entire fleet',
    'Ensure all equipment is PAT tested',
    'Avoid site access denials',
    'Pass audits with confidence',
    'Reduce admin overhead by 20+ hours/month'
  ]},
  
  { type: 'heading', level: 3, text: '4.2 For Facilities Management' },
  { type: 'bulletList', items: [
    'Track engineer certifications (Gas Safe, etc.)',
    'Manage vehicle fleet compliance',
    'Monitor equipment safety certificates',
    'Coordinate multi-site operations',
    'Automated renewal reminders',
    'Compliance reports for clients'
  ]},
  
  { type: 'heading', level: 3, text: '4.3 For Events & Security' },
  { type: 'bulletList', items: [
    'SIA license tracking for security staff',
    'First aid certificate management',
    'Vehicle hire documentation',
    'Supplier compliance verification',
    'Real-time compliance status',
    'Mobile access for field teams'
  ]},
  
  { type: 'heading', level: 2, text: '5. Key Advantages' },
  
  { type: 'heading', level: 3, text: '5.1 Speed to Value' },
  { type: 'bulletList', items: [
    'Sign up and upload first document in < 5 minutes',
    'No implementation project required',
    'No training needed (intuitive design)',
    'See AI extraction work immediately',
    'Value from day one'
  ]},
  
  { type: 'heading', level: 3, text: '5.2 Cost Efficiency' },
  { type: 'bulletList', items: [
    '£49/month for 10 users (vs. £100+ for competitors)',
    'No setup fees',
    'No minimum contract',
    'Cancel anytime',
    'ROI in first month (time savings alone)',
    'Scales with your business'
  ]},
  
  { type: 'heading', level: 3, text: '5.3 Risk Reduction' },
  { type: 'bulletList', items: [
    'Never miss a compliance deadline',
    'Audit-ready at any time',
    'Complete audit trail',
    'Secure cloud storage (no lost documents)',
    'Data backup and recovery',
    'GDPR compliant'
  ]},
  
  { type: 'heading', level: 3, text: '5.4 Scalability' },
  { type: 'bulletList', items: [
    'Start with 10 users, grow to unlimited',
    'Handle thousands of documents',
    'Add teams as you expand',
    'Custom document types for new requirements',
    'API access for integrations (planned)',
    'No performance degradation at scale'
  ]},
  
  { type: 'heading', level: 3, text: '5.5 Future-Proof Technology' },
  { type: 'bulletList', items: [
    'Built on modern stack (Next.js, Supabase)',
    'Regular feature updates',
    'AI improvements over time',
    'Mobile app planned',
    'Integration marketplace planned',
    'Committed to continuous innovation'
  ]},
  
  { type: 'heading', level: 2, text: '6. Customer Success Stories (Planned)' },
  { type: 'paragraph', text: 'Target testimonials after beta:' },
  { type: 'bulletList', items: [
    '"Saved us 25 hours per month on certificate tracking" - Construction company',
    '"Passed our first audit with zero findings" - Facilities manager',
    '"The AI extraction is like magic" - Operations director',
    '"Paid for itself in week one" - Small scaffolding firm'
  ]},
  
  { type: 'heading', level: 2, text: '7. Competitive Moat' },
  { type: 'paragraph', text: 'How HatSafe stays ahead:' },
  { type: 'bulletList', items: [
    'AI expertise (OpenAI partnership gives us best-in-class extraction)',
    'Design excellence (hard to replicate premium UX)',
    'Customer feedback loop (rapid iteration)',
    'Brand positioning (modern vs. legacy)',
    'Pricing power (better product justifies premium)',
    'Data network effects (more documents = better AI)'
  ]},
  
  { type: 'paragraph', text: '---' },
  { type: 'paragraph', text: 'Last updated: March 15, 2026' }
]);

// Document 4: Marketing Overview
const marketingOverview = createContent([
  { type: 'heading', level: 1, text: 'HatSafe - Marketing Overview' },
  { type: 'paragraph', text: 'Go-to-market strategy for the modern compliance platform.' },
  
  { type: 'heading', level: 2, text: '1. Target Customer Segments' },
  
  { type: 'heading', level: 3, text: '1.1 Primary Segment: Small-Medium Construction' },
  { type: 'paragraph', text: 'Profile:' },
  { type: 'bulletList', items: [
    'Company size: 10-200 employees',
    'Industry: General construction, trades, subcontractors',
    'Geography: UK (initially)',
    'Pain: Spreadsheet hell, missed deadlines, audit failures',
    'Budget: £50-200/month for compliance tools',
    'Decision maker: Operations Manager, Site Manager, or Owner'
  ]},
  { type: 'paragraph', text: 'Examples:' },
  { type: 'bulletList', items: [
    'Regional construction firms',
    'Electrical contractors',
    'Plumbing companies',
    'Carpentry businesses',
    'Scaffolding specialists'
  ]},
  
  { type: 'heading', level: 3, text: '1.2 Secondary Segment: Facilities Management' },
  { type: 'paragraph', text: 'Profile:' },
  { type: 'bulletList', items: [
    'Company size: 20-500 employees',
    'Industry: Building maintenance, property management',
    'Pain: Multi-site coordination, engineer certifications',
    'Budget: £100-500/month',
    'Decision maker: Facilities Director, Contract Manager'
  ]},
  
  { type: 'heading', level: 3, text: '1.3 Tertiary Segments' },
  { type: 'bulletList', items: [
    'Events companies (security staff, equipment)',
    'Security firms (SIA licenses, training)',
    'Cleaning companies (staff certifications)',
    'Plant hire (equipment certifications)',
    'Transport/logistics (driver licenses, MOT)'
  ]},
  
  { type: 'heading', level: 2, text: '2. Market Positioning' },
  
  { type: 'heading', level: 3, text: '2.1 Brand Position' },
  { type: 'paragraph', text: 'The modern compliance platform for companies who value simplicity, speed, and safety.' },
  { type: 'bulletList', items: [
    'Category: AI-powered compliance management',
    'Tone: Professional but approachable',
    'Personality: Smart, reliable, no-nonsense',
    'Visual: Clean, modern, safety-focused (yellow + black)'
  ]},
  
  { type: 'heading', level: 3, text: '2.2 Value Proposition Statement' },
  { type: 'paragraph', text: '"HatSafe replaces spreadsheets and folders with an AI-powered compliance dashboard that tracks expiring certificates across your people, vehicles, and equipment - so you never miss a deadline again."' },
  
  { type: 'heading', level: 3, text: '2.3 Positioning vs. Competitors' },
  { type: 'bulletList', items: [
    'vs. Spreadsheets: "Upgrade from spreadsheets to AI"',
    'vs. Legacy Software: "Compliance software that doesn\'t feel like 2005"',
    'vs. Generic Tools: "Purpose-built for compliance, not adapted"',
    'vs. Competitors: "Better AI, better design, better value"'
  ]},
  
  { type: 'heading', level: 2, text: '3. Messaging Framework' },
  
  { type: 'heading', level: 3, text: '3.1 Primary Message' },
  { type: 'paragraph', text: '"Never miss a compliance deadline. HatSafe uses AI to track expiring certificates and alert you before they expire."' },
  
  { type: 'heading', level: 3, text: '3.2 Supporting Messages' },
  { type: 'bulletList', items: [
    'AI automation: "Upload a certificate, AI does the rest"',
    'Proactive alerts: "Get reminded before documents expire, not after"',
    'All-in-one: "People, vehicles, equipment - all in one place"',
    'Modern design: "Compliance software that doesn\'t suck"',
    'Affordable: "From £49/month - no setup fees, cancel anytime"'
  ]},
  
  { type: 'heading', level: 3, text: '3.3 Proof Points' },
  { type: 'bulletList', items: [
    'AI extraction: 95%+ accuracy',
    'Time savings: 20+ hours per month',
    'Cost: 50% cheaper than competitors',
    'Speed: Upload to dashboard in < 10 seconds',
    'Security: Enterprise-grade encryption'
  ]},
  
  { type: 'heading', level: 2, text: '4. Competitive Landscape' },
  
  { type: 'heading', level: 3, text: '4.1 Direct Competitors' },
  { type: 'paragraph', text: '1. **Tracker** (UK-based, legacy player)' },
  { type: 'bulletList', items: [
    'Strengths: Established brand, large customer base',
    'Weaknesses: Outdated UI, slow, expensive (£150+/month)',
    'Our advantage: Better UX, AI automation, lower price'
  ]},
  { type: 'paragraph', text: '2. **Comply** (Mid-market solution)' },
  { type: 'bulletList', items: [
    'Strengths: Feature-rich, integrations',
    'Weaknesses: Complex onboarding, high cost (£100+/month)',
    'Our advantage: Simplicity, faster setup, affordable'
  ]},
  
  { type: 'heading', level: 3, text: '4.2 Indirect Competitors' },
  { type: 'bulletList', items: [
    'Spreadsheets (Excel/Google Sheets) - Free but manual',
    'Dropbox/SharePoint - Storage only, no intelligence',
    'Notion/Airtable - Flexible but not compliance-specific'
  ]},
  
  { type: 'heading', level: 3, text: '4.3 Competitive Advantages' },
  { type: 'bulletList', items: [
    'AI extraction (unique to HatSafe)',
    'Modern design (best in category)',
    'Price (50% cheaper than legacy)',
    'Speed (fastest time-to-value)',
    'Simplicity (easiest to use)'
  ]},
  
  { type: 'heading', level: 2, text: '5. Market Opportunity' },
  
  { type: 'heading', level: 3, text: '5.1 Market Size (UK)' },
  { type: 'bulletList', items: [
    'Construction firms: ~280,000 (ONS data)',
    'Target segment (10-200 employees): ~15,000 companies',
    'Addressable market: £90M ARR (15k × £6k average)',
    'Realistic capture (1%): £900k ARR'
  ]},
  
  { type: 'heading', level: 3, text: '5.2 Growth Drivers' },
  { type: 'bulletList', items: [
    'Regulatory pressure (tightening compliance requirements)',
    'Digital transformation (move from paper/spreadsheets)',
    'AI adoption (companies want automation)',
    'Remote work (need cloud-based tools)',
    'Risk aversion (avoiding fines/incidents)'
  ]},
  
  { type: 'heading', level: 3, text: '5.3 Market Trends' },
  { type: 'bulletList', items: [
    'Shift to SaaS (away from on-premise)',
    'AI expectations (users expect smart features)',
    'Mobile-first (field workers need mobile access)',
    'Integration ecosystems (want to connect tools)',
    'Self-service (no sales calls, instant signup)'
  ]},
  
  { type: 'heading', level: 2, text: '6. Go-to-Market Strategy' },
  
  { type: 'heading', level: 3, text: '6.1 Phase 1: Beta Launch (Weeks 1-8)' },
  { type: 'paragraph', text: 'Goal: Get 20 beta customers, validate product-market fit' },
  { type: 'bulletList', items: [
    'Channels: Direct outreach, email list (1,500 contacts)',
    'Offer: Free 3-month beta access',
    'Focus: Product feedback, testimonials',
    'Success metric: 20 active users, 80%+ retention'
  ]},
  
  { type: 'heading', level: 3, text: '6.2 Phase 2: Public Launch (Months 2-3)' },
  { type: 'paragraph', text: 'Goal: Acquire first 50 paying customers' },
  { type: 'bulletList', items: [
    'Channels: SEO, Google Ads, LinkedIn, industry forums',
    'Offer: 14-day free trial, £49/month starter plan',
    'Content: Case studies, comparison pages, how-to guides',
    'Success metric: 50 paying customers, £2,500 MRR'
  ]},
  
  { type: 'heading', level: 3, text: '6.3 Phase 3: Scale (Months 4-12)' },
  { type: 'paragraph', text: 'Goal: Reach £10k MRR, establish category leadership' },
  { type: 'bulletList', items: [
    'Channels: Content marketing, partnerships, referrals',
    'Expansion: New industries, EU markets',
    'Product: Mobile app, integrations, advanced features',
    'Success metric: 200 customers, £10k MRR, 5% monthly growth'
  ]},
  
  { type: 'heading', level: 2, text: '7. Marketing Channels' },
  
  { type: 'heading', level: 3, text: '7.1 Organic (Primary Focus)' },
  { type: 'bulletList', items: [
    'SEO: Target "compliance management software", "certificate tracking", etc.',
    'Content: Blog posts, guides, templates, checklists',
    'Social: LinkedIn (B2B focus), Twitter (tech community)',
    'Community: Industry forums, Reddit, LinkedIn groups'
  ]},
  
  { type: 'heading', level: 3, text: '7.2 Paid (Validation & Scale)' },
  { type: 'bulletList', items: [
    'Google Ads: Search ads for high-intent keywords',
    'LinkedIn Ads: Targeted by job title, industry',
    'Retargeting: Website visitors, trial signups',
    'Budget: £500/month initially, scale based on CAC'
  ]},
  
  { type: 'heading', level: 3, text: '7.3 Partnerships' },
  { type: 'bulletList', items: [
    'Industry associations (e.g., Federation of Master Builders)',
    'Accountants/bookkeepers (refer clients)',
    'HR software providers (integration partners)',
    'Training providers (certificate issuers)'
  ]},
  
  { type: 'heading', level: 2, text: '8. Pricing Positioning' },
  
  { type: 'heading', level: 3, text: '8.1 Pricing Strategy' },
  { type: 'paragraph', text: 'Value-based pricing, undercut legacy competitors by 50%' },
  { type: 'bulletList', items: [
    'Starter: £49/month (10 users)',
    'Professional: £99/month (50 users)',
    'Enterprise: £199/month (unlimited users)',
    'Annual discount: 2 months free (£490 vs. £588)'
  ]},
  
  { type: 'heading', level: 3, text: '8.2 Pricing Psychology' },
  { type: 'bulletList', items: [
    '£49 feels affordable (vs. £50)',
    'Monthly flexibility (vs. annual lock-in)',
    'No setup fees (vs. competitors)',
    'Transparent tiers (vs. "contact sales")',
    'Free trial (vs. credit card required)'
  ]},
  
  { type: 'heading', level: 3, text: '8.3 ROI Messaging' },
  { type: 'bulletList', items: [
    'Time savings: 20 hours/month × £20/hour = £400 value',
    'Risk reduction: Avoid one £1,000 fine = 20 months payback',
    'Efficiency: Handle 2x documents with same team',
    'Peace of mind: Priceless'
  ]},
  
  { type: 'heading', level: 2, text: '9. Launch Timeline' },
  
  { type: 'heading', level: 3, text: '9.1 Pre-Launch (Weeks 1-4)' },
  { type: 'bulletList', items: [
    'Finalize MVP features',
    'Create marketing website',
    'Prepare launch content (case studies, guides)',
    'Build email list (1,500+ contacts)',
    'Set up analytics and tracking'
  ]},
  
  { type: 'heading', level: 3, text: '9.2 Beta Launch (Weeks 5-12)' },
  { type: 'bulletList', items: [
    'Invite 50 beta testers',
    'Collect feedback weekly',
    'Iterate on features',
    'Capture testimonials',
    'Refine messaging'
  ]},
  
  { type: 'heading', level: 3, text: '9.3 Public Launch (Week 13+)' },
  { type: 'bulletList', items: [
    'Launch announcement (email, social, press)',
    'Start paid ads',
    'Publish content',
    'Engage communities',
    'Monitor metrics daily'
  ]},
  
  { type: 'heading', level: 2, text: '10. Success Metrics' },
  
  { type: 'heading', level: 3, text: '10.1 Leading Indicators' },
  { type: 'bulletList', items: [
    'Website traffic',
    'Trial signups',
    'Activation rate (first document uploaded)',
    'Demo requests',
    'Email open/click rates'
  ]},
  
  { type: 'heading', level: 3, text: '10.2 Lagging Indicators' },
  { type: 'bulletList', items: [
    'Paying customers',
    'MRR (Monthly Recurring Revenue)',
    'Churn rate',
    'CAC (Customer Acquisition Cost)',
    'LTV (Lifetime Value)'
  ]},
  
  { type: 'heading', level: 3, text: '10.3 Targets (Month 3)' },
  { type: 'bulletList', items: [
    'Customers: 50',
    'MRR: £2,500',
    'Churn: < 5%',
    'CAC: < £100',
    'LTV: > £600'
  ]},
  
  { type: 'paragraph', text: '---' },
  { type: 'paragraph', text: 'Last updated: March 15, 2026' }
]);

// Document 5: Launch Plan
const launchPlan = createContent([
  { type: 'heading', level: 1, text: 'HatSafe - Launch Plan' },
  { type: 'paragraph', text: 'Phased go-to-market execution plan for successful product launch.' },
  
  { type: 'heading', level: 2, text: '1. Launch Overview' },
  { type: 'paragraph', text: 'Strategy: Staged launch with beta phase followed by public release.' },
  { type: 'bulletList', items: [
    'Beta launch: April 2026 (private, invite-only)',
    'Public launch: May 2026 (open signups)',
    'Target: 50 customers by end of May',
    'Budget: £2,000 (ads + tools)',
    'Team: Ben (founder) + Doug (AI assistant)'
  ]},
  
  { type: 'heading', level: 2, text: '2. Pre-Launch Activities (Weeks 1-4)' },
  
  { type: 'heading', level: 3, text: '2.1 Product Finalization' },
  { type: 'paragraph', text: 'Week 1-2:' },
  { type: 'bulletList', items: [
    '✅ Complete core features (dashboard, upload, AI extraction)',
    '⏳ Build create/edit forms for entities',
    '⏳ Connect auth flow (signup, login)',
    '⏳ Test AI extraction with real certificates',
    '⏳ Fix any critical bugs'
  ]},
  { type: 'paragraph', text: 'Week 3:' },
  { type: 'bulletList', items: [
    '⏳ Implement email notifications',
    '⏳ Add Stripe billing integration',
    '⏳ Create onboarding flow',
    '⏳ Mobile responsiveness polish',
    '⏳ Performance optimization'
  ]},
  
  { type: 'heading', level: 3, text: '2.2 Marketing Preparation' },
  { type: 'paragraph', text: 'Week 2-3:' },
  { type: 'bulletList', items: [
    'Design marketing website (landing page)',
    'Write copy (headlines, benefits, FAQs)',
    'Create demo video (2-minute product tour)',
    'Prepare email templates (welcome, onboarding, alerts)',
    'Set up analytics (Google Analytics, Plausible)'
  ]},
  
  { type: 'heading', level: 3, text: '2.3 Content Creation' },
  { type: 'paragraph', text: 'Week 3-4:' },
  { type: 'bulletList', items: [
    'Blog post: "5 Ways AI is Transforming Compliance Management"',
    'Guide: "The Ultimate Compliance Tracking Checklist"',
    'Comparison: "HatSafe vs. Spreadsheets"',
    'Case study template (to fill after beta)',
    'Social media graphics (quotes, features)'
  ]},
  
  { type: 'heading', level: 3, text: '2.4 Beta Tester Outreach' },
  { type: 'paragraph', text: 'Week 4:' },
  { type: 'bulletList', items: [
    'Create beta application form',
    'Email list (1,500 contacts) with beta invite',
    'LinkedIn posts announcing beta',
    'Personal outreach to warm contacts',
    'Target: 50 applications, accept 20'
  ]},
  
  { type: 'heading', level: 2, text: '3. Beta Launch (Weeks 5-12)' },
  
  { type: 'heading', level: 3, text: '3.1 Week 5: Beta Kickoff' },
  { type: 'bulletList', items: [
    'Send welcome emails to 20 beta testers',
    'Host onboarding call (walkthrough + Q&A)',
    'Provide beta Slack channel for feedback',
    'Set up weekly check-in cadence',
    'Monitor usage daily'
  ]},
  
  { type: 'heading', level: 3, text: '3.2 Weeks 6-8: Feedback & Iteration' },
  { type: 'bulletList', items: [
    'Weekly user interviews (4-5 per week)',
    'Track feature requests and bugs',
    'Ship fixes and improvements every 3 days',
    'Measure activation rate (first upload)',
    'Identify power users for testimonials'
  ]},
  
  { type: 'heading', level: 3, text: '3.3 Weeks 9-10: Polish & Testimonials' },
  { type: 'bulletList', items: [
    'Request testimonials from satisfied users',
    'Create case studies (2-3 detailed)',
    'Record demo videos with real user data',
    'Final bug fixes',
    'Prepare public launch materials'
  ]},
  
  { type: 'heading', level: 3, text: '3.4 Weeks 11-12: Pre-Public Launch' },
  { type: 'bulletList', items: [
    'Update marketing site with testimonials',
    'Set up Stripe pricing pages',
    'Prepare launch email sequence',
    'Schedule social media posts',
    'Set up Google Ads campaigns (paused)'
  ]},
  
  { type: 'heading', level: 2, text: '4. Public Launch Timeline (Week 13+)' },
  
  { type: 'heading', level: 3, text: '4.1 Launch Day (Monday, Week 13)' },
  { type: 'bulletList', items: [
    '8am: Send launch email to full list (1,500+)',
    '9am: Post on LinkedIn, Twitter, Facebook',
    '10am: Activate Google Ads campaigns',
    '11am: Submit to Product Hunt',
    '12pm: Post in industry forums (tactfully)',
    '2pm: Send thank you to beta testers',
    'All day: Monitor signups, respond to questions'
  ]},
  
  { type: 'heading', level: 3, text: '4.2 Launch Week (Days 2-7)' },
  { type: 'bulletList', items: [
    'Daily: Publish blog post or social content',
    'Daily: Respond to all inquiries within 2 hours',
    'Day 3: Email non-openers reminder',
    'Day 5: Weekly metrics review',
    'Day 7: Thank you email to new customers'
  ]},
  
  { type: 'heading', level: 3, text: '4.3 Weeks 14-16: Early Traction' },
  { type: 'bulletList', items: [
    'Engage with every new signup personally',
    'Host weekly onboarding webinars',
    'Publish case studies',
    'A/B test ad copy and landing pages',
    'Track churn and gather cancellation feedback'
  ]},
  
  { type: 'heading', level: 2, text: '5. Go-to-Market Activities' },
  
  { type: 'heading', level: 3, text: '5.1 Email Marketing' },
  { type: 'bulletList', items: [
    'Launch sequence: 5 emails over 2 weeks',
    'Drip campaign for trial users',
    'Re-engagement for inactive trials',
    'Monthly newsletter (product updates, tips)',
    'Tools: SendGrid or Resend'
  ]},
  
  { type: 'heading', level: 3, text: '5.2 Content Marketing' },
  { type: 'bulletList', items: [
    '2 blog posts per week (SEO-focused)',
    'Topics: compliance tips, industry news, how-tos',
    'LinkedIn articles (repurpose blog content)',
    'YouTube: Product tutorials and demos',
    'Guest posts on industry blogs'
  ]},
  
  { type: 'heading', level: 3, text: '5.3 Paid Advertising' },
  { type: 'bulletList', items: [
    'Google Ads: Search campaigns (£300/month)',
    'Keywords: "compliance software", "certificate tracking"',
    'LinkedIn Ads: Targeted by job title (£200/month)',
    'Retargeting: Website visitors (£100/month)',
    'Budget allocation based on CAC'
  ]},
  
  { type: 'heading', level: 3, text: '5.4 Social Media' },
  { type: 'bulletList', items: [
    'LinkedIn: 5 posts/week (B2B focus)',
    'Twitter: Daily updates, engage with community',
    'Facebook: Industry groups, targeted posts',
    'Instagram: Behind-the-scenes, company culture',
    'Focus: Organic reach, community building'
  ]},
  
  { type: 'heading', level: 3, text: '5.5 Community & PR' },
  { type: 'bulletList', items: [
    'Construction forums: Answer questions, provide value',
    'Reddit: r/construction, r/saas participation',
    'Product Hunt: Launch day submission',
    'Industry publications: Press release',
    'Podcasts: Guest appearances (after traction)'
  ]},
  
  { type: 'heading', level: 2, text: '6. Marketing Strategy' },
  
  { type: 'heading', level: 3, text: '6.1 Positioning' },
  { type: 'paragraph', text: '"The modern compliance platform that replaces spreadsheets with AI."' },
  { type: 'bulletList', items: [
    'Target pain: Manual tracking, missed deadlines',
    'Key benefit: AI automation + proactive alerts',
    'Differentiation: Modern design, affordable pricing',
    'Proof: Testimonials, demo video, free trial'
  ]},
  
  { type: 'heading', level: 3, text: '6.2 Messaging' },
  { type: 'bulletList', items: [
    'Primary: "Never miss a compliance deadline"',
    'Secondary: "Upload a certificate, AI does the rest"',
    'Tertiary: "Track people, vehicles, equipment - all in one place"',
    'CTA: "Start free trial" or "See how it works"'
  ]},
  
  { type: 'heading', level: 3, text: '6.3 Target Channels (Priority Order)' },
  { type: 'orderedList', items: [
    'Email (highest ROI, warm audience)',
    'Google Ads (high intent)',
    'LinkedIn (B2B targeting)',
    'SEO (long-term investment)',
    'Communities (organic reach)'
  ]},
  
  { type: 'heading', level: 2, text: '7. Partnership Approach' },
  
  { type: 'heading', level: 3, text: '7.1 Affiliate Program (Month 3+)' },
  { type: 'bulletList', items: [
    'Offer: 20% recurring commission',
    'Target partners: Accountants, consultants, trainers',
    'Tools: Affiliate dashboard, tracking links',
    'Support: Email templates, marketing materials'
  ]},
  
  { type: 'heading', level: 3, text: '7.2 Integration Partners (Month 6+)' },
  { type: 'bulletList', items: [
    'HR software (BambooHR, CharlieHR)',
    'Accounting software (Xero, QuickBooks)',
    'Project management (Procore, Buildertrend)',
    'Training providers (CITB, IPAF)'
  ]},
  
  { type: 'heading', level: 3, text: '7.3 Industry Associations' },
  { type: 'bulletList', items: [
    'Join: Federation of Master Builders',
    'Sponsor: Industry events, local meetups',
    'Speak: Webinars, conferences',
    'Publish: Guest articles in newsletters'
  ]},
  
  { type: 'heading', level: 2, text: '8. Customer Acquisition' },
  
  { type: 'heading', level: 3, text: '8.1 Trial-to-Paid Conversion' },
  { type: 'bulletList', items: [
    'Free trial: 14 days (no credit card)',
    'Onboarding email sequence (days 1, 3, 7, 10, 14)',
    'In-app tips and guidance',
    'Personal outreach at day 5 (offer help)',
    'Expiry reminder at day 12 (last chance)'
  ]},
  
  { type: 'heading', level: 3, text: '8.2 Activation Triggers' },
  { type: 'bulletList', items: [
    'Upload first document',
    'See AI extraction work',
    'Link document to entity',
    'Invite team member',
    'Set up first alert'
  ]},
  { type: 'paragraph', text: 'Goal: Get users to "aha moment" within first session.' },
  
  { type: 'heading', level: 3, text: '8.3 Retention Strategy' },
  { type: 'bulletList', items: [
    'Weekly product updates (show progress)',
    'Monthly tips newsletter (add value)',
    'Proactive support (reach out if inactive)',
    'Feature requests (let users shape product)',
    'Customer success calls (quarterly check-ins)'
  ]},
  
  { type: 'heading', level: 2, text: '9. Success Metrics' },
  
  { type: 'heading', level: 3, text: '9.1 Launch Week Targets' },
  { type: 'bulletList', items: [
    'Email opens: 30%+ (450+ opens)',
    'Click-through: 10%+ (150+ clicks)',
    'Trial signups: 50',
    'Activation rate: 70% (35 upload first doc)',
    'Paying customers: 10'
  ]},
  
  { type: 'heading', level: 3, text: '9.2 Month 1 Targets' },
  { type: 'bulletList', items: [
    'Total signups: 150',
    'Active trials: 40',
    'Paying customers: 30',
    'MRR: £1,500',
    'Churn: < 10%'
  ]},
  
  { type: 'heading', level: 3, text: '9.3 Month 3 Targets' },
  { type: 'bulletList', items: [
    'Paying customers: 50',
    'MRR: £2,500',
    'CAC: < £100',
    'LTV: > £600',
    'Churn: < 5%',
    'NPS: > 40'
  ]},
  
  { type: 'heading', level: 2, text: '10. Risk Mitigation' },
  
  { type: 'heading', level: 3, text: '10.1 Potential Risks' },
  { type: 'bulletList', items: [
    'Low trial signups → Improve landing page, adjust messaging',
    'Poor activation → Simplify onboarding, add guided tour',
    'High churn → Customer interviews, fix pain points',
    'High CAC → Focus on organic channels, improve conversion',
    'Technical issues → Load testing, error monitoring'
  ]},
  
  { type: 'heading', level: 3, text: '10.2 Contingency Plans' },
  { type: 'bulletList', items: [
    'If email list underperforms → Double down on Google Ads',
    'If Google Ads too expensive → Focus on SEO + content',
    'If trial-to-paid low → Offer onboarding call',
    'If churn high → Add more features, improve support',
    'If AI extraction poor → Manual review for all (short-term)'
  ]},
  
  { type: 'heading', level: 2, text: '11. Post-Launch Priorities' },
  
  { type: 'heading', level: 3, text: '11.1 Immediate (Weeks 13-16)' },
  { type: 'bulletList', items: [
    'Support every customer personally',
    'Fix bugs within 24 hours',
    'Ship small improvements weekly',
    'Gather testimonials actively',
    'Monitor metrics daily'
  ]},
  
  { type: 'heading', level: 3, text: '11.2 Short-term (Months 2-3)' },
  { type: 'bulletList', items: [
    'Improve trial-to-paid conversion',
    'Reduce churn (customer success focus)',
    'Expand content marketing',
    'Test new acquisition channels',
    'Build referral program'
  ]},
  
  { type: 'heading', level: 3, text: '11.3 Medium-term (Months 4-6)' },
  { type: 'bulletList', items: [
    'Launch mobile app',
    'Add integrations (Xero, etc.)',
    'Expand to EU markets',
    'Build partner program',
    'Raise seed funding (optional)'
  ]},
  
  { type: 'heading', level: 2, text: '12. Launch Checklist' },
  
  { type: 'heading', level: 3, text: '12.1 Week Before Launch' },
  { type: 'bulletList', items: [
    '☐ Product tested end-to-end',
    '☐ Marketing site live',
    '☐ Email campaigns scheduled',
    '☐ Social posts drafted',
    '☐ Google Ads campaigns ready',
    '☐ Analytics tracking verified',
    '☐ Support email set up',
    '☐ Billing tested (Stripe)',
    '☐ Demo video finalized',
    '☐ Testimonials collected'
  ]},
  
  { type: 'heading', level: 3, text: '12.2 Launch Day' },
  { type: 'bulletList', items: [
    '☐ Send launch email',
    '☐ Post on all social channels',
    '☐ Activate Google Ads',
    '☐ Submit to Product Hunt',
    '☐ Post in relevant communities',
    '☐ Monitor signup flow',
    '☐ Respond to all inquiries',
    '☐ Celebrate! 🎉'
  ]},
  
  { type: 'paragraph', text: '---' },
  { type: 'paragraph', text: 'Last updated: March 15, 2026' },
  { type: 'paragraph', text: 'Target launch: April 2026' }
]);

async function createDocuments() {
  console.log('Starting document creation for HatSafe...\n');
  
  const documents = [
    { title: 'HatSafe - Technical Specification', type: 'technical-spec', content: technicalSpec },
    { title: 'HatSafe - Product Overview', type: 'product-overview', content: productOverview },
    { title: 'HatSafe - USP Overview', type: 'usp-overview', content: uspOverview },
    { title: 'HatSafe - Marketing Overview', type: 'marketing-overview', content: marketingOverview },
    { title: 'HatSafe - Launch Plan', type: 'launch-plan', content: launchPlan }
  ];
  
  const createdDocs = [];
  
  for (const doc of documents) {
    try {
      console.log(`Creating: ${doc.title}...`);
      
      const document = await prisma.document.create({
        data: {
          workspaceId: WORKSPACE_ID,
          companyId: COMPANY_ID,
          title: doc.title,
          documentType: doc.type,
          contentRich: doc.content,
          version: 1,
          createdBy: DEFAULT_USER_ID
        }
      });
      
      // Create initial version
      await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          version: 1,
          contentRich: doc.content,
          createdBy: DEFAULT_USER_ID
        }
      });
      
      createdDocs.push({
        id: document.id,
        title: doc.title,
        type: doc.type,
        url: `https://zebi.onebeyond.studio/companies/${COMPANY_ID}/documents/${document.id}`
      });
      
      console.log(`✅ Created: ${doc.title} (ID: ${document.id})\n`);
      
    } catch (error) {
      console.error(`❌ Error creating ${doc.title}:`, error);
    }
  }
  
  console.log('\n=== SUMMARY ===\n');
  console.log(`Successfully created ${createdDocs.length} documents for HatSafe\n`);
  
  console.log('Document IDs:');
  createdDocs.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.title}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Type: ${doc.type}`);
    console.log(`   URL: ${doc.url}\n`);
  });
  
  console.log('How to access:');
  console.log('1. Go to https://zebi.onebeyond.studio');
  console.log(`2. Navigate to Companies → HatSafe`);
  console.log('3. Click on Documents tab');
  console.log('4. All 5 documents should be visible\n');
  
  await prisma.$disconnect();
  return createdDocs;
}

createDocuments()
  .then((docs) => {
    console.log('✅ All documents created successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
