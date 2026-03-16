# Voice Coach v2 - Revised Product Plan

**Date:** 2026-03-08  
**Based on:** Ben's feedback + feasibility assessment  
**Status:** Ready to build

---

## One-Sentence Definition

**Voice Coach helps the user talk through a messy situation, then turns that into a clear structured plan and proposed workspace updates inside Zebi.**

---

## What Changed from v1

| v1 (Too Broad) | v2 (Focused) |
|----------------|--------------|
| "Business coaching conversation" | Guided planning workflow |
| 5-10 questions per session | 1 opening + max 4 follow-ups |
| Conversational back-and-forth | Structured extraction → review → confirm |
| Support all entity types | Goal + objectives + projects + tasks only |
| "Coach asks smart questions" | "Turn messy speech into clear plan" |
| Long paragraph summaries | Structured result cards |
| Silently create entities | Always show preview + require confirmation |

**Result:** Simpler to build, faster to use, easier to trust.

---

## Core Product Principles

### 1. Do not become a chatbot
Users want help planning, not a conversation. Keep it short and structured.

### 2. Always show before applying
Never create/update anything important without explicit user confirmation.

### 3. Make uncertainty visible
Say when you're unsure about dates, entity matches, or structure.

### 4. Keep the entry point simple
One button: "Voice Coach" or "Talk it through" — system decides what to create.

### 5. Show clear outcomes
Display exactly what was created: "1 goal, 3 objectives, 2 projects, 5 tasks added"

---

## MVP Scope (v1)

### What's Included ✅

**Single use case: Goal and plan creation**

User can:
- Open Voice Coach
- Speak naturally about what they want to achieve (30-90 seconds)
- Answer 2-4 smart follow-up questions
- Review structured proposal:
  - Goal (name, description, success criteria, target date)
  - Suggested objectives (3-5 items)
  - Suggested projects (2-4 items)
  - First tasks (5-10 items)
  - Blockers/risks noted
- Edit any field before creating
- Confirm and create all entities in one action
- See immediate result in Goals/Objectives/Projects views

**That's it. Nothing else in v1.**

---

### What's NOT Included ❌

- Companies (future)
- Documents (future)
- Updating existing entities (future)
- Assigning tasks to team members (future)
- Moving deadlines on existing work (future)
- Multi-entity updates (future)
- Long conversational coaching (too slow)
- Silent/automatic changes (trust killer)

---

## User Workflow (Step by Step)

### Step 1: Entry Point

User taps **"Voice Coach"** button (located in header or dashboard).

**Alternative labels:**
- "Talk it through"
- "Plan via voice"
- "Speak your plan"

**Ben's preference?** → Pick one clear label.

---

### Step 2: Opening Question

Modal opens with voice interface.

**Coach asks:**
> "What are you trying to achieve? Speak naturally — I'll structure it."

**Alternative openings:**
- "Talk me through what needs to happen."
- "What are you working towards?"
- "What's the plan?"

**Keep it short.** One sentence. No fluff.

---

### Step 3: User Speaks (30-90 seconds)

User talks naturally. Examples:

> "I want to get Love Warranty ready for US expansion. We need regulatory compliance sorted, payment processing set up for US customers, and the Delaware entity incorporated. Target is end of May because that's when my L1A visa decision comes. Main risk is the regulatory stuff might take longer than expected."

> "I need to launch Taskbox's new pricing tiers. Build the upgrade flow, update the landing page, set up Stripe subscriptions, and do a soft launch to existing users. Want to ship by end of March."

**System shows:**
- Live transcript (real-time text appearing as they speak)
- Duration timer (e.g., "0:42")
- [Stop] button

---

### Step 4: Follow-Up Questions (2-4 max)

System analyzes transcript and asks **only the most useful clarifying questions**.

**Question selection logic:**

| Missing Info | Question to Ask |
|--------------|-----------------|
| No timeline mentioned | "What's your target date?" |
| No success metric | "How will you know you've succeeded?" |
| Vague/unclear goal | "What's the most important part of this?" |
| No risks mentioned | "What could go wrong or slow you down?" |
| Multiple possible objectives | "Which of these is highest priority?" |

**Maximum 4 questions.** If info is complete, skip to Step 5 immediately.

