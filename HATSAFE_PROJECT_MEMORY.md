# HatSafe MVP - Complete Project Memory

**Last Updated:** 2026-03-08 21:45 GMT  
**Status:** In Development (40% Complete)  
**Live URL:** https://www.hatsafe.com

---

## Project Overview

**What it is:** AI-powered compliance document management platform for construction/trades to track expiring certificates, licenses, and inspections across people, vehicles, equipment, sites and suppliers.

**Core Value Proposition:**
- Replace spreadsheets/folders with live compliance dashboard
- AI automatically extracts data from uploaded certificates
- Proactive renewal alerts before expiry
- Never miss compliance deadlines

**Revenue Model:** Stripe monthly subscriptions
- £49/month - Starter (10 users)
- £99/month - Professional (50 users)
- £199/month - Enterprise (unlimited)

**Target Market:**
- Primary: Small-medium construction/facilities companies (10-200 employees)
- Secondary: Events, security, cleaning, scaffolding, plant hire
- Geography: UK first, expand to EU/US later

---

## Technical Stack

### Frontend
- **Next.js 14** (App Router, React Server Components)
- **TypeScript** (strict mode)
- **Tailwind CSS** (utility-first styling)
- **HeroUI** (component library)
- **Design:** Clean minimal aesthetic (Apple/Linear/Arc inspired)

### Backend
- **Supabase** (Postgres + Auth + Storage + RLS)
- **PostgreSQL** (15 tables, full schema)
- **Row Level Security** (multi-tenant isolation)
- **Supabase Storage** (encrypted document storage)

### AI Processing
- **OpenAI GPT-4o-mini Vision** (document data extraction)
- **Cost:** ~£0.005 per document (negligible)
- **Async processing** (upload returns immediately)

### Infrastructure
- **Vercel** (hosting, CDN, serverless functions)
- **Stripe** (subscription billing - not yet integrated)
- **SendGrid/Resend** (email notifications - not yet integrated)

