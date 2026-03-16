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

export async function DELETE(
  request: Request,
  { params }: { params: { attachmentId: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'File storage not configured' },
        { status: 503 }
      )
    }

    const { attachmentId } = params

    // Get attachment metadata
    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId }
    })

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from('task-attachments')
      .remove([attachment.storagePath])

    if (deleteError) {
      console.error('Supabase delete error:', deleteError)
      // Continue anyway - we still want to remove from database
    }

    // Delete from database
    await prisma.taskAttachment.delete({
      where: { id: attachmentId }
    })

    return NextResponse.json({
      success: true
    })
  } catch (err) {
    console.error('Delete attachment error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: { attachmentId: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'File storage not configured' },
        { status: 503 }
      )
    }

    const { attachmentId } = params

    // Get attachment metadata
    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId }
    })

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Get signed URL from Supabase Storage
    const { data, error } = await supabase.storage
      .from('task-attachments')
      .createSignedUrl(attachment.storagePath, 60) // 60 second expiry

    if (error) {
      console.error('Supabase signed URL error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to generate download URL' },
        { status: 500 }
      )
    }

    // Redirect to signed URL
    return NextResponse.redirect(data.signedUrl)
  } catch (err) {
    console.error('Download attachment error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
