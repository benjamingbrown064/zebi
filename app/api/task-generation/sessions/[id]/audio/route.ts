import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/workspace';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * POST /api/task-generation/sessions/:id/audio
 * Upload audio and process in background
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await requireWorkspace();
    const sessionId = params.id;

    // Get session
    const session = await prisma.taskGenerationSession.findFirst({
      where: { id: sessionId, workspaceId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'recording') {
      return NextResponse.json(
        { error: 'Session is not in recording state' },
        { status: 400 }
      );
    }

    // Parse audio file
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileExt = 'webm';
    const filePath = `${sessionId}.${fileExt}`;
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('voice-to-task-audio')
      .upload(filePath, buffer, {
        contentType: 'audio/webm',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload audio' },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('voice-to-task-audio')
      .getPublicUrl(filePath);

    // Update session
    await prisma.taskGenerationSession.update({
      where: { id: sessionId },
      data: {
        audioUrl: publicUrl,
        audioDurationSeconds: Math.round(audioFile.size / 16000),
        status: 'processing',
      },
    });

    // Process in background
    processAudioInBackground(sessionId, publicUrl, workspaceId).catch(console.error);

    return NextResponse.json({
      sessionId,
      status: 'processing',
      audioDurationSeconds: Math.round(audioFile.size / 16000),
      audioUrl: publicUrl,
    });
  } catch (error) {
    console.error('Error uploading audio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processAudioInBackground(
  sessionId: string,
  audioUrl: string,
  workspaceId: string
) {
  try {
    // Transcribe
    const audioRes = await fetch(audioUrl);
    const audioBlob = await audioRes.arrayBuffer();
    const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    const transcript = transcription.text.trim();

    // Extract tasks
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract actionable tasks from dictation. Return JSON array of {title, description, confidence}.
Rules: Short titles (3-8 words), one sentence descriptions (<120 chars), no invented metadata, max 12 tasks.`,
        },
        { role: 'user', content: `Extract tasks from: ${transcript}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    const tasks = (result.tasks || []).slice(0, 12);

    // Save candidates
    await Promise.all(
      tasks.map((task: any, index: number) =>
        prisma.generatedTaskCandidate.create({
          data: {
            taskGenerationSessionId: sessionId,
            title: task.title,
            description: task.description || null,
            confidenceScore: task.confidence || 0.8,
            selected: true,
            sortOrder: index,
          },
        })
      )
    );

    // Update session
    await prisma.taskGenerationSession.update({
      where: { id: sessionId },
      data: {
        transcriptClean: transcript,
        status: 'ready_for_review',
        generatedTaskCount: tasks.length,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Background processing error:', error);
    await prisma.taskGenerationSession.update({
      where: { id: sessionId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
