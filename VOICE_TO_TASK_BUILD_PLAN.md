# Voice-to-Task Breakdown - Build Plan

**Feature:** Voice-first task planning for Zebi  
**Scope:** Narrow, focused task extraction workflow (NOT full Brain Dump)  
**Timeline:** 2 weeks (10 working days)  
**Priority:** High-value feature for daily use

---

## Build Philosophy

**Core principle:** Faster than typing, review before create, keep user in control

**Quality over automation:** Better 6 strong tasks than 18 weak ones

**Separate from Brain Dump:** This is a focused task-generation pipeline, not workspace updates

---

## Technical Architecture

### Stack Decisions

**Audio Capture:**
- Web Audio API (browser native)
- MediaRecorder API
- Format: WebM/Opus or MP4/AAC (browser-dependent)

**Transcription:**
- OpenAI Whisper API (proven, accurate, cost-effective)
- Fallback: Deepgram or AssemblyAI if needed

**Task Extraction:**
- OpenAI GPT-4o-mini (structured outputs, fast, cheap)
- Use JSON schema validation for structured task candidates

**Storage:**
- Supabase Storage for audio files (temporary retention)
- Postgres tables for sessions, candidates, results

**UI Components:**
- HeroUI + custom components
- Match existing Zebi design system
- Font Awesome Pro duotone icons

---

## Data Model

### New Tables

#### `task_generation_sessions`
```sql
CREATE TABLE task_generation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  
  -- Context
  context_type TEXT NOT NULL CHECK (context_type IN ('project', 'objective', 'company', 'general')),
  context_id UUID, -- nullable for general context
  
  -- Audio & Transcript
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  transcript_raw TEXT,
  transcript_clean TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'ready_for_review', 'applied', 'cancelled', 'failed')),
  error_message TEXT,
  
  -- Results
  generated_task_count INTEGER DEFAULT 0,
  created_task_count INTEGER DEFAULT 0,
  skipped_task_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ
);

CREATE INDEX idx_task_gen_sessions_workspace ON task_generation_sessions(workspace_id);
CREATE INDEX idx_task_gen_sessions_user ON task_generation_sessions(user_id);
CREATE INDEX idx_task_gen_sessions_status ON task_generation_sessions(status);
```

#### `generated_task_candidates`
```sql
CREATE TABLE generated_task_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_generation_session_id UUID NOT NULL REFERENCES task_generation_sessions(id) ON DELETE CASCADE,
  
  -- Task Content
  title TEXT NOT NULL,
  description TEXT,
  
  -- Metadata
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  duplicate_status TEXT DEFAULT 'none' CHECK (duplicate_status IN ('none', 'possible_existing', 'possible_generated')),
  duplicate_reference_id UUID, -- task_id or other candidate_id
  
  -- User Edits
  selected BOOLEAN DEFAULT true,
  sort_order INTEGER NOT NULL,
  
  -- Extraction Context
  source_text_fragment TEXT,
  
  -- Optional Extracted Metadata (if spoken)
  suggested_assignee_id UUID,
  suggested_due_date DATE,
  suggested_priority INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gen_task_candidates_session ON generated_task_candidates(task_generation_session_id);
CREATE INDEX idx_gen_task_candidates_selected ON generated_task_candidates(selected);
```

#### `task_generation_results`
```sql
CREATE TABLE task_generation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_generation_session_id UUID NOT NULL REFERENCES task_generation_sessions(id) ON DELETE CASCADE,
  
  created_task_ids UUID[] DEFAULT '{}',
  skipped_candidate_ids UUID[] DEFAULT '{}',
  
  result_summary JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_gen_results_session ON task_generation_results(task_generation_session_id);
```

### RLS Policies

All tables need workspace isolation:

