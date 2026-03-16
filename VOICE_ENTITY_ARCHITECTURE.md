# Voice Entity Creation - Technical Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Goals Page              Companies Page      Projects Page  │
│  ┌──────────────┐        ┌──────────────┐   ┌────────────┐ │
│  │ [+ Create]   │        │ [+ Create]   │   │ [+ Create] │ │
│  │   - Form     │        │   - Form     │   │   - Form   │ │
│  │   - Voice ← Click opens modal        │   │   - Voice  │ │
│  └──────────────┘        └──────────────┘   └────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   VoiceEntityModal Component                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: RECORD                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  [Recorder Component] ● 0:23 recording...             │ │
│  │  [Stop Recording]                                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                         ↓                                   │
│  Step 2: TRANSCRIBE                                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  [Spinner] Converting speech to text...               │ │
│  └───────────────────────────────────────────────────────┘ │
│                         ↓                                   │
│  Step 3: STRUCTURE                                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  [Spinner] AI is structuring your goal...             │ │
│  └───────────────────────────────────────────────────────┘ │
│                         ↓                                   │
│  Step 4: REVIEW                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Original Transcript:                                 │ │
│  │  "I want to launch a SaaS product..."                 │ │
│  │                                                        │ │
│  │  Name: [Launch Construction SaaS Product]             │ │
│  │  Description: [Build and launch...]                   │ │
│  │  Target Date: [2026-06-30]                           │ │
│  │  Success Criteria: [£10k MRR with 3 pilots]          │ │
│  │                                                        │ │
│  │  ✨ AI Improvements:                                   │ │
│  │  • Clarified target market                            │ │
│  │  • Added specific success metric                      │ │
│  │  • Suggested 3 initial objectives                     │ │
│  │                                                        │ │
│  │  [Re-record] [Create Goal]                            │ │
│  └───────────────────────────────────────────────────────┘ │
│                         ↓                                   │
│  Step 5: CREATE                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  [Spinner] Creating goal...                           │ │
│  └───────────────────────────────────────────────────────┘ │
│                         ↓                                   │
│  Step 6: SUCCESS                                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ✓ Goal created successfully!                         │ │
│  │  → Redirecting to goal page...                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Request Flow

```
Frontend                    Backend                     External APIs
   │                           │                              │
   │  1. Click "Create via Voice"                            │
   │  Open VoiceEntityModal                                  │
   │                           │                              │
   │  2. User speaks           │                              │
   │  Recorder captures audio  │                              │
   │                           │                              │
   │  3. POST /api/voice/transcribe                          │
   ├──────────────────────────>│                              │
   │  FormData:                │                              │
   │  - audio: Blob            │  4. Send audio to Whisper   │
   │  - entityType: "goal"     ├─────────────────────────────>│
   │                           │                              │
   │                           │  5. Return transcript        │
   │                           │<─────────────────────────────┤
   │  6. Return transcript     │                              │
   │<──────────────────────────┤                              │
   │  { transcript: "..." }    │                              │
   │                           │                              │
   │  7. POST /api/voice/structure                           │
   ├──────────────────────────>│                              │
   │  {                        │                              │
   │    transcript: "...",     │  8. Send to GPT-4 with      │
   │    entityType: "goal",    │     structuring prompt       │
   │    context: {...}         ├─────────────────────────────>│
   │  }                        │                              │
   │                           │                              │
   │                           │  9. Return structured JSON   │
   │                           │<─────────────────────────────┤
   │  10. Return structured    │                              │
   │      data + improvements  │                              │
   │<──────────────────────────┤                              │
   │  {                        │                              │
   │    structured: {...},     │                              │
   │    improvements: [...]    │                              │
   │  }                        │                              │
   │                           │                              │
   │  11. User reviews & edits │                              │
   │      in modal             │                              │
   │                           │                              │
   │  12. POST /api/voice/create                             │
   ├──────────────────────────>│                              │
   │  {                        │  13. Prisma create entity    │
   │    entityType: "goal",    ├─────────────────────────────>│
   │    data: {...}            │      (Database)              │
   │  }                        │                              │
   │                           │  14. Return created entity   │
   │                           │<─────────────────────────────┤
   │  15. Return success       │                              │
   │<──────────────────────────┤                              │
   │  {                        │                              │
   │    success: true,         │                              │
   │    entity: {...}          │                              │
   │  }                        │                              │
   │                           │                              │
   │  16. Close modal          │                              │
   │  17. Redirect to          │                              │
   │      entity page          │                              │
   │                           │                              │
```

---

## Data Flow: Speech → Entity

### Example: Creating a Goal via Voice

**Input (User speaks):**
```
"I want to launch a new SaaS product for small construction 
companies by the end of June. The goal is to reach ten thousand 
pounds monthly recurring revenue with at least three pilot 
customers actively using the platform. We need to build the MVP, 
get our first customers, and set up payment processing."
```

