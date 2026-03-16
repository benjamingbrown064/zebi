# Zebi AI Assistant - Development Plan

**Version:** 1.0  
**Created:** 2026-03-07  
**Timeline:** 5 weeks (Phase 1-4)

---

## Overview

This plan breaks down the AI Assistant implementation into **4 phases over 5 weeks**, with clear milestones, sub-agents, and dependencies.

**Target Launch:** End of Week 5 (Phase 1-3 complete)

---

## Phase 1: Chat Foundation (Week 1-2)

**Goal**: Working chat interface with context-aware responses

### Week 1: Infrastructure

#### Day 1-2: Database & API Foundation
**Owner**: Sub-agent or Ben

**Tasks:**
1. Create database tables
   - [ ] `ai_conversations` table
   - [ ] `ai_messages` table
   - [ ] `ai_memory` table
   - [ ] `ai_suggestions` table (for Phase 2)
   - [ ] Prisma schema updates
   - [ ] Migration script

2. Set up RLS policies
   - [ ] Conversation access policies
   - [ ] Message access policies
   - [ ] Memory access policies
   - [ ] Test workspace isolation

3. Create API endpoints
   - [ ] `POST /api/assistant/chat`
   - [ ] `GET /api/assistant/conversations`
   - [ ] `GET /api/assistant/conversations/[id]`
   - [ ] `DELETE /api/assistant/conversations/[id]`

**Acceptance Criteria:**
- Tables created, migrated to production
- RLS policies prevent cross-workspace access
- API endpoints respond with mock data
- All tests pass

**Estimated Time**: 2 days

---

#### Day 3-4: Context Builder & LLM Integration
**Owner**: Sub-agent or Ben

**Tasks:**
1. Build context service
   - [ ] `lib/ai/context-builder.ts`
   - [ ] Fetch active goals for workspace
   - [ ] Fetch active objectives
   - [ ] Fetch recent tasks (last 7 days)
   - [ ] Fetch active blockers
   - [ ] Fetch user preferences (AI memory)
   - [ ] Format as LLM-friendly JSON

2. Integrate Claude API
   - [ ] `lib/ai/claude-client.ts`
   - [ ] API key configuration
   - [ ] Prompt template system
   - [ ] Request/response formatting
   - [ ] Error handling
   - [ ] Token counting
   - [ ] Cost tracking

3. Build AI orchestrator
   - [ ] `lib/ai/orchestrator.ts`
   - [ ] Combine context + user message
   - [ ] Call Claude API
   - [ ] Parse response
   - [ ] Extract actions
   - [ ] Store conversation

**Acceptance Criteria:**
- Context builder returns workspace data
- Claude API responds to test prompts
- Orchestrator handles full flow (context → LLM → response)
- Conversation history saved to DB

**Estimated Time**: 2 days

---

### Week 2: Chat UI

#### Day 5-7: Frontend Components
**Owner**: Sub-agent or Ben

**Tasks:**
1. Chat UI component
   - [ ] `app/components/AIChat.tsx`
   - [ ] Sidebar layout (slides from right)
   - [ ] Message list (scrollable, auto-scroll to bottom)
   - [ ] User message bubbles
   - [ ] Assistant message bubbles
   - [ ] Input field + send button
   - [ ] Loading state (typing indicator)
   - [ ] Error states
   - [ ] "Clear conversation" button

2. Message components
   - [ ] `AIMessage.tsx` (displays assistant messages)
   - [ ] Action buttons (one-click actions)
   - [ ] Reasoning tooltip (show why AI suggested)
   - [ ] Timestamp
   - [ ] Copy button

3. Integration
   - [ ] Hook up to `/api/assistant/chat`
   - [ ] Conversation persistence
   - [ ] Real-time updates
   - [ ] Keyboard shortcuts (Enter to send, Esc to close)

**Acceptance Criteria:**
- Chat UI opens/closes smoothly
- Messages send and receive
- Conversation history loads
- Actions render (even if not functional yet)
- Works on mobile

**Estimated Time**: 3 days

---

#### Day 8-9: Testing & Polish
**Owner**: Ben

**Tasks:**
1. Integration testing
   - [ ] Test full chat flow
   - [ ] Test context accuracy
   - [ ] Test error scenarios
   - [ ] Test RLS enforcement

2. Prompt engineering
   - [ ] Refine daily briefing prompt
   - [ ] Refine chat prompt
   - [ ] Test different question types
   - [ ] Improve response quality

3. Polish
   - [ ] Add animations
   - [ ] Loading states
   - [ ] Empty states
   - [ ] Error messages
   - [ ] Mobile responsiveness

**Acceptance Criteria:**
- Chat works reliably
- Responses are helpful and accurate
- No RLS violations
- Good UX (smooth, responsive)

**Estimated Time**: 2 days

---

**Phase 1 Deliverable**: ✅ Working chat interface accessible from anywhere in the app

---

## Phase 2: Dashboard Recommendations (Week 3)

**Goal**: Proactive AI suggestions on dashboard

### Day 10-11: Suggestions API
**Owner**: Sub-agent

