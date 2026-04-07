import { prisma } from '@/lib/prisma'

export async function notifyParticipants(meeting: any, workspaceId: string) {
  for (const agent of meeting.requiredParticipants) {
    if (agent === 'ben') continue
    try {
      await prisma.agentMessage.create({
        data: {
          workspaceId,
          threadId:      meeting.id,
          fromAgent:     'system',
          toAgent:       agent,
          subject:       `Meeting: ${meeting.title}`,
          body:          `You have been asked to contribute to a meeting.\n\nTitle: ${meeting.title}\n\nAgenda:\n${meeting.agenda}\n\nPlease read the full meeting and post your contribution using POST /api/meetings/${meeting.id}/contribute`,
          actionRequired: true,
        },
      })
    } catch (e) {
      console.error(`[meetings] Failed to notify ${agent}:`, e)
    }
  }
}