**Question format:**
- Short (one sentence)
- Practical (not philosophical)
- Answerable in 10-20 seconds

**User can:**
- Answer via voice (tap to respond)
- Type answer
- Skip question

---

### Step 5: Structured Proposal

System shows what it understood and what it will create.

**Layout: Result Cards**

```
┌─────────────────────────────────────────────────────┐
│ Here's what I understood                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 🎯 GOAL TO CREATE                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Love Warranty US Market Entry                   │ │
│ │                                                 │ │
│ │ Complete regulatory compliance, payment         │ │
│ │ processing, and entity setup to launch Love     │ │
│ │ Warranty in the US market by May 2026.          │ │
│ │                                                 │ │
│ │ Success: Fully compliant US operations ready   │ │
│ │ Target: May 31, 2026                           │ │
│ │ [Edit]                                          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 📋 OBJECTIVES (3)                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. ⚠️ Complete US regulatory compliance         │ │
│ │    → High priority, blocker identified          │ │
│ │    → Target: Apr 30, 2026                       │ │
│ │                                                 │ │
│ │ 2. Setup US payment processing                  │ │
│ │    → Target: Apr 15, 2026                       │ │
│ │                                                 │ │
│ │ 3. Incorporate Delaware entity                  │ │
│ │    → Target: Apr 1, 2026                        │ │
│ │ [Edit]                                          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 🗂️ PROJECTS (2)                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ • US Compliance & Regulatory Setup              │ │
│ │ • US Payment & Billing Infrastructure           │ │
│ │ [Edit]                                          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ✅ FIRST TASKS (5)                                  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Research US warranty compliance requirements │ │
│ │ 2. Engage US compliance consultant              │ │
│ │ 3. Setup Stripe US account                      │ │
│ │ 4. File Delaware incorporation paperwork        │ │
│ │ 5. Document regulatory requirements checklist   │ │
│ │ [Edit]                                          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ⚠️ BLOCKERS & RISKS                                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ • Regulatory timeline uncertain                 │ │
│ │ • May take longer than 2 months                 │ │
│ │ [Edit]                                          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ❓ NEEDS CLARIFICATION                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ • You mentioned "end of May" — is that May 31?  │ │
│ │ • Should I link this to your existing Love      │ │
│ │   Warranty company?                             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Edit Full Structure] [Confirm & Create]            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key features:**
- ✅ Grouped by type (Goal, Objectives, Projects, Tasks, Blockers)
- ✅ Shows priorities and flags (high priority, blocker, uncertain)
- ✅ Displays target dates
- ✅ Makes uncertainty visible ("I wasn't sure about...")
- ✅ Every section has [Edit] button
- ✅ Clear action buttons at bottom

---

### Step 6: User Edits (Optional)

User can:
- Edit any field inline
- Remove suggested items
- Add new items manually
- Clarify uncertain items
- Adjust dates/priorities

**All edits happen in the preview.** Nothing is saved yet.

---

### Step 7: Confirm & Create

User clicks **"Confirm & Create"**.

System:
1. Creates goal in database
2. Creates objectives (linked to goal)
3. Creates projects (linked to objectives)
4. Creates tasks (linked to projects)
5. Saves blockers as notes
6. Shows success message

**Success screen:**
```
┌─────────────────────────────────────────┐
│ ✓ Plan Created                          │
├─────────────────────────────────────────┤
│                                         │
│ Created:                                │
│ • 1 goal                                │
│ • 3 objectives                          │
│ • 2 projects                            │
│ • 5 tasks                               │
│                                         │
│ [View Goal] [Go to Dashboard]           │
│                                         │
└─────────────────────────────────────────┘
```

User is redirected to the newly created goal page.

**Dashboard is automatically refreshed** to show new objectives, projects, tasks.

---

## Conversation Tone & Style

### Voice Personality

**Sound like:** Chief of staff, operator, practical assistant  
**Don't sound like:** Therapist, motivational coach, generic chatbot

**Good examples:**
- "What's your target date?"
- "What could slow you down?"
- "Which part is highest priority?"
- "Here's what I understood — does this look right?"

**Bad examples:**
- "That's amazing! Tell me more about your vision."
- "What does success mean to you personally?"
- "Let's explore your deeper motivations."
- "I'm here to help you on your journey!"

**Keep responses short:** 1 sentence. No filler.

---

### Follow-Up Question Bank

**Pre-built questions by scenario:**

**No timeline:**
- "What's your target date?"
- "When does this need to be done?"

**No success metric:**
- "How will you know you've succeeded?"
- "What does done look like?"

**Vague goal:**
- "What's the most important part?"
- "What are you trying to fix or achieve?"

**No risks mentioned:**
- "What could slow you down?"
- "What's the biggest risk?"

**Multiple threads:**
- "Which of these is highest priority?"
- "What should happen first?"

**Missing owner/team:**
- "Who's working on this?"
- "Are you doing this alone or with a team?"

---

## AI Prompt Engineering

### System Prompt (GPT-4)

```
You are a practical planning assistant for Zebi, a work management tool.

