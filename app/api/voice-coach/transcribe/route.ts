import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Transcribe audio from voice coaching session
 */
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

    console.log(`[Voice Coach ${sessionId}] Transcribing audio:`, {
      size: audioFile.size,
      type: audioFile.type,
      name: audioFile.name
    });

    // Check if audio file is too small (likely empty or corrupted)
    if (audioFile.size < 1000) {
      console.warn(`[Voice Coach ${sessionId}] Audio file suspiciously small: ${audioFile.size} bytes`);
    }

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text',
      prompt: 'User is describing a business goal with timeline, success criteria, and potential risks.' // Helps Whisper context
    });

    console.log(`[Voice Coach ${sessionId}] Transcription complete (${transcription.length} chars):`, transcription);

    return NextResponse.json({
      success: true,
      transcript: transcription,
      duration: audioFile.size / 16000 // Rough estimate (16kHz audio)
    });
  } catch (error) {
    console.error('Voice coach transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    );
  }
}
