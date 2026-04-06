# Zebi Orchestration Layer

## Overview

The orchestration layer enables autonomous agent collaboration through:
- **Handoffs**: Work transfer between agents with full context
- **Message Bus**: Asynchronous agent-to-agent communication
- **Work Queue**: Priority-based task distribution
- **Heartbeats**: Agent health monitoring
- **Resilience**: Automatic retry, deadlock detection, and recovery

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Harvey    │────▶│   Handoff   │────▶│    Doug     │
│  (Research) │     │   Context   │     │   (Build)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    │
       └───────────────────┼────────────────────┘
                           ▼
                    ┌─────────────┐
                    │ Message Bus │
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │ Work Queue  │
                    └─────────────┘
```

## Core Concepts

### 1. Handoffs

A handoff is a structured work transfer between agents containing:

- **Summary**: What this handoff is about
- **Completed Work**: What was done before transfer
- **Remaining Work**: What still needs doing
- **Requested Outcome**: Expected deliverable
- **Blockers**: Current obstacles (or "none")
- **Context**: Files changed, linked docs, decisions

#### Handoff States

1. **pending** → Agent has not accepted yet
2. **accepted** → Agent is working on it
3. **done** → Work completed
4. **rejected** → Agent declined (with reason)

#### Creating a Handoff (API)

```bash
POST /api/handoffs
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "workspaceId": "uuid",
  "fromAgent": "harvey",
  "toAgent": "doug",
  "taskId": "uuid",              // optional
  "companyId": "uuid",           // optional
  "projectId": "uuid",           // optional
  "summary": "Research complete — build pricing UI",
  "requestedOutcome": "Pricing comparison component wired to real data",
  "completedWork": "Researched 5 competitor pricing models, documented in AIMemory",
  "remainingWork": "Build React component, fetch competitor API data, wire to dashboard",
  "blockers": "none",
  "filesChanged": ["lib/pricing.ts", "docs/pricing-strategy.md"],
  "linkedDocIds": ["insight-uuid"],
  "decisionNeeded": false
}
```

**Response:**
```json
{
  "success": true,
  "handoff": { "id": "...", "status": "pending", ... },
  "warnings": ["Target agent doug has 18 active tasks — may be overloaded"]
}
```

#### Accepting a Handoff

```bash
PATCH /api/handoffs/<handoff-id>
Authorization: Bearer <agent-token>

{
  "workspaceId": "uuid",
  "status": "accepted"
}
```

This automatically:
- Sets `acceptedAt` timestamp
- Updates linked task's `waitingOn` field
- Creates activity log entry

#### Getting Handoff Context

```bash
GET /api/handoffs/<handoff-id>/context?workspaceId=uuid
```

Returns full context bundle:
- The handoff itself
- Linked task (if any)
- Recent AIMemory entries for same space
- Recent AIInsights
- Recent decisions from same project
- Sibling tasks (for situational awareness)

### 2. Agent Workload API

Agents poll this endpoint at the start of each work cycle to decide what to work on.

```bash
GET /api/agents/workload?workspaceId=uuid
Authorization: Bearer <agent-token>
```

**Response:**
```json
{
  "success": true,
  "agent": "doug",
  "polledAt": "2026-04-06T18:59:13.472Z",
  "hasWork": true,
  "pendingHandoffs": [...],      // Priority 1: Accept handoffs first
  "actionMessages": [...],        // Priority 2: Respond to urgent messages
  "unreadMessages": [...],        // Priority 3: Read info messages
  "readyTasks": [...],            // Priority 4: Work on assigned tasks
  "blockedTasks": [...],          // Cannot work on these
  "queueItem": {...},             // Priority 5: Generic queue work
  "summary": "Agent: doug | Poll: ...\n\nPENDING HANDOFFS (2) — accept these first:\n  • [9c6a4a9c] From harvey: E2E test handoff\n..."
}
```

The `summary` field is a plain-text report the agent can reason from directly.

### 3. Resilience Features

#### Automatic Retry

All orchestration operations use exponential backoff retry:

```typescript
import { withRetry, withRetriedTransaction } from '@/lib/ai/orchestration-resilience'