Your job: Help the user turn spoken thoughts into a structured plan.

Rules:
1. Keep responses short (1 sentence)
2. Sound like a chief of staff, not a therapist
3. Ask only the most useful clarifying questions (max 4)
4. Focus on: timeline, success criteria, priorities, risks
5. Do not ask motivational or philosophical questions
6. Extract concrete actions, not vague goals

Context about the user:
- Name: Ben Brown
- Founder, building multiple businesses
- Values: Speed, clarity, systems-first thinking
- Dislikes: Hype, vague plans, complexity

Output format:
After gathering info, structure the result as JSON:
{
  "goal": {
    "name": "...",
    "description": "...",
    "successCriteria": "...",
    "targetDate": "YYYY-MM-DD"
  },
  "objectives": [
    {
      "title": "...",
      "priority": "high|medium|low",
      "targetDate": "YYYY-MM-DD"
    }
  ],
  "projects": [...],
  "tasks": [...],
  "blockers": [...],
  "uncertainties": [...]
}
```

---

### Follow-Up Question Prompt

```
User said: "{transcript}"

Existing info: {current_context}

Identify the most important missing information.

Choose up to 4 questions from:
- "What's your target date?"
- "How will you know you've succeeded?"
- "What's the most important part?"
- "What could slow you down?"
- "Which of these is highest priority?"
- "Who's working on this with you?"

Return questions in order of importance.
If all key info is present, return empty array (skip to synthesis).

Output: ["question 1", "question 2", ...]
```

---

### Structuring Prompt

```
User planning session transcript:
"{full_conversation}"

Extract structured plan:

Goal:
- Name: Clear, concise title (max 60 chars)
- Description: 2-3 sentences, actionable
- Success criteria: Measurable outcome
- Target date: YYYY-MM-DD (or null if not specified)

Objectives (3-5):
- Break the goal into key milestones
- Each objective should be a clear deliverable
- Prioritize based on dependencies and deadlines
- Add target dates if possible

Projects (2-4):
- Group related work into projects
- Link to relevant objectives
- Keep project names clear and action-oriented

First Tasks (5-10):
- Extract concrete next actions
- Prioritize by dependency and urgency
- Link to appropriate projects
- Keep tasks small and actionable

Blockers & Risks:
- Extract mentioned risks
- Flag dependencies or unknowns
- Note anything that could delay progress

Uncertainties:
- List anything you're not confident about
- Flag vague dates ("soon", "next week")
- Note ambiguous entity references
- Identify missing critical information