**Step 1: Transcription (Whisper)**
```
Raw transcript:
"I want to launch a new SaaS product for small construction 
companies by the end of June. The goal is to reach ten thousand 
pounds monthly recurring revenue with at least three pilot 
customers actively using the platform. We need to build the MVP, 
get our first customers, and set up payment processing."
```

**Step 2: Structuring (GPT-4)**

Prompt sent to GPT-4:
```
You are extracting structured data for a Goal entity.

Schema:
- name: string (max 60 chars, clear title)
- description: string (2-3 sentences, actionable)
- targetDate: string (YYYY-MM-DD format or null)
- successCriteria: string (measurable outcome)
- suggestedObjectives: string[] (2-4 key milestones)

Transcript:
"I want to launch a new SaaS product for small construction..."

Instructions:
1. Extract all fields from the transcript
2. Improve clarity and remove filler words
3. Make descriptions actionable and specific
4. Convert relative dates ("end of June") to absolute dates
5. Break down goals into suggested objectives

Return JSON only.
```

GPT-4 Response:
```json
{
  "name": "Launch Construction SaaS Product",
  "description": "Build and launch a SaaS platform targeting small construction companies. Focus on project management and compliance tracking to help businesses streamline operations.",
  "targetDate": "2026-06-30",
  "successCriteria": "Achieve £10,000 monthly recurring revenue (MRR) with at least 3 pilot customers actively using the platform",
  "suggestedObjectives": [
    "Build MVP with core project management features",
    "Acquire and onboard 3 pilot customers",
    "Implement payment processing and billing system",
    "Achieve £10,000 MRR milestone"
  ],
  "improvements": [
    "Clarified target market: small construction companies",
    "Converted 'end of June' to specific date: 2026-06-30",
    "Added specific revenue metric: £10,000 MRR",
    "Broke down into 4 actionable objectives",
    "Enhanced description with value proposition"
  ]
}
```

**Step 3: Review (User sees)**
```
┌───────────────────────────────────────────────────────┐
│ Create Goal via Voice                                 │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Original Transcript:                                  │
│ ┌─────────────────────────────────────────────────┐   │
│ │ "I want to launch a new SaaS product for small  │   │
│ │  construction companies by the end of June..."  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ Name:                                                 │
│ [Launch Construction SaaS Product              ]      │
│                                                       │
│ Description:                                          │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Build and launch a SaaS platform targeting     │   │
│ │ small construction companies. Focus on project │   │
│ │ management and compliance tracking...          │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ Target Date:                                          │
│ [2026-06-30                              ] 📅         │
│                                                       │
│ Success Criteria:                                     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Achieve £10,000 monthly recurring revenue      │   │
│ │ (MRR) with at least 3 pilot customers...       │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ ✨ AI Improvements:                                   │
│ • Clarified target market: small construction cos.    │
│ • Converted "end of June" → 2026-06-30               │
│ • Added specific revenue metric: £10,000 MRR         │
│ • Broke down into 4 actionable objectives            │
│                                                       │
│ Create these objectives too?                          │
│ ☑ Build MVP with core project management features    │
│ ☑ Acquire and onboard 3 pilot customers              │
│ ☑ Implement payment processing and billing system    │
│ ☑ Achieve £10,000 MRR milestone                      │
│                                                       │
│ [Re-record] [Cancel] [Create Goal]                    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Step 4: Create (Database)**

User clicks "Create Goal" → Backend creates:

```typescript
// 1. Create Goal
const goal = await prisma.goal.create({
  data: {
    workspaceId: userWorkspaceId,
    name: "Launch Construction SaaS Product",
    description: "Build and launch a SaaS platform...",
    targetDate: new Date("2026-06-30"),
    successCriteria: "Achieve £10,000 MRR...",
    status: "active"
  }
});

// 2. Create suggested Objectives (if checked)
const objectives = await prisma.objective.createMany({
  data: [
    {
      workspaceId: userWorkspaceId,
      goalId: goal.id,
      title: "Build MVP with core project management features",
      status: "active"
    },
    {
      workspaceId: userWorkspaceId,
      goalId: goal.id,
      title: "Acquire and onboard 3 pilot customers",
      status: "active"
    },
    // ... etc
  ]
});
```

**Step 5: Result**

```json
{
  "success": true,
  "entity": {
    "id": "goal_abc123",
    "type": "goal",
    "name": "Launch Construction SaaS Product"
  },
  "created": {
    "objectives": 4,
    "tasks": 0
  }
}
```

User redirected to `/goals/goal_abc123`

---

## Component State Machine

```
VoiceEntityModal States:

