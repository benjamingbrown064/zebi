# Zebi AI Assistant - Customer-Facing Feature Spec

**Version:** 1.0  
**Created:** 2026-03-07  
**Status:** Planning

---

## Executive Summary

Customer-facing AI Assistant built into Zebi. Every user gets an intelligent assistant that helps them plan, prioritize, and stay on track with their goals and tasks.

**Key Distinction:**
- **Doug** (private): Ben's personal AI assistant via Telegram (`/api/doug/*`)
- **Zebi AI** (product): Customer-facing assistant built into the app

---

## 1. Core Purpose

Help Zebi users:
- Stay focused on what matters today
- Make realistic plans they can actually execute
- Identify risks and blockers early
- Align daily work with long-term goals
- Feel less overwhelmed, more in control

---

## 2. Key Capabilities

### 2.1 Daily Planning Assistant
- **Morning briefing**: "Here's what matters today"
- **Priority suggestions**: "Focus on these 3 tasks first"
- **Reality check**: "You have 8 tasks planned but only 4 hours available"
- **Goal alignment**: "Complete task X to unlock milestone Y"

### 2.2 Proactive Intelligence
- **Risk detection**: "Project Z deadline is next week, but no tasks started"
- **Blocker alerts**: "Waiting on X for 5 days - should we escalate?"
- **Opportunity spotting**: "Good week to push Company A objective forward"
- **Progress tracking**: "On track to hit monthly revenue goal"

### 2.3 Natural Language Interface
- **Chat**: Ask questions, get answers about your workspace
  - "What should I work on today?"
  - "Am I on track for Q1 goals?"
  - "What's blocking the Love Warranty launch?"
- **Quick actions**: Create tasks, update progress, mark blockers
- **Context-aware**: Knows your goals, deadlines, priorities

### 2.4 Task Intelligence
- **Smart breakdown**: "This objective is big - let me create subtasks"
- **Dependency detection**: "Task A needs B to be done first"
- **Effort estimation**: "This will take ~3 hours based on similar tasks"
- **Deadline suggestions**: "Based on your schedule, aim for Friday"

---

## 3. Architecture

