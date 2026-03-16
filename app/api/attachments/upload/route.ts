import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

// Conditionally create Supabase client if credentials exist
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export async function POST(request: Request) {
  try {
    // Check if storage is configured
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'File storage not configured. Please add SUPABASE_SERVICE_ROLE_KEY to environment variables.' },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const taskId = formData.get('taskId') as string
    const workspaceId = formData.get('workspaceId') as string

    if (!file || !taskId || !workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File type not allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB' },
        { status: 400 }
      )
    }

    // Verify task exists
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId }
    })

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${workspaceId}/${taskId}/${timestamp}_${sanitizedFilename}`

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Save metadata to database
    const attachment = await prisma.taskAttachment.create({
      data: {
        workspaceId,
        taskId,
        storagePath,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: BigInt(file.size),
      }
    })

    return NextResponse.json({
      success: true,
      attachment: {
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        sizeBytes: Number(attachment.sizeBytes),
        storagePath: attachment.storagePath,
        createdAt: attachment.createdAt.toISOString(),
      }
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
