# Brain Dump Improvements Plan

## ✅ Completed (2026-03-08)

### Fix #1: Company Support ✅
- **Problem:** "Love Warranty" matched as project instead of company
- **Fix:** Updated `action-generator.ts` to check `entityType` and use `companyId` for companies
- **Result:** Tasks now correctly assigned to companies vs projects

### Fix #2: Manual Editing in Review UI ✅
- **Problem:** No way to fix AI mistakes before applying
- **Fix:** Added inline editing to review page:
  - Edit button on each action
  - Text input for task title
  - Dropdown to reassign to different company/project/objective
  - Date picker for due dates
  - Priority selector
  - Edits saved when clicking Approve
- **Result:** Users can fix any AI mistakes before applying changes

---

## 🚀 Planned Improvements

### Fix #3: Improve Intent Extraction
**Problem:** GPT-4o-mini missing tasks (e.g., "send price list to salesman Dave" was skipped)

#### Option A: Improve GPT-4o-mini Prompt (Cost-effective)
**Effort:** 2-3 hours  
**Cost Impact:** $0 (same model)

**Approach:**
1. Add few-shot examples to prompt showing ALL tasks extracted
2. Emphasize "Extract EVERY task, even small ones"
3. Add structured output format with explicit task list
4. Include negative examples (what NOT to skip)

**Prompt improvements:**
```typescript
const IMPROVED_PROMPT = `You are analyzing a spoken work update. Extract EVERY single task mentioned, no matter how small.

CRITICAL: Do not skip ANY tasks. Even simple actions like "send email to X" or "call Y" are tasks.

Example input:
"I need to send the price list to Dave, finish the brochure, and create a presentation."

Correct output (ALL 3 tasks):
{
  "intents": [
    { "action": "create_task", "entities": [{"type": "task", "value": "send price list to Dave"}] },
    { "action": "create_task", "entities": [{"type": "task", "value": "finish the brochure"}] },
    { "action": "create_task", "entities": [{"type": "task", "value": "create presentation"}] }
  ]
}

Wrong output (missing tasks):
{
  "intents": [
    { "action": "create_task", "entities": [{"type": "task", "value": "finish the brochure"}] }
  ]
}

Now extract from this transcript...
`;
```

**Implementation:**
1. Update `lib/brain-dump/intent-extractor.ts` with improved prompt
2. Add task counter validation (warn if only 1 task found when transcript is long)
3. Test with real examples

**Success Metrics:**
- Extract 90%+ of tasks mentioned
- Reduce missed tasks from ~30% to <10%

---

#### Option B: Upgrade to GPT-4o (Higher Accuracy)
**Effort:** 30 minutes (just change model name)  
**Cost Impact:** ~3x more expensive ($0.045 vs $0.015 per session)

**Approach:**
1. Change `model: 'gpt-4o-mini'` → `model: 'gpt-4o'` in intent-extractor.ts
2. Keep same prompt (GPT-4o is better at following instructions)

**Monthly Cost (assuming 250 users, 2 sessions/month each):**
- GPT-4o-mini: $7.50/month (500 sessions × $0.015)
- GPT-4o: $22.50/month (500 sessions × $0.045)
- **Increase: +$15/month**

**Success Metrics:**
- Extract 95%+ of tasks mentioned
- Better entity recognition (names, companies, dates)
- Fewer ambiguous matches

---

#### Option C: Hybrid Approach (Best of Both)
**Effort:** 4-5 hours  
**Cost Impact:** +$10/month (selective GPT-4o usage)

**Approach:**
1. Run GPT-4o-mini first (fast, cheap)
2. Check confidence scores + task count
3. If confidence < 0.7 OR only 1 task found in long transcript:
   - Re-run with GPT-4o
   - Use GPT-4o results
4. Otherwise use GPT-4o-mini results

**Implementation:**
```typescript
export async function extractIntents(transcript: string): Promise<ExtractedIntent[]> {
  // Try GPT-4o-mini first
  const miniResults = await extractWithModel(transcript, 'gpt-4o-mini');
  
  // Check if we need GPT-4o refinement
  const needsRefinement = 
    miniResults.length === 1 && transcript.split('.').length > 3 || // Only 1 task but long transcript
    miniResults.some(intent => intent.confidence < 0.7); // Low confidence
  
  if (needsRefinement) {
    console.log('Low confidence detected, upgrading to GPT-4o');
    return extractWithModel(transcript, 'gpt-4o');
  }
  
  return miniResults;
}
```

**Success Metrics:**
- Extract 95%+ of tasks
- Only use GPT-4o for ~20% of sessions
- Total cost: ~$12/month (80% mini + 20% 4o)

---

### **Recommendation for #3:**
**Start with Option A (improved prompt)** → if still missing tasks after 1 week, switch to **Option C (hybrid)**. This gives best ROI.