// Retry any async operation
const result = await withRetry(
  () => someAsyncOperation(),
  { maxAttempts: 3, backoffMs: 1000, jitter: true }
)

// Retry a Prisma transaction
const data = await withRetriedTransaction(async (tx) => {
  // transaction logic
  return result
})
```

#### Handoff Validation

Before creating a handoff, validation checks:
- Valid agents (harvey, theo, doug, casper, ben)
- Required fields present
- No duplicate pending handoffs for same task
- Target agent workload (warns if >20 tasks)

#### Stale Handoff Cleanup

Handoffs pending >48h are auto-rejected:

```bash
GET /api/orchestration/health?workspaceId=uuid
```

This runs cleanup and returns:
```json
{
  "success": true,
  "health": {
    "healthy": false,
    "issues": [
      "2 handoff(s) expired due to timeout",
      "1 task(s) stuck in blocked/waiting state for >72h"
    ],
    "stats": {
      "activeHandoffs": 3,
      "staleHandoffs": 2,
      "stuckTasks": 1,
      "deadlockDetected": false
    }
  }
}
```

**Recommended cron:** Run daily at 3am UTC.

#### Deadlock Detection

Detects circular dependencies:
- Agent A owns task waiting on Agent B
- Agent B owns task waiting on Agent A
- → Deadlock detected

```typescript
import { detectDeadlocks } from '@/lib/ai/orchestration-resilience'

const result = await detectDeadlocks(workspaceId)
if (result.hasDeadlock) {
  console.log('Cycle:', result.cycle)  // ['harvey', 'doug', 'harvey']
  console.log('Suggested resolution:', result.suggestedResolution)
}
```

#### Stuck Task Detection

Finds tasks unchanged for >72h that are blocked/waiting.

```typescript
import { detectStuckTasks } from '@/lib/ai/orchestration-resilience'

const stuck = await detectStuckTasks(workspaceId)
for (const task of stuck) {
  console.log(`Task ${task.taskId} stuck since ${task.stuckSince}`)
  console.log(`Reason: ${task.blockedReason ?? task.waitingOn}`)
}
```

### 4. Message Bus

Agents communicate via `AgentMessage` records.

#### Sending a Message

```typescript
await prisma.agentMessage.create({
  data: {
    workspaceId,
    threadId: '',                    // set to own id after creation
    fromAgent: 'harvey',
    toAgent: 'doug',
    subject: 'Question about API design',
    body: 'Should we use REST or GraphQL for the pricing endpoint?',
    taskId: taskId ?? null,
    handoffId: handoffId ?? null,
    actionRequired: true,           // urgent: requires reply
    actionDeadline: new Date('2026-04-07T12:00:00Z'),
  }
})
```

Messages with `actionRequired: true` appear in the agent's `actionMessages` list.

#### Reading Messages

```bash
PATCH /api/bus/messages/<message-id>
{
  "readAt": "2026-04-06T19:00:00Z"
}
```

#### Replying to a Message

Create a new message with the same `threadId`:

```typescript
await prisma.agentMessage.create({
  data: {
    workspaceId,
    threadId: originalMessage.threadId,   // same thread
    fromAgent: 'doug',
    toAgent: 'harvey',
    subject: 'Re: Question about API design',
    body: 'REST for now — simpler for MVP. We can migrate to GraphQL in Phase 2.',
  }
})
```

### 5. Work Queue

Generic task queue for background/scheduled work.

```typescript
await prisma.aIWorkQueue.create({
  data: {
    workspaceId,
    queueType: 'research_task',
    priority: 2,
    scheduledFor: new Date(),
    contextData: {
      assignedTo: 'harvey',        // optional: lock to specific agent
      title: 'Research market sizing',
      description: 'Find TAM/SAM/SOM for B2B SaaS analytics tools',
    },
  }
})
```

The workload API auto-claims queue items (one per poll) if `assignedTo` matches or is unset.

### 6. Agent Heartbeats

Agents ping on every poll:

```typescript
await prisma.agentHeartbeat.upsert({
  where: { workspaceId_agent: { workspaceId, agent: 'doug' } },
  create: { workspaceId, agent: 'doug', lastSeenAt: new Date(), event: 'poll' },
  update: { lastSeenAt: new Date(), event: 'poll' },
})
```

**Agent status:**
- **Active**: Last seen <2 min ago
- **Idle**: Last seen 2-60 min ago
- **Offline**: Last seen >60 min ago

Monitor via:
```bash
GET /api/orchestration/monitor?workspaceId=uuid
```

## Agent Workflows

### Example: Harvey → Doug Handoff

1. **Harvey researches** pricing models
2. Harvey creates handoff:
   ```bash
   POST /api/handoffs
   {
     "fromAgent": "harvey",
     "toAgent": "doug",
     "summary": "Research done — build pricing UI",
     ...
   }
   ```
3. Doug receives wakeup message via bus
4. Doug polls workload → sees `pendingHandoffs`
5. Doug accepts handoff:
   ```bash
   PATCH /api/handoffs/<id> { "status": "accepted" }
   ```
6. Doug fetches context:
   ```bash
   GET /api/handoffs/<id>/context
   ```
7. Doug builds feature
8. Doug marks handoff done:
   ```bash
   PATCH /api/handoffs/<id> { "status": "done" }
   ```

### Example: Doug Polling Loop (Zebi Cron)

```typescript
// Runs every 30 minutes
const workload = await fetch('https://zebi.app/api/agents/workload?workspaceId=...', {
  headers: { Authorization: 'Bearer <doug-token>' }
}).then(r => r.json())