```sql
-- task_generation_sessions
CREATE POLICY "Users can manage their workspace sessions"
  ON task_generation_sessions
  FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id));

-- generated_task_candidates
CREATE POLICY "Users can manage candidates in their sessions"
  ON generated_task_candidates
  FOR ALL
  USING (
    task_generation_session_id IN (
      SELECT id FROM task_generation_sessions 
      WHERE workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id)
    )
  );

-- task_generation_results
CREATE POLICY "Users can view results in their sessions"
  ON task_generation_results
  FOR SELECT
  USING (
    task_generation_session_id IN (
      SELECT id FROM task_generation_sessions 
      WHERE workspace_id IN (SELECT id FROM workspaces WHERE id = workspace_id)
    )
  );
```

---

## API Routes

### POST `/api/task-generation/sessions`
**Purpose:** Create new session, return session ID

**Request:**
```json
{
  "contextType": "project",
  "contextId": "proj_123"
}
```

**Response:**
```json
{
  "sessionId": "tgs_001",
  "status": "recording"
}
```

---

### POST `/api/task-generation/sessions/:id/audio`
**Purpose:** Upload audio file, trigger transcription + processing

**Request:** FormData with audio blob

**Response:**
```json
{
  "sessionId": "tgs_001",
  "status": "processing",
  "audioDurationSeconds": 45
}
```

**Background Processing:**
1. Save audio to Supabase Storage
2. Send to Whisper API for transcription
3. Extract task candidates from transcript
4. Generate descriptions
5. Detect duplicates
6. Update session status to `ready_for_review`

---

### GET `/api/task-generation/sessions/:id/review`
**Purpose:** Get review payload with editable candidates

**Response:**
```json
{
  "sessionId": "tgs_001",
  "status": "ready_for_review",
  "context": {
    "type": "project",
    "id": "proj_123",
    "name": "Dashboard Redesign"
  },
  "transcriptSummary": "User described tasks for homepage, mobile layout, pricing section, screenshots, signup flow.",
  "candidates": [
    {
      "id": "cand_1",
      "title": "Finalise homepage copy",
      "description": "Review and update the landing page wording.",
      "selected": true,
      "duplicateStatus": "none",
      "confidence": 0.94,
      "sortOrder": 0
    },
    {
      "id": "cand_2",
      "title": "Finish mobile layout",
      "description": "Make sure the design works cleanly on mobile sizes.",
      "selected": true,
      "duplicateStatus": "possible_existing",
      "duplicateReference": {
        "taskId": "task_12",
        "title": "Review mobile layout"
      },
      "confidence": 0.88,
      "sortOrder": 1
    }
  ]
}
```

---

### PATCH `/api/task-generation/sessions/:id/candidates`
**Purpose:** Update candidate edits (title, description, selected, sortOrder)

**Request:**
```json
{
  "updates": [
    {
      "id": "cand_1",
      "title": "Write final homepage copy",
      "description": "Complete the landing page content.",
      "selected": true
    },
    {
      "id": "cand_2",
      "selected": false
    }
  ]
}
```

**Response:**
```json
{
  "updated": 2
}
```

---

### POST `/api/task-generation/sessions/:id/candidates`
**Purpose:** Add manual candidate during review

**Request:**
```json
{
  "title": "Review pricing section",
  "description": "Check the pricing table is accurate.",
  "sortOrder": 5
}
```

**Response:**
```json
{
  "candidate": {
    "id": "cand_new",
    "title": "Review pricing section",
    "description": "Check the pricing table is accurate.",
    "selected": true,
    "sortOrder": 5
  }
}
```

---

### POST `/api/task-generation/sessions/:id/create`
**Purpose:** Create selected tasks in target context

**Request:**
```json
{
  "candidateIds": ["cand_1", "cand_3", "cand_5"]
}
```

**Response:**
```json
{
  "success": true,
  "created": 3,
  "skipped": 0,
  "taskIds": ["task_201", "task_202", "task_203"],
  "context": {
    "type": "project",
    "id": "proj_123",
    "name": "Dashboard Redesign"
  }
}
```

**Processing:**
1. Validate session status = `ready_for_review`
2. Validate user has access to target context
3. Fetch selected candidates
4. Create tasks with context links
5. Update session status = `applied`
6. Create result record
7. Return summary

