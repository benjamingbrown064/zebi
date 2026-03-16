# Workspace Isolation - Quick Reference Card

## 🚀 Quick Start

### In Server Components
```typescript
import { requireWorkspace } from '@/lib/workspace'

export default async function MyPage() {
  const workspaceId = await requireWorkspace()
  
  const data = await prisma.task.findMany({
    where: { workspaceId }
  })
  
  return <div>...</div>
}
```

### In Client Components
```typescript
import { useWorkspace } from '@/lib/use-workspace'

export default function MyComponent() {
  const { workspaceId, loading } = useWorkspace()
  
  if (loading) return <LoadingSpinner />
  if (!workspaceId) return <div>No workspace</div>
  
  useEffect(() => {
    fetchData(workspaceId)
  }, [workspaceId])
  
  return <div>...</div>
}
```

### In API Routes
```typescript
import { requireWorkspace } from '@/lib/workspace'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    
    const tasks = await prisma.task.findMany({
      where: { workspaceId }
    })
    
    return NextResponse.json({ tasks })
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

### In Server Actions
```typescript
// Before
export async function getTasks() {
  const tasks = await prisma.task.findMany({
    where: { workspaceId: DEFAULT_WORKSPACE_ID }
  })
  return tasks
}

// After
export async function getTasks(workspaceId: string) {
  const tasks = await prisma.task.findMany({
    where: { workspaceId }
  })
  return tasks
}

// Usage
const workspaceId = await requireWorkspace()
const tasks = await getTasks(workspaceId)
```

---

## 🔧 Available Functions

### Server-Side (`@/lib/workspace`)

| Function | Use When | Returns |
|----------|----------|---------|
| `requireWorkspace()` | You need workspace ID and auth is required | `Promise<string>` or throws |
| `getWorkspaceFromAuth()` | Optional workspace, handle null case | `Promise<UserWorkspace \| null>` |
| `getUserWorkspace(userId)` | Have user ID, need their workspace | `Promise<UserWorkspace \| null>` |
| `hasWorkspaceAccess(userId, wsId)` | Verify user can access workspace | `Promise<boolean>` |

### Client-Side (`@/lib/use-workspace`)

| Hook | Returns |
|------|---------|
| `useWorkspace()` | `{ workspaceId, workspaceName, role, loading, error }` |

---

## 🚫 DON'T DO THIS

```typescript
// ❌ NEVER hardcode workspace ID
const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

// ❌ NEVER trust workspace from query params without validation
const workspaceId = searchParams.get('workspaceId')

// ❌ NEVER skip workspace check
const tasks = await prisma.task.findMany() // Gets ALL tasks!
```

---

## ✅ DO THIS INSTEAD

```typescript
// ✅ Get from auth
const workspaceId = await requireWorkspace()

// ✅ Use client hook
const { workspaceId } = useWorkspace()

// ✅ Always filter by workspace
const tasks = await prisma.task.findMany({
  where: { workspaceId }
})
```

---

## 🧪 Testing Checklist

After fixing a component:

- [ ] TypeScript compiles
- [ ] No DEFAULT_WORKSPACE_ID references
- [ ] Data filtered by workspace
- [ ] Test with two different accounts
- [ ] Verify no data leakage

---

## 🐛 Common Issues & Fixes

### "No workspace found for user"
**Cause:** User has no workspace assigned  
**Fix:** Run signup flow properly or seed workspace

### "workspaceId is null/undefined"
**Cause:** useWorkspace() called outside provider  
**Fix:** Ensure WorkspaceProvider wraps your app

### "Unauthorized" on API calls
**Cause:** Missing or invalid session  
**Fix:** Check auth middleware is working

### TypeScript error: "workspaceId might be null"
**Quick fix:** Use `workspaceId!` (non-null assertion)  
**Better fix:** Add proper null check

---

## 📝 File Patterns

### Identify File Type

```bash
# Server component (no 'use client')
app/my-page/page.tsx          → Use requireWorkspace()

# Client component (has 'use client')  
app/my-page/client.tsx        → Use useWorkspace()

# API route
app/api/my-route/route.ts     → Use requireWorkspace()

# Server action
app/actions/my-action.ts      → Accept workspaceId param

# Cron job
app/api/cron/*/route.ts       → Loop all workspaces
```

---

## 🛡️ Security Rules

1. **Never trust user input** - Always validate workspace access
2. **Filter everything** - Every DB query needs `where: { workspaceId }`
3. **Middleware validates** - Cross-workspace access blocked at edge
4. **Log violations** - Security events get logged
5. **Test isolation** - Two users should never see each other's data

---

## 📚 Documentation

- **Overview:** `WORKSPACE_ISOLATION_EXECUTIVE_SUMMARY.md`
- **Technical:** `WORKSPACE_FIX_SUMMARY.md`
- **Remaining Work:** `REMAINING_WORK_GUIDE.md`
- **Testing:** `test-workspace-isolation.md`

---

## 🎯 Quick Commands

```bash
# Find remaining DEFAULT_WORKSPACE_ID references
grep -r "DEFAULT_WORKSPACE_ID" --include="*.ts" --include="*.tsx" app/ lib/

# Count remaining files
grep -rl "DEFAULT_WORKSPACE_ID" --include="*.ts" --include="*.tsx" app/ lib/ | wc -l

# Fix API routes automatically
./fix-api-routes.sh

# Run TypeScript check
npm run type-check

# Build to verify
npm run build
```

---

## 💡 Tips

- Start your component with workspace check - fail fast
- Add loading states for workspace retrieval
- Test with incognito window for second user
- Check Network tab for API calls
- Review middleware logs for security violations

---

**Need more help? See the full documentation files.**