---

## Fix #4: Parse Relative Dates
**Problem:** "next Thursday" stays as string instead of converting to actual date

#### Implementation Plan
**Effort:** 3-4 hours  
**Cost Impact:** $0 (no API changes)

**Approach:**
1. Install `chrono-node` library (best JS date parser)
2. Add date parsing step after entity extraction
3. Convert relative dates to ISO format

**Installation:**
```bash
npm install chrono-node
npm install --save-dev @types/chrono-node
```

**Implementation:**
```typescript
// lib/brain-dump/date-parser.ts
import * as chrono from 'chrono-node';

export function parseRelativeDate(dateString: string, referenceDate: Date = new Date()): string | null {
  const parsed = chrono.parseDate(dateString, referenceDate);
  if (!parsed) return null;
  
  return parsed.toISOString().split('T')[0]; // Return YYYY-MM-DD
}

export function enhanceWithParsedDates(entities: ExtractedEntity[]): ExtractedEntity[] {
  return entities.map(entity => {
    if (entity.type === 'date') {
      const parsed = parseRelativeDate(entity.value);
      if (parsed) {
        return {
          ...entity,
          value: parsed, // Replace "next Thursday" with "2026-03-14"
          originalValue: entity.value // Keep original for display
        };
      }
    }
    return entity;
  });
}
```

**Integration point:**
In `lib/brain-dump/processor.ts`, after entity extraction:

```typescript
// 3. Match entities for each intent
console.log(`[${sessionId}] Matching entities...`);
const matchedEntitiesMap = new Map<string, MatchedEntity[]>();

for (const intent of intents) {
  // Parse dates BEFORE matching
  const entitiesWithDates = enhanceWithParsedDates(intent.entities);
  const matched = await matchAllEntities(session.workspaceId, entitiesWithDates);
  matchedEntitiesMap.set(JSON.stringify(intent), matched);
}
```

**Supported formats:**
- "next Thursday" → 2026-03-14
- "Friday" → this Friday
- "in 2 weeks" → 2026-03-22
- "tomorrow" → 2026-03-09
- "March 15" → 2026-03-15
- "3/20" → 2026-03-20

**Success Metrics:**
- 90%+ of relative dates parsed correctly
- Vague dates flagged for user review
- Zero "vague_date" resolution issues for parseable dates

---

## Implementation Timeline

**Week 1 (Immediate):**
- [x] Fix #1: Company support (COMPLETED)
- [x] Fix #2: Manual editing UI (COMPLETED)
- [ ] Fix #3A: Improve GPT-4o-mini prompt (2-3 hours)
- [ ] Fix #4: Date parsing with chrono-node (3-4 hours)

**Week 2 (Monitor & Adjust):**
- [ ] Test extraction improvements with real data
- [ ] Measure task extraction accuracy
- [ ] Decide: keep mini or upgrade to hybrid/GPT-4o

**Week 3 (Polish):**
- [ ] Add confidence thresholds
- [ ] Fine-tune prompts based on failures
- [ ] Add extraction analytics

---

## Success Criteria

### Phase 2 Complete When:
- ✅ Users can edit ANY field before approving
- ✅ Companies correctly distinguished from projects
- ✅ 90%+ of tasks extracted (measured over 50+ sessions)
- ✅ 90%+ of relative dates parsed
- ✅ <5% of actions need clarification
- ✅ User satisfaction: "AI gets it right most of the time"

---

## Cost Analysis

### Current (Phase 2 MVP):
- Whisper: $0.006/min × 3min avg = $0.018/session
- GPT-4o-mini: ~$0.015/session
- **Total: $0.033/session** ($16.50/month for 500 sessions)

### After All Improvements:

**Option 1: Just Prompt Improvement (Recommended Start)**
- Same cost: $0.033/session

**Option 2: Full GPT-4o**
- Whisper: $0.018
- GPT-4o: $0.045
- **Total: $0.063/session** ($31.50/month for 500 sessions)
- **Increase: +$15/month**

**Option 3: Hybrid (Recommended End State)**
- Whisper: $0.018
- 80% mini ($0.015) + 20% 4o ($0.045) = $0.021 avg
- **Total: $0.039/session** ($19.50/month for 500 sessions)
- **Increase: +$3/month**

---

## Next Steps

1. **Deploy #1 and #2** ✅ (in progress)
2. **Test company assignment works** (record test with Love Warranty)
3. **Test manual editing** (edit a task title, change project → company)
4. **Implement #3A** (improved prompt) - 2-3 hours
5. **Implement #4** (date parsing) - 3-4 hours
6. **Measure for 1 week** (extraction accuracy)
7. **Decide on hybrid** if needed

---

**Created:** 2026-03-08  
**Status:** Fixes #1 and #2 deploying now, #3 and #4 planned
