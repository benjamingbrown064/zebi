# Voice Entity Creation Feature Plan

**Goal:** Enable users to create Goals, Companies, Objectives, Projects, and Documents by speaking naturally, with AI improving content and structure before submission.

**User Flow:** Talk → AI Improves → Review → Submit/Amend

---

## Tech Stack (Reusing Brain Dump Infrastructure)

### Frontend
- **Recorder Component** (`/components/brain-dump/Recorder.tsx`) - Audio recording UI (reuse)
- **HeroUI** - Modal, Button, Input, Textarea components
- **React** - State management, form handling

### Backend
- **OpenAI Whisper API** - Speech-to-text transcription (reuse from brain dump)
- **OpenAI GPT-4** - Structure extraction and content improvement
- **Prisma** - Database operations
- **Next.js API Routes** - Server endpoints

### Database
- Existing tables: `Goal`, `Company`, `Objective`, `Project`, `Document`
- No new tables needed (simpler than brain dump - direct entity creation)

---

## Architecture

### Phase 1: Transcription (Reuse Brain Dump)
```
User speaks → Recorder captures audio → POST /api/voice/transcribe
→ OpenAI Whisper API → Return transcript
```

### Phase 2: AI Structuring (New)
```
Transcript → POST /api/voice/structure → OpenAI GPT-4 
→ Extract fields for entity type → Return structured JSON
```

### Phase 3: Review & Submit (New)
```
Show preview modal → User edits fields → POST /api/voice/create
→ Create entity in database → Navigate to entity page
```

---

## API Routes

### 1. `/api/voice/transcribe` (POST)
**Purpose:** Convert audio to text

**Input:**
- `audio`: File (audio blob)
- `entityType`: string (goal | company | objective | project | document)

**Process:**
1. Receive audio file
2. Call OpenAI Whisper API
3. Return transcript

**Output:**
```json
{
  "success": true,
  "transcript": "I want to launch a new SaaS product...",
  "duration": 12.5
}
```

**Implementation:** Simplified version of `/api/brain-dump/transcribe`

---

### 2. `/api/voice/structure` (POST)
**Purpose:** Convert transcript into structured entity fields

**Input:**
```json
{
  "transcript": "I want to launch a new SaaS product...",
  "entityType": "goal",
  "context": {
    "existingCompanies": [...],
    "existingProjects": [...]
  }
}
```

**Process:**
1. Build prompt for entity type
2. Call OpenAI GPT-4 with structured output
3. Extract fields based on entity schema
4. Improve/enhance content (fix grammar, add clarity)
5. Return structured JSON

**Output (Goal example):**
```json
{
  "success": true,
  "structured": {
    "name": "Launch Construction SaaS Product",
    "description": "Build and launch a SaaS platform targeting small construction companies. Focus on project management and compliance tracking.",
    "targetDate": "2026-06-30",
    "successCriteria": "£10,000 MRR with 3 pilot customers using the platform",
    "suggestedObjectives": [
      "Build MVP with core features",
      "Acquire 3 pilot customers",
      "Setup payment processing"
    ]
  },
  "improvements": [
    "Clarified target market (small construction companies)",
    "Added specific success metric (£10k MRR)",
    "Suggested initial objectives based on goal"
  ]
}
```

**Prompts by Entity Type:**

#### Goal
```
Extract the following from this transcript:
- name: Short goal title (max 60 chars)
- description: Clear, focused description (2-3 sentences)
- targetDate: When should this be achieved? (YYYY-MM-DD or null)
- successCriteria: How will success be measured?
- suggestedObjectives: 2-4 key milestones to achieve this goal

Transcript: "{transcript}"

Improve clarity and remove filler words. Make it actionable.
```

#### Company
```
Extract the following:
- name: Company name
- industry: Industry/sector
- description: What the company does (2-3 sentences)
- contactInfo: Any mentioned contacts, emails, phone numbers
- notes: Additional context

Transcript: "{transcript}"
```

#### Objective
```
Extract the following:
- title: Short objective title
- description: What needs to be achieved
- targetDate: Deadline (YYYY-MM-DD or null)
- goalId: Which goal does this support? (match from context)
- companyId: Related company? (match from context)

Transcript: "{transcript}"

Available goals: {goals}
Available companies: {companies}
```

#### Project
```
Extract the following:
- name: Project name
- description: Project scope and deliverables
- stage: planning | in_progress | review | completed
- targetDate: Expected completion (YYYY-MM-DD or null)
- objectiveId: Which objective does this support? (match from context)
- companyId: Related company? (match from context)

Transcript: "{transcript}"
```

