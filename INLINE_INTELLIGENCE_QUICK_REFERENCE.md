# Inline Intelligence - Quick Reference

## 🚀 Quick Start

### Using Smart Task Input

```typescript
import SmartTaskInput from '@/app/components/SmartTaskInput'

<SmartTaskInput
  value={taskTitle}
  onChange={setTaskTitle}
  onSuggestionAccept={(suggestion) => {
    console.log('User accepted:', suggestion)
  }}
  placeholder="Type your task..."
/>
```

### Using Smart Deadline Button

```typescript
import SmartDeadlineButton from '@/app/components/SmartDeadlineButton'

<SmartDeadlineButton
  taskDescription={taskTitle}
  priority={selectedPriority}
  onDeadlineSelect={(deadline, reasoning) => {
    setDueDate(deadline)
    showToast(reasoning)
  }}
  disabled={!taskTitle}
/>
```

---

## 📡 API Endpoints

### Autocomplete

```bash
POST /api/assistant/autocomplete
Content-Type: application/json

{
  "partialText": "Review security",
  "context": {
    "projectId": "optional-uuid",
    "goalId": "optional-uuid",
    "objectiveId": "optional-uuid"
  }
}
```

**Response:**
```json
{
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "confidence": 85
}
```

### Deadline Suggestion

```bash
POST /api/assistant/suggest-deadline
Content-Type: application/json

{
  "taskDescription": "Complete documentation",
  "priority": 1
}
```

**Response:**
```json
{
  "deadline": "2026-03-21T12:00:00.000Z",
  "reasoning": "Explanation here"
}
```

### Related Tasks

```bash
POST /api/assistant/related-tasks
Content-Type: application/json

{
  "taskDescription": "Fix security issues"
}
```

**Response:**
```json
{
  "relatedTasks": [
    {
      "taskId": "uuid",
      "title": "Task title",
      "similarity": 85
    }
  ]
}
```

---

## 🔧 Core Library

### SmartAutocomplete Class

```typescript
import { SmartAutocomplete } from '@/lib/ai/smart-autocomplete'

const autocomplete = new SmartAutocomplete()

// Get task completions
const result = await autocomplete.completeTaskDescription(
  workspaceId,
  userId,
  "Review sec",
  { projectId: "optional" }
)

// Get deadline suggestion
const deadline = await autocomplete.suggestDeadline(
  workspaceId,
  userId,
  "Complete docs",
  1 // priority
)

// Find related tasks
const related = await autocomplete.findRelatedTasks(
  workspaceId,
  userId,
  "Fix security bugs"
)
```

---

## ⚙️ Configuration

### Environment Variables

Required:
- `OPENAI_API_KEY` - OpenAI API key
- `DATABASE_URL` - Supabase connection string

### Model Configuration

Default model: `gpt-4o-mini`

To change model in `lib/ai/smart-autocomplete.ts`:
```typescript
const response = await chatCompletion(messages, {
  model: 'gpt-4o', // or 'gpt-4o-mini'
  temperature: 0.7,
  maxTokens: 500,
})
```

---

## 🎨 Styling

### Dark Mode Classes

All components support dark mode:
```typescript
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
```

### Custom Styling

Pass `className` prop:
```typescript
<SmartTaskInput
  className="my-custom-class"
  // ...
/>
```

---

## 🧪 Testing

### Run Tests

```bash
./test-inline-intelligence.sh
```

### Manual Testing

```bash
# Autocomplete
curl -X POST http://localhost:3002/api/assistant/autocomplete \
  -H "Content-Type: application/json" \
  -d '{"partialText": "Review security"}'

# Deadline
curl -X POST http://localhost:3002/api/assistant/suggest-deadline \
  -H "Content-Type: application/json" \
  -d '{"taskDescription": "Complete docs", "priority": 1}'

# Related tasks
curl -X POST http://localhost:3002/api/assistant/related-tasks \
  -H "Content-Type: application/json" \
  -d '{"taskDescription": "Fix bugs"}'
```

---

## 🐛 Debugging

### Enable Console Logs

Errors are logged automatically:
```typescript
console.error('Autocomplete error:', error)
```

### Check API Response

```typescript
const response = await fetch('/api/assistant/autocomplete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ partialText: "test" }),
})

const data = await response.json()
console.log('Response:', data)
```

### Common Issues

**Issue:** Suggestions not appearing  
**Fix:** Check that text is 3+ characters and wait 500ms

**Issue:** API returns HTML instead of JSON  
**Fix:** Check server is running on correct port

**Issue:** OpenAI API errors  
**Fix:** Verify `OPENAI_API_KEY` in `.env.local`

---

## 💡 Best Practices

1. **Debounce user input** - 500ms minimum
2. **Show loading states** - Users need feedback
3. **Graceful degradation** - Don't break UX on errors
4. **Validate input** - Minimum 3 characters
5. **Cache context** - Don't rebuild context on every call
6. **Handle JSON parsing** - LLMs may wrap JSON in code blocks
7. **Test with real data** - AI suggestions depend on workspace context

---

## 📈 Monitoring

### Track Usage

Add analytics:
```typescript
const result = await autocomplete.completeTaskDescription(...)
analytics.track('ai_autocomplete_used', {
  confidence: result.confidence,
  suggestionsCount: result.suggestions.length
})
```

### Track Costs

```typescript
// Approximate cost per request
const COST_PER_REQUEST = 0.0001 // $0.0001
```

### Track Acceptance Rate

```typescript
onSuggestionAccept={(suggestion) => {
  analytics.track('ai_suggestion_accepted', { suggestion })
}}
```

---

## 🔐 Security

- ✅ API routes protected by Next.js
- ✅ No user input directly in prompts (sanitized)
- ✅ Workspace context limited to user's data
- ✅ OpenAI API key in environment variables

---

## 📚 Related Documentation

- [ZEBI_AI_ASSISTANT_SPEC.md](./ZEBI_AI_ASSISTANT_SPEC.md) - AI assistant specification
- [ZEBI_AI_DEVELOPMENT_PLAN.md](./ZEBI_AI_DEVELOPMENT_PLAN.md) - Development roadmap
- [WEEK3_DAY11-13_INLINE_INTELLIGENCE_COMPLETE.md](./WEEK3_DAY11-13_INLINE_INTELLIGENCE_COMPLETE.md) - Implementation details

---

## 🎯 Tips

1. **Start simple** - Use SmartTaskInput first, add deadline button later
2. **Test with real users** - AI suggestions work best with real workspace data
3. **Monitor costs** - Track API usage in production
4. **Iterate on prompts** - Adjust prompts in `smart-autocomplete.ts` based on feedback
5. **Consider caching** - Cache suggestions for similar inputs

---

*Updated: March 7, 2026*
