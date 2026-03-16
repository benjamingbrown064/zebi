# Focus App - M6: Collaboration (Handoff)

## Mission: Add Comments, Mentions, Assignments, Share Links

**Status:** M1-M5 complete and shipped. Now adding collaboration layer.

**Scope:** 5 features that unlock team usage + sharing

**Timeline:** ~8-10 hours / 1 day

**Deliverables:**
1. Comments on tasks (read/write)
2. Mentions with @ autocomplete
3. Task assignments (assign to team member)
4. Notifications (mention you, task assigned to you)
5. Share links (public view, revokable)

---

## Feature 1: Comments on Tasks (2 hours)

### Database
**New table: TaskComment**
```sql
CREATE TABLE task_comment (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspace(id),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  INDEX (task_id),
  INDEX (workspace_id),
  INDEX (author_id)
);
```

**Prisma schema:** Already exists in schema.prisma

### Server Actions
**File: `app/actions/comments.ts`** (create new)

```typescript
export async function getTaskComments(taskId: string): Promise<TaskComment[]>
// Returns comments ordered by created_at DESC

export async function createComment(
  taskId: string,
  workspaceId: string,
  userId: string,
  body: string
): Promise<TaskComment>
// Create comment, parse mentions, trigger notifications

export async function deleteComment(commentId: string): Promise<boolean>
// Only author can delete, or workspace owner
```

### UI Component
**File: `components/TaskComments.tsx`** (create new)

```typescript
interface TaskCommentsProps {
  taskId: string
  workspaceId: string
  userId: string
  userName: string
}

// Features:
// - Comment list (scrollable, newest first)
// - "X ago" timestamps
// - Author avatar (initials)
// - Delete button (if author)
// - Comment input box with @mention autocomplete
// - "Send" button (Ctrl+Enter to send)
```

### Wire into TaskDetailModal
- Import `<TaskComments />`
- Show at bottom of modal
- Pass taskId, workspaceId, userId

---

## Feature 2: Mentions (@) with Autocomplete (2 hours)

### Mention Parser
**File: `lib/mentions.ts`** (create new)

```typescript
export function parseMentions(text: string): {
  body: string
  mentionedUserIds: string[]
}
// Find @username patterns
// Return text + list of user IDs mentioned

export function replaceMentions(text: string, users: User[]): string
// Convert @username to @UserId for storage
// Replace back to @username for display
```

### Comment Input Component
**File: `components/MentionInput.tsx`** (create new)

```typescript
interface MentionInputProps {
  onSubmit: (body: string) => void
  workspaceMembers: User[]
  disabled?: boolean
}

// Features:
// - Text input with @mention detection
// - Dropdown autocomplete when typing @
// - Shows: name, email, avatar
// - Click to insert mention
// - Keyboard nav (arrow keys + enter)
```

### Wire into TaskComments
- Replace text input with `<MentionInput />`
- Pass workspace members list
- Parse mentions on submit
- Save mention IDs to comment

---

## Feature 3: Task Assignments (2 hours)

### Database Update
**New field on Task:**
```sql
ALTER TABLE task ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
```

**Already in Prisma schema? Check.**

### Server Actions
**File: `app/actions/assignments.ts`** (create new)

```typescript
export async function assignTask(
  taskId: string,
  assigneeId: string,
  workspaceId: string
): Promise<Task>

export async function unassignTask(taskId: string): Promise<Task>

export async function getTasksAssignedToMe(
  workspaceId: string,
  userId: string
): Promise<Task[]>
```

### UI Component
**File: `components/TaskAssignee.tsx`** (create new)

```typescript
interface TaskAssigneeProps {
  taskId: string
  assignedTo?: User
  workspaceMembers: User[]
  onAssign: (userId: string) => void
}

// Features:
// - Show assignee avatar + name
// - Dropdown to change assignee
// - "Unassign" option
// - Members list from workspace
// - Search/filter members
```

### Wire into TaskDetailModal
- Add "Assigned to" section
- Show current assignee or "Unassigned"
- Allow changing assignment
- Trigger notification when assigned

---

## Feature 4: Notifications (1.5 hours)

### Database
**New table: Notification**
```sql
CREATE TABLE notification (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workspace_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'mention' | 'assigned' | 'commented'
  task_id TEXT REFERENCES task(id),
  actor_id UUID NOT NULL, -- Who triggered it
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
```

### Server Actions
**File: `app/actions/notifications.ts`** (create new)

```typescript
export async function getMyNotifications(
  userId: string,
  workspaceId: string
): Promise<Notification[]>

export async function markNotificationRead(notificationId: string): Promise<void>

export async function markAllRead(userId: string): Promise<void>

// Called by comments.ts and assignments.ts:
export async function createMentionNotification(
  mentionedUserIds: string[],
  commentAuthorId: string,
  taskId: string,
  workspaceId: string
)

export async function createAssignmentNotification(
  assigneeId: string,
  taskId: string,
  workspaceId: string
)
```

### UI Component
**File: `components/NotificationBell.tsx`** (create new)