---

### DELETE `/api/task-generation/sessions/:id`
**Purpose:** Cancel/delete session

**Response:**
```json
{
  "success": true
}
```

---

## AI Prompt Design

### Task Extraction Prompt

```text
You are a task extraction assistant for a work planning app called Zebi.

Your job is to convert spoken dictation into a clean list of actionable tasks.

RULES:
1. Extract only clear, actionable tasks
2. Keep task titles short and specific (ideally 3-8 words)
3. Start titles with action verbs where possible
4. Write one short description per task (one sentence, <120 chars)
5. Do NOT invent assignees, due dates, or priorities unless explicitly stated
6. If something is vague or unclear, omit it rather than creating a weak task
7. Merge near-duplicate tasks
8. Avoid filler words like "work on", "deal with", "sort out"
9. Maximum 12 tasks per dictation (merge or prioritize if more)

OUTPUT FORMAT:
Return a JSON array of task objects with this exact structure:

[
  {
    "title": "Finalise homepage copy",
    "description": "Review and update the landing page wording.",
    "confidence": 0.94,
    "sourceFragment": "finish the homepage copy"
  }
]

TRANSCRIPT:
{transcript}

CONTEXT:
User is planning work for: {contextType} "{contextName}"

Extract the tasks now.
```

### Duplicate Detection Prompt (Optional Enhancement)

```text
Compare the following generated task against existing tasks in this context.

GENERATED TASK:
Title: {newTaskTitle}
Description: {newTaskDescription}

EXISTING TASKS:
{existingTasksList}

Return JSON:
{
  "isDuplicate": true/false,
  "matchedTaskId": "task_123" or null,
  "matchedTaskTitle": "..." or null,
  "similarity": 0.0-1.0
}
```

---

## UI Components

### 1. Entry Points

**Locations:**
- Project detail page (header actions)
- Objective detail page (header actions)
- Company detail page (header actions)
- Tasks page (header actions for general planning)

**Button:**
```tsx
<Button
  startContent={<FontAwesomeIcon icon={faMicrophone} />}
  color="primary"
  variant="flat"
  onPress={() => startVoiceToTask()}
>
  Dictate Tasks
</Button>
```

---

### 2. Capture Screen

**File:** `components/voice-to-task/CaptureScreen.tsx`

**Features:**
- Clean minimal UI
- Record button (large, centered)
- Recording timer
- Waveform or pulse indicator
- Stop button
- Guidance text

**State Management:**
- Recording state (idle, recording, stopped)
- Timer
- Audio blob

**Example UI:**

```
┌─────────────────────────────────────┐
│                                     │
│   Talk through everything that      │
│   needs to be done. I'll turn it    │
│   into a task list for you to       │
│   review.                           │
│                                     │
│         ┌───────────────┐           │
│         │   ⏺ Record    │           │
│         └───────────────┘           │
│                                     │
│         [Recording: 00:45]          │
│                                     │
│         ┌───────────────┐           │
│         │   ⏹ Stop      │           │
│         └───────────────┘           │
│                                     │
└─────────────────────────────────────┘
```

---

### 3. Processing Screen

**File:** `components/voice-to-task/ProcessingScreen.tsx`

**Features:**
- Simple loading state
- Step-by-step progress indicators
- Cancel button (if safe)

**Steps:**
1. Transcribing your dictation...
2. Extracting tasks...
3. Generating descriptions...
4. Preparing review list...

---

### 4. Review Screen (MOST IMPORTANT)

**File:** `components/voice-to-task/ReviewScreen.tsx`

