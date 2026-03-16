/**
 * Phase 2: Intent Extraction
 * Analyzes transcript to identify user intentions and extract entities
 */

import OpenAI from 'openai';
import { parseDate, ParsedDate } from './date-parser';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ExtractedIntent {
  action: string; // create_task, update_task, create_project, etc.
  entities: ExtractedEntity[];
  context: string;
  confidence: number;
}

export interface ExtractedEntity {
  type: 'task' | 'project' | 'objective' | 'company' | 'person' | 'date' | 'priority' | 'status';
  value: string;
  mentionText: string; // Original text from transcript
  context: string; // Surrounding context
  confidence: number;
  parsedDate?: ParsedDate; // For date entities, includes parsed ISO date
}

const INTENT_EXTRACTION_PROMPT = `You are analyzing a spoken work update from a business owner managing multiple projects. The user is describing completed work, upcoming tasks, blockers, or changes needed.

Your job: Extract ALL actionable items with maximum detail and context.

**Extraction Rules:**

1. **Actions** - Identify what needs to happen:
   - create_task: New work mentioned that doesn't exist yet
   - update_task: Changes to existing tasks (status, description, notes)
   - assign_task: Assigning work to people
   - set_due_date: Deadlines or time constraints mentioned
   - set_priority: Urgency indicators (urgent, high priority, critical, ASAP)
   - set_status: Status changes (done, in progress, blocked, at risk)
   - create_project: New projects or initiatives
   - update_project: Changes to project scope, timeline, status
   - create_objective: New goals or objectives
   - update_objective: Progress updates, status changes, blockers
   - add_note: Context, blockers, decisions, or observations

2. **Entities** - Extract with high precision:
   - **Task names**: Be specific. "Review claims" not "claims"
   - **Project/Company names**: Exact mentions (Love Warranty, DGS, Taskbox)
   - **Objectives**: Goals, milestones, targets
   - **People**: Names mentioned (assign, collaborate, waiting on)
   - **Dates**: ALL temporal references (Friday, tomorrow, next week, EOD, Q1, March 15)
   - **Priority**: Urgency cues (urgent, important, critical, high priority, ASAP, whenever)
   - **Status**: Completion/progress indicators (done, started, blocked, at risk, complete)

3. **Relationships** - Understand connections:
   - Which company/project does a task belong to?
   - Which objective does a project support?
   - What's blocking what?
   - What depends on what?

4. **Implied Information** - Infer from context:
   - If user says "I finished X" → task exists, set status to completed
   - If user says "I need to do X" → create new task
   - Urgent tone or words → high priority
   - Blocker mentioned → status: blocked, capture blocker in note
   - "Waiting on" → add note about dependency

5. **Confidence Scoring**:
   - 0.9-1.0: Explicit mention, no ambiguity
   - 0.7-0.89: Strong inference from context
   - 0.5-0.69: Reasonable guess, might need clarification
   - 0.0-0.49: Very uncertain, flag for review

**Return JSON:**
{
  "intents": [
    {
      "action": "create_task" | "update_task" | "assign_task" | "set_due_date" | "set_priority" | "set_status" | "create_project" | "update_project" | "create_objective" | "update_objective" | "add_note",
      "entities": [
        {
          "type": "task" | "project" | "objective" | "company" | "person" | "date" | "priority" | "status",
          "value": "normalized value (task name, project name, etc.)",
          "mentionText": "exact text from transcript",
          "context": "full surrounding sentence or phrase",
          "confidence": 0.0-1.0
        }
      ],
      "context": "what is this action about and why",
      "confidence": 0.0-1.0
    }
  ]
}

**Examples:**

Input: "I need to finish the Love Warranty claims review by Friday, it's urgent"
Output:
{
  "intents": [
    {
      "action": "create_task",
      "entities": [
        {"type": "task", "value": "Claims review", "mentionText": "claims review", "context": "finish the Love Warranty claims review by Friday", "confidence": 0.95},
        {"type": "company", "value": "Love Warranty", "mentionText": "Love Warranty", "context": "Love Warranty claims review", "confidence": 1.0},
        {"type": "date", "value": "Friday", "mentionText": "Friday", "context": "by Friday", "confidence": 1.0},
        {"type": "priority", "value": "high", "mentionText": "urgent", "context": "it's urgent", "confidence": 0.9}
      ],
      "context": "Create urgent task for claims review at Love Warranty, due Friday",
      "confidence": 0.95
    }
  ]
}

Input: "The DGS integration is at risk, we're blocked on API access from their team"
Output:
{
  "intents": [
    {
      "action": "update_objective",
      "entities": [
        {"type": "objective", "value": "DGS integration", "mentionText": "DGS integration", "context": "The DGS integration is at risk", "confidence": 0.95},
        {"type": "company", "value": "DGS", "mentionText": "DGS", "context": "DGS integration", "confidence": 1.0},
        {"type": "status", "value": "at_risk", "mentionText": "at risk", "context": "is at risk", "confidence": 1.0}
      ],
      "context": "DGS integration objective status changed to at risk",
      "confidence": 0.95
    },
    {
      "action": "add_note",
      "entities": [
        {"type": "objective", "value": "DGS integration", "mentionText": "DGS integration", "context": "blocked on DGS integration", "confidence": 0.9}
      ],
      "context": "Blocked on API access from their team",
      "confidence": 0.9
    }
  ]
}

**Critical:** 
- Extract EVERY temporal reference as a date entity (tomorrow, Friday, next week, EOD, Q1, March 15, in 3 days)
- Be generous - propose actions even if uncertain (confidence score handles this)
- Capture full context - it helps with entity matching and user review
- If something could be interpreted multiple ways, create multiple intents with lower confidence`;

