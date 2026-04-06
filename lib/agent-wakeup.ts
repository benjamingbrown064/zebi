/**
 * Agent Wakeup
 *
 * When a task is assigned (ownerAgent set) or a handoff is created,
 * immediately fire a bus message to the receiving agent so they know
 * work is waiting — without having to wait for the next 30-min poll.
 *
 * Fire-and-forget: never throws, never blocks the caller.
 */

import { prisma } from './prisma'

const VALID_AGENTS = ['harvey', 'theo', 'doug', 'casper', 'ben']

interface WakeupParams {
  workspaceId: string
  toAgent:     string
  taskId?:     string
  taskTitle?:  string
  handoffId?:  string
  fromAgent?:  string    // who assigned / who handed off
  reason?:     'task_assigned' | 'handoff_created' | 'message_action_required'
  companyId?:  string
  projectId?:  string
}

export async function wakeupAgent(params: WakeupParams): Promise<void> {
  try {
    if (!params.toAgent || !VALID_AGENTS.includes(params.toAgent)) return

    const { workspaceId, toAgent, taskId, taskTitle, handoffId, fromAgent, reason, companyId, projectId } = params

    let subject = ''
    let body    = ''

    if (reason === 'task_assigned' || (!reason && taskId)) {
      subject = `New task assigned to you`
      body    = taskTitle
        ? `You have been assigned a new task: "${taskTitle}".\n\nCheck your queue and start when ready.${handoffId ? `\n\nHandoff ID: ${handoffId}` : ''}`
        : `A new task has been assigned to you. Check your workload queue.`
      if (fromAgent) body += `\n\nAssigned by: ${fromAgent}`
    } else if (reason === 'handoff_created') {
      subject = `Handoff waiting for you`
      body    = `${fromAgent ?? 'An agent'} has created a handoff addressed to you${taskTitle ? ` for task: "${taskTitle}"` : ''}.\n\nAccept it at your next work cycle or check now:\nGET /api/agents/workload`
    } else {
      subject = `Action required`
      body    = `You have a message that requires action. Check your inbox.`
    }

    await prisma.agentMessage.create({
      data: {
        workspaceId,
        threadId:      '',          // will be self-set below
        fromAgent:     'system',
        toAgent,
        subject,
        body,
        taskId:        taskId    ?? null,
        handoffId:     handoffId ?? null,
        companyId:     companyId ?? null,
        projectId:     projectId ?? null,
        actionRequired: true,
      },
    }).then(async (msg) => {
      // Set threadId = own id
      await prisma.agentMessage.update({
        where: { id: msg.id },
        data:  { threadId: msg.id },
      })

      // Log to activity feed
      await prisma.activityLog.create({
        data: {
          workspaceId,
          eventType:    'agent_message',
          eventPayload: {
            messageId:      msg.id,
            threadId:       msg.id,
            fromAgent:      'system',
            toAgent,
            subject,
            bodyPreview:    body.slice(0, 200),
            isReply:        false,
            actionRequired: true,
            taskId:         taskId ?? null,
            handoffId:      handoffId ?? null,
            wakeupReason:   reason ?? 'task_assigned',
          },
          createdBy:  '00000000-0000-0000-0000-000000000000',
          aiAgent:    'system',
          companyId:  companyId ?? null,
          projectId:  projectId ?? null,
          taskId:     taskId    ?? null,
        },
      }).catch(() => {})
    }).catch(() => {})

  } catch {
    // Never throw — wakeup is always best-effort
  }
}