#### Document
```
Extract the following:
- title: Document title
- contentRaw: Main document content (markdown)
- category: Type of document (meeting_notes | specification | strategy | other)
- projectId: Related project? (match from context)
- objectiveId: Related objective? (match from context)

Transcript: "{transcript}"

Convert spoken content into well-structured markdown with:
- Clear headings
- Bullet points for lists
- Paragraphs for explanations
```

---

### 3. `/api/voice/create` (POST)
**Purpose:** Create entity in database

**Input:**
```json
{
  "entityType": "goal",
  "data": {
    "name": "Launch Construction SaaS Product",
    "description": "...",
    "targetDate": "2026-06-30",
    ...
  }
}
```

**Process:**
1. Validate data against entity schema
2. Create entity via Prisma
3. Optionally create suggested sub-entities (e.g., objectives for a goal)
4. Return created entity

**Output:**
```json
{
  "success": true,
  "entity": {
    "id": "abc123",
    "type": "goal",
    "name": "Launch Construction SaaS Product"
  },
  "created": {
    "objectives": 3,
    "tasks": 0
  }
}
```

---

## UI Components

### 1. `VoiceEntityModal.tsx`
**Purpose:** Unified modal for voice-based entity creation

**Props:**
```typescript
interface VoiceEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'goal' | 'company' | 'objective' | 'project' | 'document';
  onSuccess: (entityId: string) => void;
}
```

**States:**
1. **Recording** - Show Recorder component
2. **Transcribing** - Loading spinner "Transcribing audio..."
3. **Structuring** - Loading spinner "AI is structuring your {entity}..."
4. **Review** - Show structured data with edit fields
5. **Creating** - Loading spinner "Creating {entity}..."
6. **Success** - Confirmation + redirect

**Layout:**
```
┌─────────────────────────────────────┐
│  Create Goal via Voice              │
├─────────────────────────────────────┤
│                                     │
│  [1. Recording]                     │
│  ● 0:23                             │
│  [Stop Recording]                   │
│                                     │
│  OR                                 │
│                                     │
│  [2. Transcribing...]               │
│  Converting speech to text...       │
│                                     │
│  OR                                 │
│                                     │
│  [3. Review & Edit]                 │
│  ┌─────────────────────────────┐   │
│  │ Transcript:                 │   │
│  │ "I want to launch..."       │   │
│  └─────────────────────────────┘   │
│                                     │
│  Name: [Launch Construction SaaS]   │
│  Description: [...]                 │
│  Target Date: [2026-06-30]         │
│  Success Criteria: [...]            │
│                                     │
│  ✨ AI Improvements:                │
│  • Clarified target market          │
│  • Added specific success metric    │
│                                     │
│  [Re-record] [Create Goal]          │
│                                     │
└─────────────────────────────────────┘
```

---

### 2. Entity Form Fields (by type)

#### Goal
- `name` - Text input (required)
- `description` - Textarea (required)
- `targetDate` - Date input (optional)
- `successCriteria` - Textarea (optional)
- Show suggested objectives (checkbox list)

#### Company
- `name` - Text input (required)
- `industry` - Text input (optional)
- `description` - Textarea (optional)
- `contactInfo` - Textarea (optional)

#### Objective
- `title` - Text input (required)
- `description` - Textarea (optional)
- `targetDate` - Date input (optional)
- `goalId` - Select dropdown (optional)
- `companyId` - Select dropdown (optional)

#### Project
- `name` - Text input (required)
- `description` - Textarea (optional)
- `stage` - Select (planning | in_progress | review | completed)
- `targetDate` - Date input (optional)
- `objectiveId` - Select dropdown (optional)

#### Document
- `title` - Text input (required)
- `contentRaw` - Rich text editor (ProseMirror)
- `category` - Select dropdown
- `projectId` - Select dropdown (optional)
- `objectiveId` - Select dropdown (optional)

---

## User Experience Flow

### Creating a Goal

1. **User clicks** "Create Goal" → Shows voice option button
2. **User clicks** "Create via Voice" → Opens `VoiceEntityModal`
3. **User speaks:**
   > "I want to launch a new SaaS product for small construction companies by end of June. The goal is to reach £10,000 monthly recurring revenue with at least 3 pilot customers actively using the platform. We need to build the MVP, get our first customers, and set up payments."
4. **System transcribes** (5-10 seconds)
5. **AI structures:**
   ```
   Name: Launch Construction SaaS Product
   Description: Build and launch a SaaS platform targeting small construction companies with a focus on project management and compliance tracking.
   Target Date: 2026-06-30
   Success Criteria: Achieve £10,000 MRR with 3 pilot customers
   
   Suggested Objectives:
   ✓ Build MVP with core features
   ✓ Acquire 3 pilot customers
   ✓ Setup payment processing
   ```