export async function extractIntents(
  transcript: string
): Promise<ExtractedIntent[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Upgraded from gpt-4o-mini for better extraction quality
      messages: [
        { role: 'system', content: INTENT_EXTRACTION_PROMPT },
        { role: 'user', content: transcript }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3 // Lower temperature for more consistent extraction
    });

    const result = JSON.parse(response.choices[0].message.content || '{"intents":[]}');
    const intents = result.intents || [];
    
    // Parse date entities automatically
    for (const intent of intents) {
      if (intent.entities) {
        for (const entity of intent.entities) {
          if (entity.type === 'date') {
            const parsed = parseDate(entity.value);
            if (parsed) {
              entity.parsedDate = parsed;
              entity.value = parsed.iso; // Normalize to ISO format
              // Update confidence based on parsing confidence
              entity.confidence = Math.min(entity.confidence, parsed.confidence);
            }
          }
        }
      }
    }
    
    return intents;
  } catch (error) {
    console.error('Intent extraction error:', error);
    throw new Error('Failed to extract intents from transcript');
  }
}

/**
 * Clean and normalize extracted values
 */
export function normalizeEntityValue(type: string, value: string): string {
  switch (type) {
    case 'priority':
      const lower = value.toLowerCase();
      if (lower.includes('high') || lower.includes('urgent')) return 'high';
      if (lower.includes('medium') || lower.includes('normal')) return 'medium';
      if (lower.includes('low')) return 'low';
      return 'medium';
    
    case 'status':
      const statusLower = value.toLowerCase();
      if (statusLower.includes('complete') || statusLower.includes('done')) return 'completed';
      if (statusLower.includes('progress') || statusLower.includes('working')) return 'in_progress';
      if (statusLower.includes('block')) return 'blocked';
      if (statusLower.includes('risk')) return 'at_risk';
      if (statusLower.includes('track')) return 'on_track';
      return 'active';
    
    case 'date':
      // TODO: Parse relative dates (Friday, next week, etc.) to actual dates
      // For MVP, return as-is and handle in entity matcher
      return value;
    
    default:
      return value.trim();
  }
}
