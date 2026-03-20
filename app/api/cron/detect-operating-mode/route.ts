import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildContext } from '@/lib/ai/context-builder'
import { detectOperatingMode } from '@/lib/operating-mode/detector'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const cronSecret = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const workspaces = await prisma.workspace.findMany({
      select: { id: true, modeSetBy: true, modeExpiresAt: true },
    })

    let updated = 0
    for (const ws of workspaces) {
      if (ws.modeSetBy === 'manual' && ws.modeExpiresAt && new Date() < ws.modeExpiresAt) {
        continue
      }

      try {
        const context = await buildContext(ws.id, 'system')
        const detection = detectOperatingMode(context)

        await prisma.workspace.update({
          where: { id: ws.id },
          data: {
            modeSuggested: detection.suggestedMode,
            modeSignals: detection.signals as any,
            modeUpdatedAt: new Date(),
            ...(ws.modeSetBy === 'auto' ? {
              operatingMode: detection.suggestedMode,
            } : {}),
          },
        })
        updated++
      } catch (err) {
        console.error(`Failed to detect mode for workspace ${ws.id}:`, err)
      }
    }

    return NextResponse.json({ ok: true, updated })
  } catch (error) {
    console.error('Mode detection cron failed:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