**Tasks:**
1. Briefing endpoint
   - [ ] `GET /api/assistant/brief`
   - [ ] Daily briefing generator
   - [ ] Priority analyzer
   - [ ] Risk detector
   - [ ] Opportunity finder
   - [ ] Cache results (1 hour TTL)

2. Suggestions endpoint
   - [ ] `GET /api/assistant/suggest`
   - [ ] Context-based suggestions
   - [ ] Suggestion scoring (relevance)
   - [ ] Expiration logic (suggestions go stale)
   - [ ] Limit per user per day

3. Action executor
   - [ ] `POST /api/assistant/action`
   - [ ] Execute suggestion actions
   - [ ] Track acceptance/rejection
   - [ ] Update AI memory (learn from feedback)

**Acceptance Criteria:**
- Briefing returns top priorities
- Suggestions are relevant
- Actions execute successfully
- Feedback tracked

**Estimated Time**: 2 days

---

### Day 12-14: Recommendations UI
**Owner**: Sub-agent or Ben

**Tasks:**
1. Recommendations card
   - [ ] `app/components/AIRecommendations.tsx`
   - [ ] Fetch suggestions on load
   - [ ] Display 3-5 suggestions
   - [ ] Each suggestion: title, description, reasoning
   - [ ] Action buttons (Accept / Dismiss)
   - [ ] "See all" link
   - [ ] Refresh button

2. Suggestion item
   - [ ] `AISuggestionItem.tsx`
   - [ ] Icon based on type (task/risk/opportunity)
   - [ ] Action buttons
   - [ ] Expand/collapse reasoning
   - [ ] Accept → execute action
   - [ ] Dismiss → mark as rejected

3. Dashboard integration
   - [ ] Add card to dashboard
   - [ ] Position below summary cards
   - [ ] Handle empty state (no suggestions)
   - [ ] Handle loading state

**Acceptance Criteria:**
- Recommendations show on dashboard
- Accept/dismiss works
- Actions execute
- Empty/loading states handled

**Estimated Time**: 3 days

---

**Phase 2 Deliverable**: ✅ Dashboard shows AI recommendations with one-click actions

---

## Phase 3: Inline Intelligence (Week 4)

**Goal**: Context-aware suggestions throughout the app

### Day 15-17: Inline Suggestions
**Owner**: Sub-agent

**Tasks:**
1. Task page intelligence
   - [ ] Add "Ask AI" button to task detail page
   - [ ] AI suggests priority (if task has no priority)
   - [ ] AI suggests deadline (if task has no deadline)
   - [ ] AI detects dependencies ("This blocks X tasks")

2. Objective page intelligence
   - [ ] Add "Ask AI" button to objective page
   - [ ] AI detects risks (behind schedule, no tasks, etc.)
   - [ ] AI suggests subtask breakdown (big objectives)
   - [ ] AI highlights opportunities (good week to push)

3. Projects page intelligence
   - [ ] AI suggests project breakdown
   - [ ] AI detects inactive projects
   - [ ] AI recommends next milestone

4. Inline AI button component
   - [ ] `InlineAIButton.tsx`
   - [ ] Opens chat with context
   - [ ] Pre-populates question
   - [ ] Shows loading state

**Acceptance Criteria:**
- AI button appears on key pages
- Suggestions are contextual
- One-click actions work
- Chat integration seamless

**Estimated Time**: 3 days

---

### Day 18-19: Testing & Refinement
**Owner**: Ben

**Tasks:**
1. Test all inline suggestions
   - [ ] Task priority suggestions
   - [ ] Objective risk detection
   - [ ] Project breakdown suggestions

2. Prompt refinement
   - [ ] Improve suggestion accuracy
   - [ ] Reduce false positives
   - [ ] Better reasoning explanations

3. Performance optimization
   - [ ] Cache suggestions
   - [ ] Reduce API calls
   - [ ] Optimize context building

**Acceptance Criteria:**
- Suggestions are accurate
- False positive rate < 20%
- Page load time not impacted

**Estimated Time**: 2 days

---

**Phase 3 Deliverable**: ✅ Context-aware AI suggestions throughout the app

---

## Phase 4: Proactive Alerts (Week 5)

**Goal**: AI identifies risks and opportunities automatically

### Day 20-22: Background Analysis
**Owner**: Sub-agent

**Tasks:**
1. Daily analysis job
   - [ ] Create cron job (`/api/cron/ai-analyze`)
   - [ ] Runs every morning at 6am
   - [ ] Analyzes each workspace
   - [ ] Generates suggestions
   - [ ] Flags critical alerts

2. Alert generator
   - [ ] Risk detection (late tasks, blocked objectives)
   - [ ] Opportunity detection (good time to push X)
   - [ ] Blocker detection (stuck for >3 days)
   - [ ] Deadline warnings (< 5 days away, 0 progress)

3. Alert notification
   - [ ] Store alerts in `ai_suggestions` table
   - [ ] Priority scoring (critical → low)
   - [ ] Send notifications (via existing notification system)

