# Fix: Document Creation 404 Error

## Problem
When clicking "Create Document" button, users received a 404 error with the message "Document not found".

**Error messages:**
```
/api/documents/new:1 Failed to load resource: the server responded with a status of 404 ()
2117-23a135cd383e200e.js:1 Failed to fetch document: Document not found
```

## Root Cause
The "Create Document" button in `/app/documents/page.tsx` navigated to `/documents/new`:

```typescript
onClick={() => router.push('/documents/new')}
```

However, there was no `/app/documents/new/page.tsx` file. Instead, the app tried to load `/app/documents/[id]/page.tsx` with `id = "new"`, which then attempted to fetch `/api/documents/new` (which doesn't exist), resulting in a 404 error.

## Solution
Created a dedicated document creation page following the existing Zebi pattern used by projects:

**File created:** `/app/documents/new/page.tsx`

This new page:
1. Shows a form with document creation fields:
   - Document Title (required)
   - Document Type (required, defaults to "notes")
   - Company (optional, from workspace companies)
   - Project (optional, from workspace projects)

2. On form submission:
   - POSTs to `/api/documents` (existing endpoint)
   - Creates document with initial empty content structure
   - Navigates to `/documents/{id}` with the newly created document

3. Follows Zebi design patterns:
   - Matches styling from `/projects/new/page.tsx`
   - Uses HeroUI components (Input, Select, Button)
   - Responsive design with mobile support
   - Proper workspace validation via `useWorkspace` hook

## Files Changed
- ✅ Created: `/app/documents/new/page.tsx`

## Testing Verification
Tested end-to-end on production (https://zebi.app):

1. ✅ Navigate to `/documents`
2. ✅ Click "New Document" button
3. ✅ Form loads at `/documents/new` (no 404)
4. ✅ Fill in title: "Test Document - Fix Verification"
5. ✅ Select type: "Notes"
6. ✅ Click "Create Document"
7. ✅ Document created successfully with UUID
8. ✅ Navigated to `/documents/b5ab3a4d-a209-48c1-93bb-53150912de31`
9. ✅ Document editor loads with proper title and content

## Deployment
- Built successfully with Next.js 14.2.35
- Deployed to Vercel production
- Live at: https://zebi.app

## Pattern Consistency
This fix aligns with existing Zebi patterns:
- **Projects:** Use `/projects/new/page.tsx` with form → POST → navigate
- **Documents:** Now use `/documents/new/page.tsx` with form → POST → navigate
- **Companies/Tasks:** Use modal/inline creation (different UX pattern)

The document creation flow now matches the project creation flow for consistency.
