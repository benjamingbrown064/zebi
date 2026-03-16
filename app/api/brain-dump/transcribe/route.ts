import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { processBrainDumpSession } from '@/lib/brain-dump/processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for processing

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Transcribe audio from a brain dump session
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const sessionId = formData.get('sessionId') as string;
    const audioFile = formData.get('audio') as File;

    if (!sessionId || !audioFile) {
      return NextResponse.json(
        { error: 'sessionId and audio file required' },
        { status: 400 }
      );
    }

    // Get the brain dump session
    const brainDumpSession = await prisma.brainDumpSession.findUnique({
      where: { id: sessionId }
    });

    if (!brainDumpSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update status to processing
    await prisma.brainDumpSession.update({
      where: { id: sessionId },
      data: {
        status: 'transcribed',
        processingStartedAt: new Date()
      }
    });

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['word']
    });

    // Store transcript
    await prisma.brainDumpSession.update({
      where: { id: sessionId },
      data: {
        transcriptRaw: transcription.text,
        transcriptClean: transcription.text, // TODO: Clean in next step
        status: 'transcribed'
      }
    });

    // Trigger Phase 2 processing (run synchronously to ensure it completes)
    // Note: We await here so Vercel doesn't kill the function before processing finishes
    try {
      await processBrainDumpSession(sessionId);
      console.log(`[${sessionId}] Processing completed successfully`);
    } catch (processingErr) {
      console.error(`[${sessionId}] Processing failed:`, processingErr);
      // Don't fail the whole request - transcription succeeded
    }

    return NextResponse.json({
      success: true,
      transcript: transcription.text,
      duration: transcription.duration
    });
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Update session status to failed
    const formData = await req.formData();
    const sessionId = formData.get('sessionId') as string;
    if (sessionId) {
      await prisma.brainDumpSession.update({
        where: { id: sessionId },
        data: { status: 'failed' }
      }).catch(() => {});
    }

    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    );
  }
}
