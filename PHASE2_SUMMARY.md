# Phase 2: Outcome-Aware Tasks — Implementation Complete ✅

## What Was Built

**Outcome fields added to tasks** — three new optional fields that appear contextually:
- `expectedOutcome` — What this task should produce
- `completionNote` — What actually happened when completed  
- `outputUrl` — Link to the artefact/output

## Design Principles Implemented

✅ **Hidden by default** — Outcome fields never shown on every task
✅ **Contextual surfacing** — Only appear when:
  - Task is high priority (P1/P2)
  - Task is linked to an objective
  - Task is AI-assigned (botAssignee set)
  - Task is completed (completedAt exists)
✅ **Lightweight task creation** — Fields don't clutter the initial task entry
✅ **Auto-save on blur** — Changes persist immediately without requiring modal save
✅ **Progressive disclosure** — Users can add fields one at a time via "+ Expected outcome" buttons

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)
Added three nullable Text fields to `model Task`:
```prisma
expectedOutcome  String?  @db.Text
completionNote   String?  @db.Text  
outputUrl        String?  @db.Text
```

### 2. API Layer (`app/api/tasks/[taskId]/route.ts`)
PATCH handler now accepts and updates outcome fields:
```typescript
...(body.expectedOutcome !== undefined && { expectedOutcome: body.expectedOutcome || null }),
...(body.completionNote !== undefined && { completionNote: body.completionNote || null }),
...(body.outputUrl !== undefined && { outputUrl: body.outputUrl || null }),
```

### 3. New Component (`components/TaskOutcomeFields.tsx`)
Standalone component with:
- Three field sections (Expected Outcome, Result, Output Link)
- Progressive disclosure via "+ Add" buttons
- Color-coded icons (🎯 red, ✅ green, 🔗 purple)
- Auto-save on blur
- Clean, minimal UI matching Zebi design system

### 4. Modal Integration (`components/TaskDetailModal.tsx`)
- Import TaskOutcomeFields component
- Added outcome state variables
- Load outcome fields from task data
- Reset outcome fields when modal closes
- Calculate `showOutcomeFields` boolean
- Render TaskOutcomeFields conditionally (after description, before attachments)
- Include outcome fields in handleSave when relevant

### 5. Types (`lib/types.ts`)
Extended Task interface:
```typescript
expectedOutcome?: string | null
completionNote?: string | null
outputUrl?: string | null
```

## Behavior

**When outcome fields appear:**
- Task is P1 or P2 priority → All three fields available
- Task linked to objective → All three fields available  
- Task assigned to Doug/Harvey → All three fields available
- Task completed → Result field auto-shows (even if not high-priority)

**When outcome fields are hidden:**
- Task is P3/P4 and not linked/AI-assigned and not completed

**User experience:**
1. User opens high-priority task
2. Sees outcome section with "+ Expected outcome", "+ Result note", "+ Output link" buttons
3. Clicks one button → field expands with text input
4. User types and tabs out → auto-saves immediately
5. Field remains visible on subsequent opens
6. User can clear field by deleting all text and blurring

## Quality Checks ✅

- ✅ TypeScript compiled with no errors (only pre-existing vitest warning ignored)
- ✅ Prisma client regenerated successfully
- ✅ All changes committed and pushed to main
- ✅ No outcome fields shown on regular P3/P4 tasks (tested via conditional logic)
- ✅ Outcome fields auto-save on blur (not on modal close)
- ✅ Clean separation: new component, minimal changes to existing code

## Next Steps (Not Implemented)

These were NOT part of Phase 2 but could be future enhancements:
- AI suggestions for expectedOutcome based on task title
- Batch operations (set outcome on multiple tasks)
- Analytics on outcome completion rates
- Outcome templates/presets
- Linking outcomes to objective progress

## Commit

```
feat: Phase 2 — outcome-aware tasks (expected outcome, result note, output link)

Commit: 57dc0eb
Branch: main
```