if (!workload.hasWork) return

// Priority order:
if (workload.pendingHandoffs.length > 0) {
  // Accept and process handoffs first
  for (const h of workload.pendingHandoffs) {
    await acceptHandoff(h.id)
    const context = await fetchHandoffContext(h.id)
    await doWork(context)
  }
}

if (workload.actionMessages.length > 0) {
  // Respond to urgent messages
  for (const msg of workload.actionMessages) {
    await replyToMessage(msg)
  }
}

if (workload.readyTasks.length > 0) {
  // Work on assigned tasks
  const task = workload.readyTasks[0]  // highest priority
  await doTaskWork(task)
}

if (workload.queueItem) {
  // Process queue item
  await processQueueItem(workload.queueItem)
}
```

## Monitoring & Debugging

### Health Check

Run daily to clean up stale data:

```bash
curl -H "Authorization: Bearer <token>" \
  "https://zebi.app/api/orchestration/health?workspaceId=<uuid>"
```

### Live Monitor

Real-time dashboard data:

```bash
curl -H "Authorization: Bearer <token>" \
  "https://zebi.app/api/orchestration/monitor?workspaceId=<uuid>"
```

Returns:
- Agent status (active/idle/offline)
- Active handoffs
- Message flow stats
- Work queue depth
- Handoff acceptance time

### Activity Logs

All orchestration events are logged to `ActivityLog`:

```typescript
await prisma.activityLog.findMany({
  where: {
    workspaceId,
    eventType: { in: ['handoff_created', 'handoff_expired', 'agent_message'] }
  },
  orderBy: { createdAt: 'desc' },
  take: 50,
})
```

Event types:
- `handoff_created`
- `handoff_expired`
- `agent_message`
- `task_assigned`
- `task_completed`

## Error Handling

### Common Errors

**404: Handoff not found**
- Handoff was deleted or doesn't exist
- Wrong workspaceId

**400: Invalid status**
- Status must be: pending | accepted | rejected | done

**400: Missing required fields**
- Check: fromAgent, toAgent, summary, requestedOutcome, completedWork, remainingWork, blockers

**409: Duplicate handoff**
- A pending handoff already exists for this task
- Wait for acceptance/rejection or cancel existing handoff

### Retry Logic

All DB operations use automatic retry with exponential backoff:
- Max 3 attempts
- 1s → 2s → 4s backoff
- Jitter to avoid thundering herd

### Transaction Safety

Handoff creation uses atomic transactions:
- Create handoff
- Update task
- Send wakeup message
- Log activity

If any step fails, all are rolled back.

## Best Practices

### For Agents

1. **Poll regularly** (every 30 min)
2. **Check handoffs first** before working on tasks
3. **Accept promptly** — don't let handoffs sit >24h
4. **Provide context** — always fill in completedWork and remainingWork
5. **Link artifacts** — attach relevant doc/insight IDs
6. **Mark done** — close handoffs when work is finished

### For Handoff Creation

✅ **DO:**
- Be specific in requestedOutcome
- List concrete next steps in remainingWork
- Mention any blockers (or write "none")
- Link related files and docs
- Set decisionNeeded if uncertain

❌ **DON'T:**
- Hand off to yourself
- Create duplicate handoffs for same task
- Leave fields empty/vague
- Hand off without context

### For System Health

- Run `/api/orchestration/health` daily
- Monitor `/api/orchestration/monitor` for bottlenecks
- Alert if agent offline >2h
- Review stuck tasks weekly
- Check for deadlocks monthly

## API Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/handoffs` | GET | Agent or Session | List handoffs |
| `/api/handoffs` | POST | Agent or Session | Create handoff |
| `/api/handoffs/:id` | GET | Agent or Session | Get one handoff |
| `/api/handoffs/:id` | PATCH | Agent or Session | Update status |
| `/api/handoffs/:id/context` | GET | Agent or Session | Get context bundle |
| `/api/agents/workload` | GET | Agent | Poll for work |
| `/api/orchestration/health` | GET | Agent or Session | Run health check |
| `/api/orchestration/monitor` | GET | Agent or Session | Get live metrics |
| `/api/bus/messages` | GET | Agent | List messages |
| `/api/bus/messages` | POST | Agent | Send message |
| `/api/bus/messages/:id` | PATCH | Agent | Mark read/reply |