Return as JSON.
```

---

## Technical Implementation

### API Routes

#### 1. `/api/voice-coach/session` (POST)
**Purpose:** Create coaching session

**Input:**
```json
{
  "sessionType": "goal_planning"
}
```

**Output:**
```json
{
  "sessionId": "session_abc123",
  "openingQuestion": "What are you trying to achieve?"
}
```

---

#### 2. `/api/voice-coach/transcribe` (POST)
**Purpose:** Transcribe audio chunk

**Input:**
- `sessionId`: string
- `audio`: File (audio blob)

**Output:**
```json
{
  "success": true,
  "transcript": "I want to launch...",
  "duration": 45.2
}
```

---

#### 3. `/api/voice-coach/followup` (POST)
**Purpose:** Get next follow-up questions

**Input:**
```json
{
  "sessionId": "session_abc123",
  "transcript": "Full conversation so far..."
}
```

**Output:**
```json
{
  "questions": [
    "What's your target date?",
    "What could slow you down?"
  ],
  "skipToSynthesis": false
}
```

If `skipToSynthesis: true`, move directly to structuring (all info gathered).

---

#### 4. `/api/voice-coach/structure` (POST)
**Purpose:** Generate structured proposal

**Input:**
```json
{
  "sessionId": "session_abc123",
  "fullConversation": "..."
}
```

**Output:**
```json
{
  "success": true,
  "proposal": {
    "goal": {
      "name": "Love Warranty US Market Entry",
      "description": "...",
      "successCriteria": "...",
      "targetDate": "2026-05-31"
    },
    "objectives": [...],
    "projects": [...],
    "tasks": [...],
    "blockers": [...],
    "uncertainties": [
      "You mentioned 'end of May' — is that May 31?",
      "Should I link this to your existing Love Warranty company?"
    ]
  }
}
```

---

#### 5. `/api/voice-coach/create` (POST)
**Purpose:** Create entities in database

**Input:**
```json
{
  "sessionId": "session_abc123",
  "proposal": {
    "goal": {...},
    "objectives": [...],
    "projects": [...],
    "tasks": [...]
  }
}
```

**Process:**
1. Create goal
2. Create objectives (linked to goal)
3. Create projects (linked to objectives)
4. Create tasks (linked to projects)
5. Add blockers as notes
6. Return created entities

**Output:**
```json
{
  "success": true,
  "created": {
    "goalId": "goal_abc",
    "objectiveIds": ["obj_1", "obj_2", "obj_3"],
    "projectIds": ["proj_1", "proj_2"],
    "taskIds": ["task_1", "task_2", ...]
  },
  "summary": {
    "goals": 1,
    "objectives": 3,
    "projects": 2,
    "tasks": 5
  }
}
```

---

### UI Components

#### 1. `VoiceCoachModal.tsx`
Main modal component.

**Props:**
```typescript
interface VoiceCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (goalId: string) => void;
}
```

**States:**
- `idle` - Initial state
- `opening` - Showing opening question
- `recording` - User speaking
- `transcribing` - Processing audio
- `followup` - Asking follow-up questions
- `structuring` - Generating proposal
- `reviewing` - User reviewing proposal
- `creating` - Saving to database
- `success` - Confirmation screen

---

#### 2. `VoiceRecorder.tsx`
Audio recording component (reuse from brain dump).

**Features:**
- Visual waveform (optional)
- Duration timer
- [Stop] button
- Real-time transcript display

---

#### 3. `ProposalReview.tsx`
Structured result cards display.

**Sections:**
- Goal card (editable)
- Objectives list (editable)
- Projects list (editable)
- Tasks list (editable)
- Blockers/risks (editable)
- Uncertainties (shows AI's questions)

**Each section has [Edit] button** that opens inline editor.

---

#### 4. `ProposalEditor.tsx`
Inline editing for proposal sections.

**Goal editor:**
- Name (text input)
- Description (textarea)
- Success criteria (textarea)
- Target date (date picker)

**Objective editor:**
- Title (text input)
- Priority (select)
- Target date (date picker)
- [Remove] button

**Tasks editor:**
- Task list with checkboxes
- Add new task
- Reorder tasks
- Remove tasks

---

### Database Schema

**No new tables needed.**

Use existing:
- `Goal`
- `Objective`
- `Project`
- `Task`

**Optional: Track sessions for debugging**

```prisma
model VoiceCoachSession {
  id                String   @id @default(cuid())
  workspaceId       String
  userId            String
  conversationJson  Json     // Full transcript + questions + answers
  proposalJson      Json     // Generated proposal
  createdEntities   Json     // IDs of created goal/objectives/projects/tasks
  status            String   // "completed" | "abandoned"
  createdAt         DateTime @default(now())
  completedAt       DateTime?
}
```

---

## Cost Analysis

### Per Session (Updated)

| Item | Cost |
|------|------|
| Whisper (90s audio) | £0.009 |
| GPT-4 follow-up questions (500 tokens) | £0.01 |
| GPT-4 structuring (2000 tokens) | £0.04 |
| Database operations | £0 |
| **Total** | **~£0.06** |

**At scale:**
- 1,000 sessions/month = £60
- 10,000 sessions/month = £600

**Still extremely affordable.**

---

## Development Timeline

### Week 1: Core Flow
- [ ] Create VoiceCoachModal component
- [ ] Integrate voice recording (reuse brain dump)
- [ ] Build transcription flow
- [ ] Wire up opening question
- [ ] Test: Record → Transcribe → Display

**Milestone:** Can record and see transcript

---

### Week 2: AI Integration
- [ ] Write system prompts (opening, follow-up, structuring)
- [ ] Build `/api/voice-coach/followup` route
- [ ] Build `/api/voice-coach/structure` route
- [ ] Test follow-up question logic
- [ ] Test proposal generation

**Milestone:** Can complete full conversation and see structured proposal

---

### Week 3: Review & Create
- [ ] Build ProposalReview component (result cards)
- [ ] Build inline editors for each section
- [ ] Build `/api/voice-coach/create` route
- [ ] Wire up database creation
- [ ] Test: Review → Edit → Create → See in workspace

**Milestone:** Can create real goals/objectives/projects/tasks

---

### Week 4: Polish & Launch
- [ ] Error handling (failed transcription, API errors)
- [ ] Loading states and progress indicators
- [ ] Success animations
- [ ] Beta test with 5 users
- [ ] Iterate based on feedback
- [ ] Deploy to production

**Milestone:** Shipped and available to all users

---

## Success Metrics (First Month)

| Metric | Target |
|--------|--------|
| Adoption | 20% of new goals created via Voice Coach |
| Completion | 80% of started sessions finish successfully |
| Edit rate | <30% of proposals need major edits |
| User satisfaction | 8/10 average rating |
| Time saved | 5+ minutes per session vs manual form |

---

## Acceptance Criteria

**v1 is ready to ship when:**

1. ✅ User can open Voice Coach from dashboard/header
2. ✅ User can record spoken planning session
3. ✅ System can transcribe accurately (>90% accuracy)
4. ✅ System asks 2-4 smart follow-up questions
5. ✅ System generates structured proposal (goal + objectives + projects + tasks)
6. ✅ Proposal is displayed as clear result cards
7. ✅ User can edit any field before creating
8. ✅ Uncertainties are clearly flagged
9. ✅ User can confirm and create all entities
10. ✅ Created entities appear in Goals/Objectives/Projects views
11. ✅ Success message shows count of created items
12. ✅ Error handling works (failed transcription, API errors)

**When all 12 criteria pass → ship it.**

---

## What We Learned from v1 Feedback

### ✅ Keep
- Voice as input method (natural and fast)
- AI structuring (removes blank page problem)
- Review before creating (trust)

### ❌ Remove
- Long conversational coaching (too slow)
- Support for all entity types (too complex)
- Silent/automatic updates (trust killer)
- Motivational coaching tone (not practical)

### 🔄 Change
- Fewer questions (1 + max 4, not 10)
- Structured result cards (not paragraph summaries)
- Single entry point (not multiple "Create X via Coach" buttons)
- Practical tone (chief of staff, not therapist)

---

## Next Steps

**Immediate (Today):**
1. Get Ben's approval on this revised plan
2. Create GitHub issue/task for Voice Coach v1
3. Start Week 1 development

**This Week:**
- Build core recording + transcription flow
- Write system prompts
- Test with Ben (10+ sessions)

**Next Week:**
- Build proposal review UI
- Wire up database creation
- Internal testing

**Week 3:**
- Beta test with 5 users
- Iterate based on feedback

**Week 4:**
- Launch to all Zebi users
- Create demo video
- Announce feature

---

## Final Recommendation

**This is the right product.**

It's:
- ✅ Focused (goal planning only, not everything)
- ✅ Fast (90 seconds vs 10 minutes)
- ✅ Trustworthy (always show before applying)
- ✅ Practical (operator tone, not fluffy)
- ✅ Simple to build (4 weeks)
- ✅ Low cost (£0.06/session)
- ✅ High value (removes blank page problem)
- ✅ Commercially unique (no competitor offers this)

**Build it.**