### Design System
- **Brand Colors:** Safety Yellow (#FFC107) + Deep Black (#1A1A1A)
- **Typography:** Inter font
- **Spacing:** 8px grid system
- **Radius:** 6px/10px/14px (small/medium/large)
- **Status Colors:** Green (valid), Amber (expiring), Red (expired)

---

## Database Schema (15 Tables)

### Core Tables
1. **organisations** - Multi-tenant root
2. **users** - User accounts (linked to org)
3. **teams** - Organizational teams
4. **people** - Team members/employees
5. **vehicles** - Fleet management
6. **assets** - Equipment/tools
7. **sites** - Work locations
8. **suppliers** - External vendors
9. **documents** - Document metadata
10. **document_versions** - File storage history
11. **document_extractions** - AI processing audit
12. **document_types** - Custom document types
13. **notifications** - Alert system
14. **notification_schedules** - Recurring alerts
15. **audit_log** - Security audit trail

### Key Features
- **Polymorphic documents:** One table links to people/vehicles/assets
- **Soft delete:** `archived_at` everywhere (compliance requirement)
- **Version history:** Every file upload preserved
- **RLS policies:** Database-level access control (org isolation)

---

## What's Built (Week 1 Complete)

### ✅ Pages (12 Total)

| Page | Route | Features | Status |
|------|-------|----------|--------|
| Homepage | `/` | Landing page, branding | ✅ |
| Login | `/login` | Email/password auth | ✅ |
| Signup | `/signup` | Org creation flow | ✅ |
| Dashboard | `/dashboard` | Stats cards, AI features, calendar preview | ✅ |
| People List | `/people` | Table, search, filters, stats | ✅ |
| Person Profile | `/people/[id]` | Details, documents, timeline | ✅ |
| Vehicles | `/vehicles` | Fleet management table | ✅ |
| Assets | `/assets` | Equipment tracking table | ✅ |
| Documents | `/documents` | Document library, filters | ✅ |
| Calendar | `/calendar` | Expiry calendar view | ✅ |
| Reports | `/reports` | Compliance reporting | ✅ |
| Settings | `/settings` | Org settings, billing | ✅ |

### ✅ API Routes (Started Today 2026-03-08)

| Endpoint | Methods | Purpose | Status |
|----------|---------|---------|--------|
| `/api/dashboard/stats` | GET | Dashboard metrics | ✅ |
| `/api/people` | GET, POST | People list + create | ✅ |
| `/api/people/[id]` | GET, PATCH, DELETE | Individual person | ✅ |
| `/api/vehicles` | GET, POST | Vehicles list + create | ✅ |
| `/api/assets` | GET, POST | Assets list + create | ✅ |
| `/api/documents` | GET | Documents list | ✅ |
| `/api/documents/upload` | POST | File upload + storage | ✅ (Fixed) |
| `/api/documents/extract` | POST | AI extraction | ✅ (Fixed) |
| `/api/auth/create-organisation` | POST | Signup flow | ✅ |

### ✅ AI Features

**Upload Modal:**
- Drag-and-drop file upload
- AI extraction preview
- Confidence scoring
- Entity linking (person/vehicle/asset)

**AI Extraction:**
- Uses OpenAI GPT-4o-mini Vision
- Extracts: document type, holder name, certificate number, issue date, expiry date, issuer
- Returns confidence score (0.0-1.0)
- Auto-approval threshold: >0.7 confidence

**Dashboard Features:**
- AI-powered compliance assistant banner
- Expiry alerts (expired, expiring soon, valid, pending review)
- Smart suggestions (optimization, risk, efficiency)

### ✅ Infrastructure

- **Domain:** hatsafe.com (live)
- **Hosting:** Vercel (production deployment)
- **Database:** Supabase (migrations run, RLS enabled)
- **Storage:** Supabase Storage bucket (`documents`)
- **Environment Variables:** All configured (Supabase + OpenAI keys)
- **Git:** 11+ commits, clean history

---

## Recent Fixes (2026-03-08 Evening)

### Issue #1: Upload API Failed
**Problem:** API was querying `profiles` table that doesn't exist  
**Fix:** Changed to query `users` table  
**Time:** 21:30-21:40 GMT  
**Result:** Upload now works

### Issue #2: Schema Mismatch
**Problem:** Upload was trying to insert fields (`file_url`, `category`, etc.) that don't exist in `documents` table  
**Fix:** Rewrote to match actual schema using `documents` + `document_versions` tables  
**Time:** 21:40-21:43 GMT  
**Result:** Properly structured database inserts

### Issue #3: AI Extraction Errors
**Problem:** Generic error messages, hard to debug  
**Fix:** Added comprehensive error logging, API key validation, better error responses  
**Time:** 21:38-21:41 GMT  
**Result:** Detailed error messages for debugging

### Issue #4: Next.js Async Params
**Problem:** TypeScript errors - `params` now passed as Promise in Next.js  
**Fix:** Updated all dynamic route handlers to `await params`  
**Time:** 21:28 GMT  
**Result:** Build passing

---

## What Still Needs Building

### 1. Real Data Integration (In Progress - 30% Done)
**Status:** Started 2026-03-08 21:20 GMT  
**What's Done:**
- Dashboard fetches real stats from API
- People/Vehicles/Assets APIs created
- Pagination/search/filter ready

**What's Left:**
- Update list pages to fetch from APIs (not placeholder data)
- Connect search/filter inputs to API calls
- Add loading states
- Error handling

**Time Estimate:** 2-3 more days

### 2. Create/Edit Forms (Not Started - 0% Done)
**What's Needed:**
- Add Person modal
- Add Vehicle modal
- Add Asset modal
- Edit modals for all entities
- Form validation
- Error handling

**Time Estimate:** 2-3 days

### 3. Complete AI Extraction Workflow (50% Done)
**What's Done:**
- Upload modal UI
- File upload to Supabase Storage
- OpenAI Vision API integration
- Basic extraction logic

**What's Left:**
- Review queue (for low-confidence extractions)
- Entity matching algorithm (link to existing people/vehicles)
- Handle extraction failures gracefully
- Store extraction audit trail

**Time Estimate:** 1-2 days

### 4. Auth Flow (Not Started - 0% Done)
**What's Needed:**
- Connect signup form to Supabase Auth
- Create organisation on signup
- Insert default document types
- Redirect to dashboard after login
- Session persistence
- Password reset

**Time Estimate:** 1 day

### 5. Email Notifications (Not Started - 0% Done)
**What's Needed:**
- Daily cron job (Vercel Cron)
- Query expiring documents
- Send emails via SendGrid/Resend
- Email templates (HTML)
- User notification preferences

**Time Estimate:** 1 week

### 6. Stripe Billing (Not Started - 0% Done)
**What's Needed:**
- Stripe customer creation
- Subscription checkout flow
- Webhook handling
- Trial period logic (14 days)
- Upgrade/downgrade flows
- Billing portal link

**Time Estimate:** 3-5 days

### 7. Sites & Suppliers Pages (Not Started - 0% Done)
**What's Needed:**
- Sites list + detail pages
- Suppliers list + detail pages
- CRUD operations
- Document linking

**Time Estimate:** 2-3 days

---

## Test Documents Created (2026-03-08 21:32 GMT)

Created 4 realistic test certificates for AI extraction testing:

1. **CSCS Card - John Smith**
   - Valid until: 15 January 2029
   - Certificate: CSCS-2024-789456
   - Occupation: Carpenter - Level 2

2. **IPAF Certificate - Sarah Johnson**
   - Valid until: 10 March 2028
   - Certificate: IPAF/UK/2023/456789
   - Categories: 3a (Scissor Lift), 3b (Boom)

3. **First Aid Certificate - Mike Davies** (EXPIRED)
   - Expired: 5 February 2025
   - Certificate: FAW-2022-123456
   - Level: First Aid at Work Level 3

4. **MOT Certificate - Vehicle AB12 CDE**
   - Valid until: 11 March 2027
   - Certificate: MOT123456789
   - Vehicle: Ford Transit Custom

**Location:** `/Users/botbot/.openclaw/workspace/hatsafe/test-documents/`  
**Format:** HTML files (convert to PDF via browser print)

---

## Timeline & Milestones

### Week 1 (Complete) ✅
- Database schema
- All pages UI
- Navigation
- Design system
- Production deployment

### Week 2 (Current - In Progress)
- Real data integration ← **We are here**
- Create/edit forms
- Complete AI extraction
- Auth flow

### Week 3 (Planned)
- Email notifications
- Stripe billing
- Sites/Suppliers pages

### Week 4 (Planned)
- Testing
- Bug fixes
- Beta customer onboarding

### Weeks 5-6 (Planned)
- Beta feedback iteration
- Performance optimization
- Documentation

### Weeks 7-8 (Planned)
- Public launch preparation
- Marketing materials
- Customer support setup

**Target Launch Date:** Mid-April 2026

---

## Cost Breakdown (Monthly Operations)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro | £20 |
| Supabase | Pro | £25 |
| SendGrid | Essentials | £15 |
| OpenAI | Pay-per-use | £10-20 |
| Domain | .com | £1 |
| Stripe | 1.5% + 20p | Variable |
| **Total** | | **£70-80/month** |

**Revenue Break-even:** 2 customers @ £49/month

---

## Key Decisions Made

1. **No AWS Bedrock:** Stick with OpenAI Vision (simpler, works well)
2. **Placeholder entities:** Allow uploads without linking to entity (for MVP)
3. **Auto-approval threshold:** 0.7 confidence score
4. **Soft delete everywhere:** Compliance requirement (recoverable data)
5. **8px spacing grid:** Consistent design system
6. **Safety Yellow accent:** Single accent color (high visibility for safety industry)
7. **HeroUI components:** Clean, professional UI (14px border radius on all buttons)

---

## Lessons Learned (2026-03-08)

### Technical Lessons
1. **Next.js dynamic params:** Now passed as Promise, must `await params`
2. **Supabase table names:** Use `users` not `profiles`
3. **Schema precision:** Upload API must match exact database schema
4. **Error logging:** Detailed errors save hours of debugging

### Process Lessons
1. **Fix fast, deploy fast:** Multiple small deployments better than one big one
2. **Test early:** Test certificates created before AI fully working (good)
3. **Document as you go:** This memory file created incrementally

### Design Lessons
1. **Consistent radius:** 14px on all buttons (user feedback valuable)
2. **PostCSS config matters:** Tailwind v3 vs v4 syntax critical
3. **Design system first:** Made subsequent pages faster

---

## Next Immediate Steps (Priority Order)

1. **Connect list pages to APIs** (People, Vehicles, Assets pages fetch real data)
2. **Test AI upload with real certificate** (verify extraction works end-to-end)
3. **Build "Add Person" modal** (first CRUD form)
4. **Connect signup flow** (make auth functional)
5. **Test with real user** (Ben's test account)

---

## Questions / Blockers

### Current Blockers
- None (all deployment issues fixed)

### Open Questions
1. Should AI extraction retry on failure? (Currently fails once and stops)
2. How to handle duplicate certificates? (Same person, renewed certificate)
3. What happens when expiry date is missing? (Mark as "no expiry" or require manual input?)

---

## File Locations

**Project Root:** `/Users/botbot/.openclaw/workspace/hatsafe/`

**Key Files:**
- Database schema: `supabase/migrations/001_initial_schema.sql` (530 lines)
- RLS policies: `supabase/migrations/002_row_level_security.sql` (350 lines)
- TypeScript types: `lib/types/database.ts` (300+ types)
- Dashboard page: `app/dashboard/page.tsx`
- Upload modal: `components/documents/UploadDocumentModal.tsx`
- AI extraction: `app/api/documents/extract/route.ts`
- Upload API: `app/api/documents/upload/route.ts`

**Documentation:**
- Build plan: `/Users/botbot/.openclaw/workspace/hatsafe-build-plan.md`
- Week 1 status: `/Users/botbot/.openclaw/workspace/hatsafe/WEEK_1_FINAL_STATUS.md`
- Design system: `/Users/botbot/.openclaw/workspace/hatsafe/DESIGN_SYSTEM.md`

---

## Contact Information

**Owner:** Ben Brown  
**Email:** benjamin@onebeyond.studio  
**Domain:** hatsafe.com  
**Marketing List:** 1,500 contacts ready

---

**Memory Created:** 2026-03-08 21:45 GMT  
**Created By:** Doug (Clawbot)  
**Purpose:** Complete project history for Zebi workspace memory