## Schema

### Handoff

```prisma
model Handoff {
  id               String   @id @default(dbgenerated("gen_random_uuid()::text"))
  workspaceId      String
  taskId           String?
  companyId        String?
  projectId        String?
  fromAgent        String   // harvey | theo | doug | casper | ben
  toAgent          String
  summary          String
  requestedOutcome String
  completedWork    String
  remainingWork    String
  blockers         String
  filesChanged     String[]
  linkedDocIds     String[]
  decisionNeeded   Boolean  @default(false)
  decisionSummary  String?
  status           String   @default("pending") // pending | accepted | rejected | done
  createdAt        DateTime @default(now())
  acceptedAt       DateTime?
}
```

### AgentMessage

```prisma
model AgentMessage {
  id             String   @id @default(dbgenerated("gen_random_uuid()::text"))
  workspaceId    String
  threadId       String
  fromAgent      String
  toAgent        String   // or "all" for broadcast
  subject        String?
  body           String
  taskId         String?
  handoffId      String?
  companyId      String?
  projectId      String?
  actionRequired Boolean  @default(false)
  actionDeadline DateTime?
  readAt         DateTime?
  repliedAt      DateTime?
  createdAt      DateTime @default(now())
}
```

### AIWorkQueue

```prisma
model AIWorkQueue {
  id           String   @id @default(dbgenerated("gen_random_uuid()::text"))
  workspaceId  String
  queueType    String
  priority     Int      @default(3)
  scheduledFor DateTime
  claimedAt    DateTime?
  claimedBy    String?
  completedAt  DateTime?
  contextData  Json
  retryCount   Int      @default(0)
  createdAt    DateTime @default(now())
}
```

### AgentHeartbeat

```prisma
model AgentHeartbeat {
  workspaceId String
  agent       String
  lastSeenAt  DateTime
  event       String?
  @@id([workspaceId, agent])
}
```

## Future Enhancements

- [ ] Priority-based handoff routing
- [ ] Agent load balancing
- [ ] Multi-agent consensus for decisions
- [ ] Handoff templates
- [ ] Auto-escalation for expired handoffs
- [ ] Agent skill matching for handoff assignment
- [ ] Handoff analytics dashboard
- [ ] WebSocket push for instant wakeups
- [ ] Distributed tracing for handoff chains
