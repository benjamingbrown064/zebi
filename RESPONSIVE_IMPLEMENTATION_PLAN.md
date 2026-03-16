# Zebi Responsive Implementation Plan

**Status:** In Progress  
**Started:** 2026-03-07 22:48 GMT  
**Goal:** Make Zebi app fully responsive for mobile (< 768px), iPad (768-1024px), and desktop

## Current State Assessment

✅ **Already exists:**
- Basic mobile sidebar (slide-out drawer)
- Mobile header with hamburger menu
- Touch target utilities (min-h-[44px])
- Zebi design system colors and spacing
- Font Awesome Pro duotone icons

❌ **Missing/Broken:**
- Systematic responsive layouts across all pages
- iPad-specific treatments
- Responsive profile pages
- Overflow menus for actions
- Responsive tab navigation
- Responsive tables/lists
- Consistent breakpoint system

## Breakpoint Strategy

```
Mobile:     < 768px   (sm)
iPad:       768-1024px (md)
Small laptop: 1025-1280px (lg)
Desktop:    1281px+   (xl)
```

## Implementation Phases

### Phase 1: Global Responsive Foundations ⚠️ IN PROGRESS

**1.1 Enhanced Sidebar Component** ✅
- Current mobile drawer is functional
- Needs: iPad collapsible sidebar behavior
- File: `/components/Sidebar.tsx`

**1.2 Responsive Layout Components** 🔄 NEXT
- Create: `/components/responsive/ResponsivePageContainer.tsx`
- Create: `/components/responsive/ResponsiveHeader.tsx`
- Create: `/components/responsive/ResponsiveTabBar.tsx`
- Create: `/components/responsive/OverflowMenu.tsx`
- Create: `/components/responsive/MobileListItem.tsx`

**1.3 Tailwind Config** 🔄
- Verify breakpoints match spec
- Add responsive spacing utilities
- File: `tailwind.config.ts`

### Phase 2: Dashboard Responsive

**Files to modify:**
- `/app/dashboard/client.tsx`
- `/app/dashboard/page.tsx`

**Changes:**
- Stack Today's Plan/Objectives/Projects vertically on mobile
- Two-column on iPad landscape (conditional)
- Full-width cards
- Responsive header with overflow menu
- Modal triggers instead of inline AI content

### Phase 3: List Pages Responsive

**3.1 Companies**
- `/app/companies/page.tsx` (create if missing)
- Stacked cards on mobile
- Company icon + name + minimal metadata

**3.2 Goals**
- `/app/goals/page.tsx`
- Vertical goal tiles
- Readable financial values
- Touch-friendly edit actions

**3.3 Objectives**
- `/app/objectives/client.tsx`
- Already has good tile system
- Ensure tiles stack properly on mobile
- iPad 2-column if clean, otherwise single

**3.4 Projects**
- `/app/projects/page.tsx`
- Stacked project cards
- Show: icon, name, company, objective, status

**3.5 Tasks**
- `/app/tasks/page.tsx`
- Clean vertical list on mobile
- Essential columns only: name, status, due date, linked entity

**3.6 Documents**
- `/app/documents/page.tsx`
- Clean list items
- Document icon, title, linked entity
- No emoji icons

### Phase 4: Profile Pages Responsive

**Standard responsive profile template:**
```
- Mobile header (simplified)
- Horizontal scroll tab bar (if tabs exist)
- Intro card (in body, not header)
- Content cards (stacked vertically)
- Action buttons (full-width or with overflow)
```

**Files to modify:**
- `/app/companies/[id]/page.tsx`
- `/app/goals/[id]/page.tsx`
- `/app/objectives/[id]/client.tsx`
- `/app/projects/[id]/page.tsx`
- `/app/tasks/[taskId]/client.tsx`
- `/app/documents/[id]/page.tsx`

### Phase 5: Interaction Fixes

- Overflow menus working on all pages
- Modals responsive
- Export dropdowns touch-friendly
- Tab bars scrollable
- Edit/save buttons accessible
- Dark mode toggle functional

### Phase 6: Polish

- Spacing consistency
- Card alignment
- Visual hierarchy
- Touch target quality
- No horizontal overflow anywhere

## File Structure

```
/components/
  ├── Sidebar.tsx (existing - enhance iPad behavior)
  └── responsive/
      ├── ResponsivePageContainer.tsx
      ├── ResponsiveHeader.tsx
      ├── ResponsiveTabBar.tsx
      ├── OverflowMenu.tsx
      ├── MobileListItem.tsx
      └── ResponsiveProfileTemplate.tsx
```

## Design Tokens (from DESIGN_SYSTEM.md)

**Colors:**
- Background: #FAFAFA
- Text: #1A1A1A
- Border: #E5E5E5
- Accent: #DD3A44
- Muted text: #A3A3A3

**Spacing:** 8px grid system
**Radius:** 6px (small), 10px (medium), 14px (large)
**Touch targets:** min-h-[44px] min-w-[44px]

## Next Immediate Steps

1. ✅ Audit current state (DONE)
2. 🔄 Create responsive layout components
3. 🔄 Update Dashboard responsive
4. 🔄 Update Objectives responsive
5. 🔄 Continue with remaining pages

## Testing Checklist (Per Page)

- [ ] Mobile portrait (375px, 414px)
- [ ] Mobile landscape (667px, 896px)
- [ ] iPad portrait (768px)
- [ ] iPad landscape (1024px)
- [ ] Small laptop (1280px)
- [ ] Desktop (1440px+)

**Per page must verify:**
- No horizontal overflow
- All actions accessible
- Touch targets adequate
- Content readable
- Navigation works
- Layouts feel intentional

---

**Last updated:** 2026-03-07 22:52 GMT