**Features:**
- List of editable candidate tasks
- Checkbox per task
- Inline editing (title, description)
- Remove button per task
- Duplicate warnings
- Add manual task button
- Create All / Create Selected buttons
- Cancel button

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Review Tasks                                     [×]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Creating tasks in Project: Dashboard Redesign          │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☑ Finalise homepage copy                           │ │
│ │   Review and update the landing page wording.      │ │
│ │                                            [Remove] │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☑ Finish mobile layout                        ⚠️   │ │
│ │   Make sure the design works on mobile sizes.      │ │
│ │   Similar task: "Review mobile layout"             │ │
│ │                                            [Remove] │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☐ Get feedback from Matt                           │ │
│ │   Share latest version and collect comments.       │ │
│ │                                            [Remove] │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [+ Add Task Manually]                                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│              [Cancel]  [Create Selected (2)]           │
└─────────────────────────────────────────────────────────┘
```

**State Management:**
- Candidates array
- Edits tracking
- Selection state
- Validation

**Key UX:**
- All tasks visible at once (no pagination/chat flow)
- Inline editing without modal-on-modal
- Clear duplicate warnings
- Selected count in button

---

### 5. Result Screen

**File:** `components/voice-to-task/ResultScreen.tsx`

**Features:**
- Success confirmation
- Created task count
- Context name
- View tasks button

**Example:**

```
┌─────────────────────────────────────┐
│          ✅                         │
│                                     │
│   8 tasks created in                │
│   Dashboard Redesign                │
│                                     │
│   ┌────────────────────┐            │
│   │  View Tasks        │            │
│   └────────────────────┘            │
│                                     │
│   ┌────────────────────┐            │
│   │  Done              │            │
│   └────────────────────┘            │
│                                     │
└─────────────────────────────────────┘
```

---

## Service Layer

### File: `lib/voice-to-task/session-service.ts`

**Functions:**

```typescript
export async function createSession(
  workspaceId: string,
  userId: string,
  contextType: 'project' | 'objective' | 'company' | 'general',
  contextId?: string
): Promise<TaskGenerationSession>

export async function uploadAudio(
  sessionId: string,
  audioBlob: Blob
): Promise<{ audioUrl: string; durationSeconds: number }>

export async function processSession(
  sessionId: string
): Promise<void>

export async function getSessionReview(
  sessionId: string
): Promise<SessionReviewPayload>

export async function updateCandidates(
  sessionId: string,
  updates: CandidateUpdate[]
): Promise<void>

export async function addManualCandidate(
  sessionId: string,
  title: string,
  description: string
): Promise<GeneratedTaskCandidate>

export async function createTasksFromSession(
  sessionId: string,
  candidateIds: string[]
): Promise<TaskCreationResult>

export async function cancelSession(
  sessionId: string
): Promise<void>
```

---

### File: `lib/voice-to-task/transcription-service.ts`

**Functions:**

```typescript
export async function transcribeAudio(
  audioUrl: string
): Promise<{ transcript: string; duration: number }>
```

**Implementation:**
- Use OpenAI Whisper API
- Download audio from Supabase Storage
- Upload to Whisper
- Return cleaned transcript

---

### File: `lib/voice-to-task/extraction-service.ts`

**Functions:**

```typescript
export async function extractTasksFromTranscript(
  transcript: string,
  contextType: string,
  contextName: string
): Promise<TaskCandidate[]>

export async function generateDescriptions(
  candidates: TaskCandidate[]
): Promise<TaskCandidate[]>