idle
  │
  ├─→ recording
  │     │
  │     ├─→ transcribing
  │     │     │
  │     │     ├─→ structuring
  │     │     │     │
  │     │     │     ├─→ reviewing
  │     │     │     │     │
  │     │     │     │     ├─→ creating
  │     │     │     │     │     │
  │     │     │     │     │     ├─→ success → close & redirect
  │     │     │     │     │     │
  │     │     │     │     │     └─→ error → show message, back to reviewing
  │     │     │     │     │
  │     │     │     │     └─→ [Re-record] → back to recording
  │     │     │     │
  │     │     │     └─→ error → show message, manual form entry
  │     │     │
  │     │     └─→ error → show message, allow re-record or manual entry
  │     │
  │     └─→ error → show message, allow retry
  │
  └─→ [Close] → close modal
```

---

## Reusable vs New Components

### Reuse from Brain Dump ✓
- `Recorder.tsx` - Audio recording component
- `/api/voice/transcribe` - Whisper API integration (simplified)
- OpenAI client setup
- Audio processing utilities

### New Components (Voice-specific)
- `VoiceEntityModal.tsx` - Main modal component
- `/api/voice/structure` - Entity structuring with GPT-4
- `/api/voice/create` - Entity creation endpoint
- Entity-specific form fields
- AI improvement display

### Key Difference from Brain Dump

| Feature | Brain Dump | Voice Entity Creation |
|---------|-----------|----------------------|
| **Complexity** | High - multi-intent extraction | Low - single entity focus |
| **Entity Matching** | Required - match existing entities | Optional - for relationships |
| **Actions** | Multiple proposed actions | Single creation action |
| **Review UI** | Action list with approve/reject | Form with edit fields |
| **Database** | Stores sessions + proposed actions | Direct entity creation |
| **Use Case** | Daily status updates | Creating new entities |

---

## Error Handling Strategy

### Recording Errors
```
Error: No microphone access
→ Show: "Please allow microphone access in browser settings"
→ Action: Show manual form as fallback

Error: No audio detected
→ Show: "We didn't hear anything. Please try again."
→ Action: Allow re-record

Error: Recording too long (>5min)
→ Show: "Recording stopped at 5 minutes. Please be more concise."
→ Action: Process anyway or allow re-record
```

### Transcription Errors
```
Error: Whisper API failure
→ Show: "Transcription failed. Please try again or use the form."
→ Action: Allow re-record or switch to manual form

Error: No speech detected in audio
→ Show: "We couldn't understand the audio. Please speak clearly."
→ Action: Allow re-record
```

### Structuring Errors
```
Error: GPT-4 API failure
→ Show: "AI structuring failed. Here's your transcript - please fill the form manually."
→ Action: Show form with transcript in notes field

Error: Incomplete extraction (missing required fields)
→ Show: "AI extracted some fields. Please fill in the rest."
→ Action: Show partially filled form

Error: Low confidence extraction
→ Show: "⚠️ AI wasn't very confident. Please review carefully."
→ Action: Show form with warning badges on uncertain fields
```

### Creation Errors
```
Error: Database failure
→ Show: "Failed to create {entity}. Please try again."
→ Action: Keep form data, allow retry

Error: Validation failure
→ Show: "Please fix these fields: {list}"
→ Action: Highlight invalid fields in red

Error: Duplicate entity name
→ Show: "{Entity} with this name already exists."
→ Action: Suggest alternative name or show existing entity
```

---

## Performance Targets

| Step | Target Time | Worst Case |
|------|-------------|------------|
| Recording | User-controlled | 5min max |
| Transcription | 3-5 seconds | 15 seconds |
| Structuring | 2-3 seconds | 10 seconds |
| Database creation | <1 second | 3 seconds |
| **Total (excluding user)** | **5-9 seconds** | **28 seconds** |

User experience:
- Speak for 30-90 seconds
- Wait 5-9 seconds
- Review for 20-30 seconds
- **Total: ~60 seconds** (vs 3 minutes manual form filling)

---

## Cost Analysis

### Per Voice Creation
- Whisper (60s audio): $0.006/min × 1min = **$0.006**
- GPT-4 structuring (500 tokens): ~**$0.015**
- Database operations: **free** (within Supabase limits)
- **Total: ~$0.02 per voice creation**

### At Scale
- 1,000 voice creations/month = $20/month
- 10,000 voice creations/month = $200/month

(Extremely affordable - allows unlimited free tier for users)

---

## Future Optimization Ideas

### Caching
- Cache entity context (companies, projects, etc.) for 5 minutes
- Reduces database queries during review/edit phase

### Streaming
- Stream transcription results as they arrive (word-by-word)
- Show real-time structuring progress

### Offline Support
- Use Web Speech API for initial transcription (free, instant)
- Fall back to Whisper for accuracy/quality
- Structure locally with small model, enhance with GPT-4

### Smart Defaults
- Learn from user's previous creations
- Pre-fill common fields (e.g., default target dates)
- Suggest related entities automatically

---

This architecture provides a solid foundation for voice-based entity creation while keeping complexity low and user experience smooth.
