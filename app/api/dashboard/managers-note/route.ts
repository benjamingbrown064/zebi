import { NextRequest, NextResponse } from 'next/server'
import { buildContext, formatContextForPrompt } from '@/lib/ai/context-builder'
import { requireWorkspace } from '@/lib/workspace'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { OperatingMode, MODE_META } from '@/lib/operating-mode/detector'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Cache: one note per workspace, TTL 30 minutes
const noteCache = new Map<string, { note: string; mode: string; expiresAt: number }>()

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? (await supabase.auth.getUser()).data.user
    const userId = user?.id || 'system'

    const cacheKey = workspaceId
    const cached = noteCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json({ note: cached.note, mode: cached.mode })
    }

    // Get current mode
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { operatingMode: true, modeSuggested: true },
    })
    const mode = (workspace?.operatingMode || 'momentum') as OperatingMode
    const modeMeta = MODE_META[mode]

    // Build context
    const context = await buildContext(workspaceId, userId)
    const contextText = formatContextForPrompt(context)

    // Mode-specific prompt instructions
    const modeInstructions: Record<OperatingMode, string> = {
      pressure: `The founder is in PRESSURE mode. Be direct and narrowing. Focus on cash, blockers, and immediate control. Reduce choices. Call out the 1-2 things that need action today. Tone: urgent but calm.`,
      plateau: `The founder is in PLATEAU mode. Be challenging and clarifying. Identify the real bottleneck. Challenge weak focus. Call out fake progress if visible. Push for one leverage move. Tone: sharp and honest.`,
      momentum: `The founder is in MOMENTUM mode. Be reinforcing and sequencing. Protect what's working. Spot potential blockers before they grow. Keep sequencing clean. Tone: focused and confident.`,
      drift: `The founder is in DRIFT mode. Be strategic and energising. Provoke useful thought. Suggest a new game or bet. Bring energy back through clear strategic framing. Tone: provocative and energising.`,
    }

    const systemPrompt = `You are Zebi's business manager. You write sharp, short manager's notes — like a trusted operator giving a morning briefing.

Rules:
- Maximum 4 sentences
- No bullet points — flowing prose only
- Name real things from the workspace (tasks, objectives, projects, spaces)
- Sound like a sharp operator, not a chatbot
- Never say "I" — write in second person ("You have...", "The key blocker is...", "This week...")
- No filler phrases like "it looks like" or "it seems"
- ${modeInstructions[mode]}

Current mode: ${modeMeta.label} (${modeMeta.description})`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Write a manager's note based on this workspace context:\n\n${contextText}` },
      ],
      max_tokens: 200,
      temperature: 0.7,
    })

    const note = completion.choices[0]?.message?.content?.trim() || 'No note available.'

    noteCache.set(cacheKey, { note, mode, expiresAt: Date.now() + 30 * 60 * 1000 })

    return NextResponse.json({ note, mode })
  } catch (error) {
    console.error('Failed to generate manager\'s note:', error)
    // Return a fallback note so the component always renders
    const fallbackNotes: Record<string, string> = {
      pressure: 'Focus on clearing the most urgent blockers today — everything else can wait. Identify what creates cash fastest and do that first.',
      plateau: 'The business is stable but progress is flat. Pick one bottleneck and push hard against it this week.',
      momentum: 'Things are moving — protect the flow. Keep priorities clean and watch for anything that could slow execution.',
      drift: 'Energy has softened. Pick one bold move and commit to it this week — maintenance alone won\'t move the business.',
    }
    const mode = 'momentum'
    return NextResponse.json({ 
      note: fallbackNotes[mode], 
      mode 
    })
  }
}