export async function detectDuplicates(
  candidates: TaskCandidate[],
  existingTasks: Task[]
): Promise<TaskCandidate[]>
```

**Implementation:**
- Use OpenAI GPT-4o-mini with JSON schema
- Validate outputs
- Normalize titles
- Simple fuzzy matching for duplicates

---

## Build Phases

### Phase 1: Foundation (Days 1-2)
**Goal:** Database, API scaffolding, basic session flow

**Tasks:**
- [ ] Create migration for 3 new tables
- [ ] Add RLS policies
- [ ] Create `/api/task-generation/sessions` (POST)
- [ ] Create session service layer
- [ ] Test session creation

**Deliverable:** Can create session and store in DB

---

### Phase 2: Audio Capture (Days 3-4)
**Goal:** Record audio in browser, upload to Supabase Storage

**Tasks:**
- [ ] Build `CaptureScreen.tsx` component
- [ ] Implement MediaRecorder API
- [ ] Handle audio blob creation
- [ ] Create `/api/task-generation/sessions/:id/audio` (POST)
- [ ] Upload audio to Supabase Storage
- [ ] Test recording flow end-to-end

**Deliverable:** Can record audio and upload successfully

---

### Phase 3: Transcription & Extraction (Days 5-6)
**Goal:** Convert audio to tasks

**Tasks:**
- [ ] Create `transcription-service.ts`
- [ ] Integrate OpenAI Whisper API
- [ ] Create `extraction-service.ts`
- [ ] Design task extraction prompt
- [ ] Implement structured JSON output
- [ ] Test transcription + extraction pipeline
- [ ] Create `ProcessingScreen.tsx`

**Deliverable:** Audio → transcript → task candidates

---

### Phase 4: Review Interface (Days 7-8)
**Goal:** Build the most important screen - editable review list

**Tasks:**
- [ ] Build `ReviewScreen.tsx`
- [ ] Implement candidate list with checkboxes
- [ ] Add inline editing (title, description)
- [ ] Add remove functionality
- [ ] Add manual task addition
- [ ] Create `/api/task-generation/sessions/:id/review` (GET)
- [ ] Create `/api/task-generation/sessions/:id/candidates` (PATCH, POST)
- [ ] Test all editing actions

**Deliverable:** Full review interface working

---

### Phase 5: Task Creation (Day 9)
**Goal:** Create tasks from approved candidates

**Tasks:**
- [ ] Create `/api/task-generation/sessions/:id/create` (POST)
- [ ] Implement context validation
- [ ] Link tasks to project/objective/company
- [ ] Handle bulk task creation
- [ ] Update session status
- [ ] Create result record
- [ ] Build `ResultScreen.tsx`
- [ ] Test end-to-end flow

**Deliverable:** Can create tasks successfully

---

### Phase 6: Duplicate Detection & Polish (Day 10)
**Goal:** Add duplicate warnings, improve quality

**Tasks:**
- [ ] Implement duplicate detection logic
- [ ] Add duplicate warnings to review UI
- [ ] Add entry points to all context pages
- [ ] Test with various dictation samples
- [ ] Fix edge cases
- [ ] Add error handling
- [ ] Add loading states
- [ ] Polish UI details

**Deliverable:** Feature complete and polished

---

## Entry Point Integration

### Projects Page
**File:** `app/projects/[id]/page.tsx` or `client.tsx`

Add button to header actions:

```tsx
<Button
  startContent={<FontAwesomeIcon icon={faMicrophone} />}
  color="primary"
  variant="flat"
  onPress={() => router.push(`/voice-to-task?context=project&id=${project.id}`)}
>
  Dictate Tasks