6. **User reviews** - Can edit any field or re-record
7. **User clicks** "Create Goal"
8. **System creates:**
   - Goal entity
   - 3 suggested objectives (if checked)
9. **Redirect** to Goal detail page

---

### Creating a Document

1. **User clicks** "Create Document" → "Create via Voice"
2. **User speaks:**
   > "This is the technical specification for our authentication system. We need OAuth 2.0 with support for Google and Microsoft sign-in. The system should handle JWT tokens with 24-hour expiry. We also need role-based access control with admin, manager, and user roles. Security requirements include rate limiting, CSRF protection, and audit logging."
3. **AI structures:**
   ```
   Title: Authentication System Specification
   Category: Specification
   
   Content:
   
   # Authentication System Specification
   
   ## Overview
   Technical specification for OAuth 2.0 authentication implementation
   
   ## Features
   - OAuth 2.0 integration
   - Supported providers: Google, Microsoft
   - JWT token management (24-hour expiry)
   
   ## Access Control
   - Role-based permissions (RBAC)
   - Roles: Admin, Manager, User
   
   ## Security Requirements
   - Rate limiting
   - CSRF protection
   - Audit logging
   ```
4. **User reviews** - Can continue adding via voice or edit in rich text editor
5. **User clicks** "Create Document"
6. **Redirect** to Document page

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create `/api/voice/transcribe` route (copy from brain dump)
- [ ] Create `/api/voice/structure` route with GPT-4 integration
- [ ] Create `/api/voice/create` route
- [ ] Write prompts for all 5 entity types
- [ ] Test API routes with Postman

### Phase 2: UI Components (Week 2)
- [ ] Build `VoiceEntityModal` component
- [ ] Integrate Recorder component
- [ ] Build review form for each entity type
- [ ] Add loading states and error handling
- [ ] Add "Create via Voice" button to all entity creation pages

### Phase 3: AI Improvements (Week 3)
- [ ] Fine-tune prompts for better extraction
- [ ] Add context awareness (existing entities for matching)
- [ ] Add confidence scoring (like brain dump)
- [ ] Add "Why did AI suggest this?" explanations

### Phase 4: Polish & Launch (Week 4)
- [ ] Add keyboard shortcuts (Space to start/stop recording)
- [ ] Add progress indicators
- [ ] Add success animations
- [ ] User testing with 3-5 beta users
- [ ] Deploy to production

---

## Technical Considerations

### Audio Format
- **Record as:** WebM (browser standard)
- **Send to Whisper:** Convert to MP3 or keep WebM (Whisper supports both)
- **Max duration:** 5 minutes (prevents runaway costs)

### AI Costs
- **Whisper:** $0.006/minute (~$0.03 for 5min recording)
- **GPT-4:** ~$0.02 per structuring request
- **Total:** ~$0.05 per voice creation (very affordable)

### Error Handling
- **No audio detected:** Show "Please speak into your microphone"
- **Transcription failed:** Show transcript manually + continue
- **Structuring failed:** Fall back to form with transcript as notes
- **Creation failed:** Show error + keep form data

### Privacy
- Audio files: Not stored (transcribed and discarded immediately)
- Transcripts: Optionally saved in entity metadata for debugging
- User data: Never sent to OpenAI (only transcript + entity schema)

---

## Success Metrics

### Adoption
- **Target:** 30% of new entities created via voice in first month
- **Measure:** Count of voice creations vs manual form submissions

### Quality
- **Target:** <10% rejection rate (user discards voice creation)
- **Measure:** Voice creation attempts vs completed submissions

### Speed
- **Target:** 3x faster than manual form (60s voice vs 180s typing)
- **Measure:** Time from "Create" click to submission

---

## Future Enhancements (Post-MVP)

### Voice Editing
- "Add another objective to this goal" → Opens voice modal in "append mode"
- AI merges new content with existing

### Multi-Language
- Detect language from audio
- Structure in user's language
- Support non-English workspaces

### Voice Commands
- "Create a high priority task for this project due next Friday"
- Direct command execution without review modal

### Voice Chat for Documents
- Continuous dictation mode
- "Make this section more technical"
- "Add a new section about security"

---

## Next Steps

**Immediate (Today):**
1. Create API route structure (`/api/voice/...`)
2. Copy Recorder component into new modal
3. Write first prompt (Goal structuring)
4. Test transcribe → structure → create flow manually

**This Week:**
- Build VoiceEntityModal component
- Integrate with Goals page
- Test end-to-end with real voice input
- Show Ben a working demo

**Deploy Date:** End of Week 2 (2026-03-22)
