# Test Weekly Planner Phase 2

## Quick Test Checklist

### 1. Start Dev Server
```bash
cd /Users/botbot/.openclaw/workspace/zebi
npm run dev
```

### 2. Navigate to Planner
Open browser: `http://localhost:3000/planner`

### 3. Expected Behavior

#### Desktop View (>768px)
- See 7 columns (Monday - Sunday)
- Each column shows:
  - Day name + date
  - Task count
  - Capacity meter (green bar by default)
  - "Drop tasks here" if empty
- Right sidebar: "Backlog" section with unplanned tasks

#### Week Navigation
- Click "← Previous" → Last week loads
- Click "Next →" → Next week loads
- Click "Today" → Current week loads
- Top shows: "Mar 10 - Mar 16, 2026" (example)

#### Drag & Drop
1. Grab task from Backlog (hover shows grip handle)
2. Drag to any day column
3. Task moves instantly
4. Capacity meter updates
5. Color changes: green → yellow → red (as load increases)

#### Task Actions
- Hover task → Complete checkbox appears (top-right)
- Click checkbox → Task disappears
- Drag task between days → Updates instantly

#### Mobile View (<768px)
- Single day shown at a time
- Navigation: [← Prev] [Monday, Mar 10] [Next →]
- Backlog section below day content
- Same drag-drop works (touch-enabled)

### 4. Database Check
```bash
# Verify migration applied
npx prisma studio
# Navigate to Task table
# Check for "plannedDate" column (type: DateTime?)
```

### 5. API Test
```bash
# Update a task's plannedDate
curl -X PATCH http://localhost:3000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"plannedDate": "2026-03-17"}'

# Should return: { success: true, task: {...} }
```

## Expected Colors

### Capacity Meter
- **Green** (0-60%): `bg-[#10B981]`, `bg-[#ECFDF5]`
- **Yellow** (60-90%): `bg-[#F59E0B]`, `bg-[#FFFBEB]`
- **Red** (90%+): `bg-[#EF4444]`, `bg-[#FEF2F2]`

### Priority Borders (task cards)
- **High (1)**: Red `border-l-[#EF4444]`
- **Medium (2)**: Yellow `border-l-[#F59E0B]`
- **Low (3)**: Gray `border-l-[#A3A3A3]`

## Troubleshooting

### Issue: "Module not found: date-fns"
```bash
npm install date-fns
```

### Issue: "plannedDate field missing"
```bash
npx prisma generate
npx prisma migrate deploy
```

### Issue: "Drag not working"
- Check if `@dnd-kit` packages installed
- Try hard refresh (Cmd+Shift+R)
- Check browser console for errors

### Issue: "Tasks not showing"
- Verify tasks exist in database (Prisma Studio)
- Check network tab for API errors
- Ensure `archivedAt` is null

## Success Criteria

✅ Planner page loads without errors  
✅ Week navigation works (prev/next/today)  
✅ Drag task from backlog to day  
✅ Capacity meter shows correct color  
✅ Mobile view shows single day  
✅ Mark complete removes task  
✅ Changes persist on refresh  

---

**Next:** Deploy to staging, gather feedback, refine UX.