### 3.1 System Components

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  - Chat Interface (sidebar/modal)               │
│  - Dashboard Recommendations Card               │
│  - Inline Suggestions (task/objective pages)    │
│  - Activity Feed (AI actions history)           │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              API Layer (/api/assistant/*)        │
│  - /chat          - Conversational interface    │
│  - /brief         - Daily briefing               │
│  - /analyze       - Analyze workspace state      │
│  - /suggest       - Get recommendations          │
│  - /action        - Execute AI suggestions       │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│            AI Orchestrator Service               │
│  - Context Builder (workspace → prompt)          │
│  - LLM Integration (Anthropic Claude)            │
│  - Action Executor (create tasks, etc.)          │
│  - Response Formatter (AI → UI)                  │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              Data Layer (Supabase)               │
│  - Workspace data (tasks, objectives, etc.)     │
│  - AI conversation history                       │
│  - AI memory (user preferences, patterns)        │
│  - RLS enforced (workspace isolation)            │
└──────────────────────────────────────────────────┘
```

### 3.2 Key Design Principles

1. **Workspace-scoped**: Users only see/interact with their workspace data
2. **RLS-enforced**: All database queries respect Row Level Security
3. **Context-aware**: AI understands goals, deadlines, priorities, history
4. **Action-oriented**: Suggestions come with one-click actions
5. **Transparent**: Show why AI made a suggestion
6. **Feedback loop**: Learn from user accepts/rejects

---

## 4. Data Models

### 4.1 AI Conversation
```typescript
interface AIConversation {
  id: string
  workspaceId: string
  userId: string
  messages: AIMessage[]
  context: Record<string, any>  // Workspace state snapshot
  createdAt: Date
  updatedAt: Date
}

interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: AIAction[]  // Suggested actions
  metadata?: {
    model: string
    tokens: number
    cost: number
  }
  createdAt: Date
}
```

### 4.2 AI Suggestion
```typescript
interface AISuggestion {
  id: string
  workspaceId: string
  userId: string
  type: 'task' | 'priority' | 'blocker' | 'goal' | 'risk'
  title: string
  description: string
  reasoning: string  // Why this suggestion
  actions: AIAction[]  // What user can do
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  context: Record<string, any>
  createdAt: Date
  expiresAt: Date
}

interface AIAction {
  type: 'create_task' | 'update_priority' | 'flag_blocker' | 'schedule_review'
  label: string  // Button text
  params: Record<string, any>  // Action parameters
}
```

### 4.3 AI Memory
```typescript
interface AIMemory {
  id: string
  workspaceId: string
  userId: string
  category: 'preference' | 'pattern' | 'decision' | 'context'
  key: string
  value: any
  source: string  // How this was learned
  confidence: number  // 0-100
  lastUsedAt: Date
  createdAt: Date
}
```

---

## 5. Implementation Phases

### Phase 1: Chat Foundation (Week 1-2)
**Goal**: Basic chat interface with context-aware responses

**Deliverables:**
- [ ] Chat UI component (sidebar, modal, or dedicated page)
- [ ] `POST /api/assistant/chat` endpoint
- [ ] Context builder (workspace data → prompt)
- [ ] Claude API integration
- [ ] Conversation history storage
- [ ] Basic RLS policies for AI tables

**User Experience:**
- Click "Ask AI" button
- Chat opens in sidebar
- Type question → get contextual answer
- AI knows about workspace (tasks, goals, deadlines)

**Example Queries:**
- "What should I focus on today?"
- "Am I on track for my revenue goals?"
- "What's blocking the Love Warranty project?"

---

### Phase 2: Dashboard Recommendations (Week 3)
**Goal**: Proactive suggestions on dashboard

**Deliverables:**
- [ ] "AI Recommendations" card on dashboard
- [ ] `GET /api/assistant/brief` - Daily briefing
- [ ] `GET /api/assistant/suggest` - Get suggestions
- [ ] `POST /api/assistant/action` - Execute suggestion
- [ ] Suggestion acceptance/rejection tracking
- [ ] Feedback loop (learn from user behavior)

**User Experience:**
- Dashboard shows 3-5 AI recommendations
- Each has: title, reasoning, action buttons
- Click "Do this" → action executes
- Click "Not now" → suggestion dismissed

**Example Suggestions:**
- "Focus on Task X (blocks 3 other tasks)"
- "Schedule Love Warranty review (launch in 5 days)"
- "Update revenue objective (7 days behind)"

---

### Phase 3: Inline Intelligence (Week 4)
**Goal**: Context-aware suggestions throughout the app

**Deliverables:**
- [ ] Task page: AI-suggested priority/deadline
- [ ] Objective page: AI-detected risks/opportunities
- [ ] Projects page: AI breakdown suggestions
- [ ] Inline "Ask AI" button on key pages
- [ ] Smart suggestions based on current view

**User Experience:**
- Viewing a task → AI suggests better priority
- Creating objective → AI offers subtask breakdown
- On any page → "Ask AI about this" button

---

### Phase 4: Proactive Alerts (Week 5)
**Goal**: AI identifies risks and opportunities automatically

**Deliverables:**
- [ ] Background job: Analyze workspace daily
- [ ] Alert generation for risks/blockers/opportunities
- [ ] Activity feed showing AI actions
- [ ] Notification system integration
- [ ] Alert prioritization (critical → low)

**User Experience:**
- Wake up → AI briefing in notifications
- Dashboard → "3 alerts need attention"
- Activity feed → Timeline of AI actions

---

## 6. Technical Implementation Details

### 6.1 API Endpoints

#### `POST /api/assistant/chat`
**Purpose**: Send message, get AI response

**Request:**
```json
{
  "message": "What should I work on today?",
  "conversationId": "optional-uuid",
  "context": {
    "page": "dashboard",
    "filters": {},
    "selectedDate": "2026-03-07"
  }
}
```

**Response:**
```json
{
  "conversationId": "uuid",
  "message": {
    "id": "msg-uuid",
    "role": "assistant",
    "content": "Based on your goals...",
    "actions": [
      {
        "type": "create_task",
        "label": "Add this task",
        "params": { "title": "...", "priority": 1 }
      }
    ],
    "metadata": {
      "model": "claude-sonnet-4",
      "tokens": 150,
      "reasoning": "I prioritized this because..."
    }
  }
}
```

#### `GET /api/assistant/brief`
**Purpose**: Get daily briefing

**Response:**
```json
{
  "date": "2026-03-07",
  "summary": "You have 3 high-priority tasks...",
  "priorities": [
    { "taskId": "uuid", "reason": "Blocks 3 other tasks" }
  ],
  "risks": [
    { "objectiveId": "uuid", "severity": "high", "description": "..." }
  ],
  "opportunities": [
    { "goalId": "uuid", "description": "Good week to push this forward" }
  ]
}
```

#### `GET /api/assistant/suggest`
**Purpose**: Get AI suggestions for current context

**Query Params:**
- `context`: dashboard | task | objective | project
- `entityId`: UUID (if context is specific entity)

**Response:**
```json
{
  "suggestions": [
    {
      "id": "uuid",
      "type": "task",
      "title": "Focus on X first",
      "description": "This task blocks 3 others",
      "reasoning": "Based on dependency analysis...",
      "actions": [
        { "type": "update_priority", "label": "Set as P1", "params": {...} }
      ],
      "status": "pending"
    }
  ]
}
```

#### `POST /api/assistant/action`
**Purpose**: Execute AI-suggested action

**Request:**
```json
{
  "suggestionId": "uuid",
  "actionType": "create_task",
  "params": { "title": "...", "priority": 1 }
}
```

**Response:**
```json
{
  "success": true,
  "result": { "taskId": "uuid", "title": "..." }
}
```

---

### 6.2 Context Builder

**Purpose**: Convert workspace data into LLM-friendly context

**Inputs:**
- User's workspace ID
- Current date/time
- Active goals, objectives, tasks
- Recent activity
- User preferences (AI memory)

**Output:**
```typescript
interface AIContext {
  workspace: {
    id: string
    name: string
    activeGoals: Goal[]
    activeObjectives: Objective[]
    recentTasks: Task[]
    blockers: Blocker[]
  }
  user: {
    preferences: Record<string, any>
    workingHours: { start: string, end: string }
    timezone: string
  }
  temporal: {
    currentDate: string
    dayOfWeek: string
    upcomingDeadlines: Deadline[]
  }
}
```

**Key Function:**
```typescript
async function buildContext(workspaceId: string, userId: string): Promise<AIContext> {
  const [goals, objectives, tasks, blockers, memory] = await Promise.all([
    getActiveGoals(workspaceId),
    getActiveObjectives(workspaceId),
    getRecentTasks(workspaceId),
    getActiveBlockers(workspaceId),
    getAIMemory(workspaceId, userId),
  ])

  return {
    workspace: { id: workspaceId, goals, objectives, tasks, blockers },
    user: { preferences: memory.preferences, ... },
    temporal: { currentDate: new Date().toISOString(), ... }
  }
}
```

---

### 6.3 Prompt Templates

#### Daily Briefing Prompt
```
You are Zebi AI, an intelligent assistant helping users manage their goals and tasks.

WORKSPACE CONTEXT:
- Active Goals: {goals}
- Active Objectives: {objectives}
- Today's Tasks: {tasks}
- Blockers: {blockers}
- Upcoming Deadlines: {deadlines}

USER CONTEXT:
- Working Hours: {workingHours}
- Preferences: {preferences}

TASK:
Generate a daily briefing that:
1. Highlights top 3 priorities for today
2. Identifies any risks or blockers
3. Suggests realistic actions
4. Aligns daily work with long-term goals

Keep it concise, actionable, and encouraging.

FORMAT:
{
  "summary": "brief overview",
  "priorities": [{ taskId, reason }],
  "risks": [{ description, severity }],
  "opportunities": [{ description }]
}
```

#### Chat Prompt
```
You are Zebi AI, an intelligent assistant embedded in Zebi task management app.

WORKSPACE CONTEXT:
{context}

CONVERSATION HISTORY:
{history}

USER QUESTION:
{userMessage}

GUIDELINES:
- Be helpful, concise, and action-oriented
- Reference specific tasks/goals/objectives by name
- Suggest concrete next steps
- If you can help the user take action, offer it
- Don't make up data - only use provided context

Respond in JSON:
{
  "content": "your response",
  "actions": [{ type, label, params }],
  "reasoning": "why you suggested this"
}
```

---

### 6.4 RLS Policies

All AI tables must be workspace-scoped:

```sql
-- AI Conversations
CREATE POLICY "Users can view own conversations"
ON ai_conversations FOR SELECT
USING (workspace_id = current_workspace_id());

CREATE POLICY "Users can create own conversations"
ON ai_conversations FOR INSERT
WITH CHECK (workspace_id = current_workspace_id());

-- AI Suggestions
CREATE POLICY "Users can view own suggestions"
ON ai_suggestions FOR SELECT
USING (workspace_id = current_workspace_id());

-- AI Memory
CREATE POLICY "Users can view own memory"
ON ai_memory FOR SELECT
USING (workspace_id = current_workspace_id());
```

---

## 7. UI Components

### 7.1 Chat Interface

**Location**: Sidebar (slides in from right)

**Features:**
- Message history
- User/assistant messages
- Action buttons on AI messages
- Loading states
- Error handling
- "Clear conversation" button

**Component:**
```typescript
<AIChat
  workspaceId={workspaceId}
  userId={userId}
  onAction={(action) => executeAction(action)}
/>
```

---

### 7.2 Dashboard Recommendations Card

**Location**: Dashboard, below summary cards

**Features:**
- 3-5 AI suggestions
- Each with: title, reasoning, action buttons
- Dismiss/accept/defer options
- "See all suggestions" link
- Refresh button

**Component:**
```typescript
<AIRecommendations
  workspaceId={workspaceId}
  limit={5}
  onAccept={(suggestionId) => handleAccept(suggestionId)}
  onReject={(suggestionId) => handleReject(suggestionId)}
/>
```

---

### 7.3 Inline AI Button

**Location**: Throughout app (task pages, objective pages, etc.)

**Features:**
- "Ask AI" button
- Opens chat in context of current page
- Pre-populated with contextual prompt
- Quick access without leaving page

**Component:**
```typescript
<InlineAIButton
  context={{ page: 'task', entityId: taskId }}
  prompt="Help me prioritize this task"
/>
```

---

## 8. Cost & Performance

### 8.1 LLM Costs (Claude Sonnet)
- Input: $3 / 1M tokens
- Output: $15 / 1M tokens

**Estimated Usage per User per Day:**
- Daily briefing: ~1000 tokens → $0.003
- 5 chat messages: ~5000 tokens → $0.015
- Background analysis: ~2000 tokens → $0.006
- **Total: ~$0.024/day/user** → **$0.72/month/user**

**At Scale:**
- 100 users: $72/month
- 1,000 users: $720/month
- 10,000 users: $7,200/month

---

### 8.2 Performance Targets
- Chat response: < 2 seconds
- Dashboard suggestions: < 500ms (cached)
- Background analysis: < 5 seconds
- Context building: < 200ms

---

## 9. Success Metrics

### 9.1 Engagement
- % users who use AI weekly
- Average messages per conversation
- Suggestion acceptance rate
- Chat retention rate

### 9.2 Impact
- Task completion rate improvement
- Time to complete objectives
- Blocker detection accuracy
- User-reported "feeling in control"

### 9.3 Technical
- Response latency (p50, p95, p99)
- Error rate
- Cost per user per month
- Cache hit rate

---

## 10. Security & Privacy

### 10.1 Data Access
- AI only accesses workspace data user has permission to see
- RLS enforced at database level
- No cross-workspace data leakage
- Conversation history is workspace-scoped

### 10.2 LLM Provider
- Use Anthropic Claude (SOC 2, GDPR compliant)
- No training on user data
- Ephemeral context (no data retention)
- Audit logging for all AI requests

### 10.3 Rate Limiting
- Max 50 chat messages per user per day
- Max 1 briefing per day
- Max 20 suggestions per day
- Prevent abuse/runaway costs

---

## 11. Future Enhancements (Post-Launch)

### Phase 5+:
- **Voice interface**: Talk to AI assistant
- **Email integration**: "Forward this email to create a task"
- **Calendar integration**: "Block time for high-priority tasks"
- **Team intelligence**: "Here's how your team is tracking"
- **Learning from outcomes**: "Tasks marked as P1 get done faster"
- **Predictive alerts**: "Based on patterns, you'll miss this deadline"
- **Custom AI agents**: User-configurable assistant behavior

---

## 12. Launch Checklist

### Pre-Launch:
- [ ] All Phase 1 features complete and tested
- [ ] RLS policies reviewed and verified
- [ ] Cost monitoring in place
- [ ] Rate limiting configured
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] User documentation
- [ ] Feedback collection mechanism

### Launch:
- [ ] Beta test with 10-20 users
- [ ] Gather feedback
- [ ] Fix critical issues
- [ ] Gradual rollout (10% → 50% → 100%)

### Post-Launch:
- [ ] Monitor metrics daily
- [ ] Collect user feedback
- [ ] Iterate on prompts
- [ ] Improve suggestion accuracy
- [ ] Build Phase 2 features

---

## 13. Open Questions

1. **Pricing**: Do we charge extra for AI features?
2. **Limits**: How many AI interactions per user per month?
3. **Models**: Start with Sonnet or use Haiku for some tasks?
4. **Caching**: How long to cache suggestions?
5. **Memory**: How much user context to store?

---

## 14. Next Steps

1. **Review this spec** - Ben approves approach
2. **Phase 1 kickoff** - Start building chat foundation
3. **Design mockups** - UI/UX for chat + recommendations
4. **Infrastructure setup** - Database tables, RLS policies
5. **Week 1 target** - Basic chat working locally

---

**Ready to start Phase 1?**