**Acceptance Criteria:**
- Daily job runs successfully
- Alerts generated for real risks
- Notifications sent
- Alert priority accurate

**Estimated Time**: 3 days

---

### Day 23-24: Activity Feed
**Owner**: Ben

**Tasks:**
1. Activity feed component
   - [ ] `AIActivityFeed.tsx`
   - [ ] Shows timeline of AI actions
   - [ ] Filter by type (alert/suggestion/action)
   - [ ] "AI analyzed your workspace"
   - [ ] "AI detected a risk in Project X"
   - [ ] "AI suggested Task Y (accepted)"

2. Dashboard integration
   - [ ] Add activity feed card
   - [ ] Show last 10 AI actions
   - [ ] Link to full activity page
   - [ ] Handle empty state

**Acceptance Criteria:**
- Feed shows AI actions
- Timeline is accurate
- Links work

**Estimated Time**: 2 days

---

**Phase 4 Deliverable**: ✅ Proactive AI alerts and activity timeline

---

## Launch Plan (End of Week 5)

### Pre-Launch Checklist
- [ ] All Phase 1-3 features complete
- [ ] RLS policies verified
- [ ] Cost monitoring dashboard
- [ ] Rate limiting configured
- [ ] Error tracking (Sentry)
- [ ] Performance metrics (Vercel)
- [ ] User documentation written
- [ ] Feedback form added

### Beta Launch (Week 5 End)
- [ ] Enable for Ben only (dogfood)
- [ ] Test for 3 days
- [ ] Fix critical issues
- [ ] Enable for 10 beta users
- [ ] Collect feedback for 1 week

### Full Launch (Week 6+)
- [ ] Gradual rollout: 10% → 50% → 100%
- [ ] Monitor costs daily
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Iterate on prompts
- [ ] Plan Phase 5 features

---

## Resource Allocation

### Ben's Time
- **Week 1**: 2 days (review, guidance)
- **Week 2**: 3 days (testing, prompt engineering)
- **Week 3**: 2 days (review, testing)
- **Week 4**: 2 days (testing, refinement)
- **Week 5**: 3 days (final testing, launch)
- **Total**: 12 days over 5 weeks

### Sub-Agent Time
- **Week 1**: 4 days (database, APIs, context builder)
- **Week 2**: 3 days (chat UI)
- **Week 3**: 5 days (recommendations UI + API)
- **Week 4**: 3 days (inline suggestions)
- **Week 5**: 3 days (background jobs, activity feed)
- **Total**: 18 days over 5 weeks

**Total Effort**: ~30 person-days over 5 weeks

---

## Dependencies

### External
- ✅ Anthropic Claude API access (already have key)
- ✅ Supabase RLS policies (framework exists)
- ✅ Prisma migrations (process established)

### Internal
- ✅ Doug API endpoints (can reference as examples)
- ✅ Task/Goal/Objective models (already defined)
- ✅ Notification system (exists, can integrate)

**No blockers** - everything needed is in place!

---

## Risk Mitigation

### Technical Risks
1. **LLM cost spirals**: Rate limiting + caching
2. **RLS bypass**: Extensive testing, code review
3. **Poor suggestions**: Iterative prompt engineering
4. **Slow responses**: Caching, context optimization

### Schedule Risks
1. **Underestimated complexity**: Buffer in Week 5
2. **Ben unavailable**: Sub-agents can continue
3. **API issues**: Fallback to mock responses

---

## Success Criteria

### Week 1
- ✅ Database tables created
- ✅ API endpoints respond
- ✅ Context builder works
- ✅ Claude API integrated

### Week 2
- ✅ Chat UI functional
- ✅ Messages send/receive
- ✅ Conversation persists
- ✅ Good UX

### Week 3
- ✅ Dashboard recommendations show
- ✅ Actions execute
- ✅ Feedback tracked
- ✅ Suggestions relevant

### Week 4
- ✅ Inline suggestions work
- ✅ Context-aware
- ✅ False positives low
- ✅ Performance good

### Week 5
- ✅ Daily analysis runs
- ✅ Alerts generated
- ✅ Activity feed shows actions
- ✅ Ready for beta launch

---

## Post-Launch

### Week 6-8: Iterate & Improve
- Collect user feedback
- Fix bugs
- Improve prompts
- Reduce false positives
- Optimize costs

### Week 9+: Phase 5 Features
- Voice interface
- Email integration
- Calendar integration
- Team intelligence
- Predictive alerts

---

## Open Questions (Need Answers Before Week 1)

1. **Pricing**: Charge extra for AI? Or included in base price?
2. **Limits**: How many AI interactions per user per day?
3. **Model choice**: Sonnet for all, or Haiku for some tasks?
4. **Cache TTL**: How long to cache suggestions?
5. **Memory retention**: How much user context to store?

---

## Next Actions

**Right now:**
1. Review spec + plan with Ben
2. Get answers to open questions
3. Schedule Week 1 kickoff
4. Create Figma mockups (optional)
5. Set up project board (Zebi itself!)

**Ready to start?** 🚀