</Button>
```

### Objectives Page
**File:** `app/objectives/[id]/page.tsx` or `client.tsx`

Same pattern, `context=objective`

### Companies Page
**File:** `app/companies/[id]/page.tsx` or `client.tsx`

Same pattern, `context=company`

### Tasks Page (General)
**File:** `app/tasks/page.tsx` or `client.tsx`

No context ID, `context=general`

---

## Page Route

### File: `app/voice-to-task/page.tsx`

**Features:**
- Read `context` and `id` from query params
- Multi-step flow (capture → processing → review → result)
- State management for session
- Modal or full-page (recommend modal for better UX)

**Flow:**
1. User clicks "Dictate Tasks" from any entry point
2. Opens voice-to-task modal/page
3. Shows capture screen
4. User records
5. Shows processing screen
6. Shows review screen
7. User edits/confirms
8. Creates tasks
9. Shows result
10. Closes and returns to source page

---

## Error Handling

### Audio Capture Failures
- Microphone permission denied → show clear message
- Recording error → allow retry

### Transcription Failures
- Whisper API error → show error, preserve audio for retry
- Empty transcript → show "No speech detected" message

### Extraction Failures
- No tasks extracted → show "No clear tasks found" message
- Low-quality output → filter weak candidates, show what's usable

### Task Creation Failures
- Context no longer exists → show error
- Permission denied → show error
- Duplicate submission → prevent with loading state

---

## Testing Checklist

### Functional Testing
- [ ] Can create session in all contexts (project/objective/company/general)
- [ ] Can record audio successfully
- [ ] Can transcribe audio accurately
- [ ] Can extract tasks from various dictation styles
- [ ] Can edit task titles inline
- [ ] Can edit descriptions inline
- [ ] Can remove candidates
- [ ] Can add manual candidates
- [ ] Can deselect candidates
- [ ] Can create selected tasks
- [ ] Tasks created in correct context
- [ ] Session status updates correctly
- [ ] Duplicate warnings show when appropriate

### Edge Case Testing
- [ ] Very short dictation (<10 seconds)
- [ ] Very long dictation (>2 minutes)
- [ ] Vague dictation ("just sort everything out")
- [ ] Empty dictation (silence)
- [ ] Many tasks (>12 items spoken)
- [ ] Duplicate tasks within dictation
- [ ] Duplicate tasks vs existing tasks
- [ ] Context deleted mid-flow
- [ ] Network errors during processing
- [ ] Browser refresh during review

### UX Testing
- [ ] Recording UI is clear and calm
- [ ] Processing doesn't feel slow
- [ ] Review list is easy to scan
- [ ] Editing is intuitive
- [ ] Duplicate warnings are helpful, not annoying
- [ ] Result confirmation is satisfying
- [ ] Overall flow feels faster than manual entry

---

## Performance Targets

**Audio Upload:** <2 seconds  
**Transcription:** <5 seconds (for 60s audio)  
**Task Extraction:** <3 seconds  
**Review Screen Load:** <1 second  
**Task Creation:** <2 seconds (for 10 tasks)

**Total flow:** ~15 seconds for typical 60s dictation

---

## Cost Estimates (Per Session)

**Whisper API:**
- $0.006 per minute of audio
- Average 60s dictation = $0.006

**GPT-4o-mini (Task Extraction):**
- ~500 tokens input (transcript + prompt)
- ~300 tokens output (12 tasks)
- ~$0.0002

**Storage:**
- 1MB audio file (temporary, 30 day retention)
- Negligible cost

**Total per session:** ~$0.007 (less than 1 cent)

**At scale:**
- 100 sessions/day = $0.70/day = $21/month
- 1,000 sessions/day = $7/day = $210/month

Very affordable.

---

## Security Checklist

- [ ] RLS policies prevent cross-workspace access
- [ ] Audio files use signed URLs (Supabase Storage)
- [ ] Context validation before task creation
- [ ] User permissions checked for target context
- [ ] Audio files auto-delete after 30 days
- [ ] No PII in transcripts stored unnecessarily
- [ ] Rate limiting on session creation
- [ ] Prevent double-submit on task creation

---

## Telemetry Events

Track these events:

**Session Events:**
- `voice_to_task.session_started` (contextType)
- `voice_to_task.audio_recorded` (durationSeconds)
- `voice_to_task.processing_complete` (candidateCount, processingTimeMs)
- `voice_to_task.review_opened` (candidateCount)
- `voice_to_task.tasks_created` (createdCount, skippedCount, editedCount)
- `voice_to_task.session_cancelled` (stage)

**Error Events:**
- `voice_to_task.error.audio_capture`
- `voice_to_task.error.transcription`
- `voice_to_task.error.extraction`
- `voice_to_task.error.creation`

**Usage Metrics:**
- Average dictation length
- Average candidate count
- Average created count
- Edit rate (% of candidates edited)
- Removal rate (% of candidates removed)
- Duplicate warning rate
- Time to review
- Session completion rate

---

## Success Criteria

**MVP is successful when:**

1. ✅ Users can dictate tasks in <2 minutes
2. ✅ Transcription accuracy >95%
3. ✅ Generated tasks are useful (>70% kept)
4. ✅ Feature feels faster than manual task creation
5. ✅ Review interface is intuitive (no support needed)
6. ✅ Duplicate warnings prevent redundant work
7. ✅ Users report it saves time
8. ✅ Feature used weekly by active users

**Failure indicators:**

- High edit rate (>60% of tasks require major rewrites)
- High removal rate (>50% of tasks deleted)
- Low usage (feature tried once, never again)
- Complaints about speed
- Complaints about accuracy

---

## Post-MVP Enhancements (Future)

**Phase 2 Ideas:**
- Automatic priority detection from urgency words
- Automatic due date extraction ("by Friday")
- Automatic assignee extraction ("ask Matt to...")
- Dependencies extraction ("after X is done...")
- Subtask generation
- Batch dictation (create multiple projects at once)

**Phase 3 Ideas:**
- Voice commands during review ("remove task 3")
- Multi-language support
- Custom extraction rules per workspace
- Integration with calendar for due dates
- Team templates ("standard project setup")

**Don't build these yet. Focus on MVP.**

---

## Files to Create

### Database
- [ ] `migrations/YYYYMMDDHHMMSS_create_voice_to_task_tables.sql`

### API Routes
- [ ] `app/api/task-generation/sessions/route.ts` (POST)
- [ ] `app/api/task-generation/sessions/[id]/audio/route.ts` (POST)
- [ ] `app/api/task-generation/sessions/[id]/review/route.ts` (GET)
- [ ] `app/api/task-generation/sessions/[id]/candidates/route.ts` (PATCH, POST)
- [ ] `app/api/task-generation/sessions/[id]/create/route.ts` (POST)
- [ ] `app/api/task-generation/sessions/[id]/route.ts` (DELETE)

### Services
- [ ] `lib/voice-to-task/session-service.ts`
- [ ] `lib/voice-to-task/transcription-service.ts`
- [ ] `lib/voice-to-task/extraction-service.ts`
- [ ] `lib/voice-to-task/duplicate-detection.ts`
- [ ] `lib/voice-to-task/task-creation.ts`

### Components
- [ ] `components/voice-to-task/VoiceToTaskFlow.tsx` (main orchestrator)
- [ ] `components/voice-to-task/CaptureScreen.tsx`
- [ ] `components/voice-to-task/ProcessingScreen.tsx`
- [ ] `components/voice-to-task/ReviewScreen.tsx`
- [ ] `components/voice-to-task/ResultScreen.tsx`
- [ ] `components/voice-to-task/TaskCandidateRow.tsx`

### Pages
- [ ] `app/voice-to-task/page.tsx` (or integrate as modal)

### Types
- [ ] `types/voice-to-task.ts`

### Tests
- [ ] `__tests__/voice-to-task/session-service.test.ts`
- [ ] `__tests__/voice-to-task/extraction-service.test.ts`
- [ ] `__tests__/voice-to-task/duplicate-detection.test.ts`

---

## Implementation Order

**Day 1:** Database schema, API scaffolding  
**Day 2:** Session creation, basic flow  
**Day 3:** Audio capture UI  
**Day 4:** Audio upload and storage  
**Day 5:** Transcription service  
**Day 6:** Task extraction service  
**Day 7:** Review screen UI  
**Day 8:** Review editing logic  
**Day 9:** Task creation logic  
**Day 10:** Duplicate detection, polish, testing

---

## Final Notes

**Keep it simple:** Don't over-engineer v1. The goal is a fast, reliable task extraction tool.

**Review-first always:** Never auto-create tasks. User must always see and approve.

**Quality over quantity:** Better to extract 6 strong tasks than 18 weak ones.

**Separate from Brain Dump:** This is NOT the full workspace update engine. Keep it focused.

**User control:** Every step should feel like the user is in control, not the AI.

**Speed matters:** The feature must feel faster than typing tasks manually.

**Design consistency:** Match Zebi's existing design system (soft neutrals, #DD3A44 accent, 8px grid, Font Awesome Pro duotone icons).

---

**Ready to build. Start with Phase 1 (database schema).**
