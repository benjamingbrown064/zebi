# Focus - Personal Task Manager

A calm, focused task management app for solopreneurs, founders, and knowledge workers.

**Core principles:**
- Help people decide what matters TODAY
- Glanceable in 5 seconds (3-panel dashboard)
- Limits on purpose (max 5 tasks per day)
- Real goals with measurable targets

## Tech Stack

- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS
- **Backend:** Supabase Postgres (London region)
- **Auth:** Supabase Auth
- **UI:** shadcn/ui + Lucide React
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+ (we're using 20+)
- A Supabase account (free tier works)
- npm or yarn

### Setup

1. **Clone and install:**
   ```bash
   cd focus-app
   npm install
   ```

2. **Set up Supabase:**
   - Create a new project on supabase.com
   - Note your project URL and anon key
   - Create a `.env.local` file:
     ```bash
     cp .env.local.example .env.local
     ```
   - Update with your Supabase credentials

3. **Push the database schema:**
   ```bash
   npm run db:push
   ```

4. **Run locally:**
   ```bash
   npm run dev
   ```

   Open http://localhost:3000

## Milestones

### Milestone 1: Foundations (IN PROGRESS) ✅
- [x] Auth & Login/Signup pages
- [ ] Workspace model & sidebar navigation
- [ ] RLS policies & default statuses
- [ ] Dashboard shell & design system

### Milestone 2: Tasks Core
- [ ] Global task list
- [ ] Quick add input
- [ ] Task detail view & editor
- [ ] Tags & attachments

### Milestone 3: Dashboard
- [ ] Today panel (max 5 tasks)
- [ ] Attention signals
- [ ] Goals overview

### Milestone 4: Goals
- [ ] Goal creation & tracking
- [ ] Progress calculation
- [ ] Pace indicators

### Milestone 5: Boards & Filters
- [ ] Board view with drag-drop
- [ ] Saved filters (JSON-based)

### Milestone 6: Collaboration
- [ ] Comments & mentions
- [ ] Assignments
- [ ] Share links

### Milestone 7: Hardening
- [ ] Testing (unit + E2E)
- [ ] RLS verification
- [ ] Performance optimization
- [ ] Sentry integration

## Design System

### Colors
- **Accent:** Yellow (#facc15)
- **Base:** Monochrome (off-white, grays, near-black)
- **No gradients, no heavy shadows**

### Spacing
- **Gutters:** 32px between major sections
- **Card padding:** 16px minimum
- **Breathing room:** Ample whitespace everywhere

### Typography
- **Font:** System font (-apple-system)
- **Hierarchy:** Size + weight, not color
- **Readable at 16px body size**

### Components
- **Icons:** Font Awesome outline style, always with labels
- **Corners:** 12-16px border radius
- **Interactions:** Modals for deep views, side panels for secondary content

## Development

### Running tests:
```bash
npm run test
```

### Database admin:
```bash
npm run db:studio
```

### Building for production:
```bash
npm run build
npm run start
```

## Key Files

```
focus-app/
├── app/                   # Next.js App Router
│   ├── api/              # API routes
│   ├── dashboard/        # Main dashboard
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   ├── globals.css       # Tailwind + global styles
│   └── layout.tsx        # Root layout
├── lib/                  # Utilities
│   ├── types.ts         # TypeScript types
│   ├── schemas.ts       # Zod validation schemas
│   └── supabase.ts      # Supabase client setup
├── components/           # React components (to be built)
├── prisma/              # Database
│   └── schema.prisma    # Data model
└── package.json
```

## Environment Variables

See `.env.local.example` for all required variables.

Key ones:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `DATABASE_URL` - Postgres connection string (with pgBouncer)

## Next Steps

1. Set up Supabase project
2. Create `.env.local` with credentials
3. Run `npm install && npm run db:push`
4. Start dev server: `npm run dev`
5. Sign up at http://localhost:3000/signup
6. Finish Milestone 1 (navigation, design system)

---

**Built by Doug for Ben Brown - 2026**