```typescript
interface NotificationBellProps {
  userId: string
  workspaceId: string
}

// Features:
// - Bell icon in header
// - Red badge showing unread count
// - Dropdown showing last 10 notifications
// - Link to task when clicked
// - "Mark all as read" button
// - Real-time updates (poll every 30s)
```

### Wire into DashboardLayout
- Add NotificationBell to header (top right, next to search)
- Pass userId, workspaceId

---

## Feature 5: Share Links (2 hours)

### Database
**New table: ShareLink**
```sql
CREATE TABLE share_link (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  
  INDEX (task_id),
  INDEX (slug)
);
```

**Already in Prisma? Check.**

### Server Actions
**File: `app/actions/sharing.ts`** (create new)

```typescript
export async function createShareLink(
  taskId: string,
  workspaceId: string,
  userId: string
): Promise<ShareLink>
// Generate random slug, return shareable URL

export async function deleteShareLink(linkId: string): Promise<boolean>

export async function getTaskByShareLink(slug: string): Promise<Task | null>
// Public endpoint, no auth required
```

### Public Page
**File: `app/share/[slug]/page.tsx`** (create new)

```typescript
// Public view of task (read-only)
// Shows: title, description, status, priority, goal, comments
// Does NOT show: assigned to, internal notes
// No auth required
// Branding: "Shared via Focus"
```

### UI Component
**File: `components/ShareModal.tsx`** (create new)

```typescript
interface ShareModalProps {
  taskId: string
  workspaceId: string
  userId: string
  onClose: () => void
}

// Features:
// - Shows shareable link (copyable)
// - "Copy link" button
// - "Revoke link" button
// - Shows who shared it
// - QR code (optional, nice-to-have)
```

### Wire into TaskDetailModal
- Add "Share" button
- Opens ShareModal
- Shows existing share link or create new one

---

## Implementation Order

1. **Stage 1: Comments** (2h)
   - Create TaskComment table
   - Server actions (get, create, delete)
   - TaskComments component
   - Wire into TaskDetailModal
   - Test: create comment, see it persist

2. **Stage 2: Mentions** (2h)
   - Mention parser
   - MentionInput component
   - Parse mentions when creating comment
   - Store mention IDs
   - Test: type @, see autocomplete

3. **Stage 3: Assignments** (2h)
   - Add assigned_to field
   - Server actions
   - TaskAssignee component
   - Wire into TaskDetailModal
   - Test: assign task, see change

4. **Stage 4: Notifications** (1.5h)
   - Notification table
   - Server actions (create when mention/assign)
   - NotificationBell component
   - Wire into DashboardLayout
   - Test: mention someone, they get notification

5. **Stage 5: Share Links** (2h)
   - ShareLink table
   - Server actions
   - Public share page
   - ShareModal component
   - Wire into TaskDetailModal
   - Test: create link, open in incognito (no auth)

---

## Database Schema Checklist

- [ ] TaskComment table exists
- [ ] Notification table exists
- [ ] ShareLink table exists
- [ ] Task.assigned_to field exists
- [ ] All indexes created
- [ ] RLS policies written (comments visible to workspace only, etc.)

---

## TypeScript/Component Checklist

- [ ] `app/actions/comments.ts` created
- [ ] `app/actions/assignments.ts` created
- [ ] `app/actions/notifications.ts` created
- [ ] `app/actions/sharing.ts` created
- [ ] `lib/mentions.ts` created
- [ ] `components/TaskComments.tsx` created
- [ ] `components/MentionInput.tsx` created
- [ ] `components/TaskAssignee.tsx` created
- [ ] `components/NotificationBell.tsx` created
- [ ] `components/ShareModal.tsx` created
- [ ] `app/share/[slug]/page.tsx` created
- [ ] Zero TypeScript errors

---

## Testing Checklist

After each stage:

- [ ] Create comment → appears in task
- [ ] Mention user → they get notification
- [ ] Type @ → see autocomplete
- [ ] Assign task → task shows assignee
- [ ] Generate share link → can open without auth
- [ ] Revoke link → link returns 404
- [ ] Comment, assign, mention all trigger notifications

---

## Constraints

- Keep comments simple (no rich text yet)
- Mentions are @username, not @userId
- Share links are read-only public view
- Notifications are in-app only (no email yet)
- All data privacy: only workspace members see comments

---

## Success Criteria

When complete:
1. ✅ Comments work end-to-end
2. ✅ Can mention people with @ autocomplete
3. ✅ Can assign tasks to team members
4. ✅ Get notified when mentioned or assigned
5. ✅ Can share tasks publicly (read-only)
6. ✅ Zero TypeScript errors
7. ✅ Build passes
8. ✅ All CRUD operations tested

---

## Notes for Implementation

- Use existing Prisma schema where possible (tables may already exist)
- Follow existing patterns (TaskDetailModal structure, server actions)
- Keep it simple (no rich text, complex threading, etc.)
- Focus on UX (autocomplete, notifications, share link copy)
- Test each stage before moving to next

---

**Ready to implement. Go.**
