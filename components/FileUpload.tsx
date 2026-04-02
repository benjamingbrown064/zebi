'use client'

import { useState, useRef } from 'react'
import { FaUpload, FaFile, FaTimes, FaDownload } from 'react-icons/fa'

interface Attachment {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  storagePath: string
  createdAt: string
}

interface FileUploadProps {
  taskId: string
  workspaceId: string
  attachments: Attachment[]
  onUploadComplete?: (attachment: Attachment) => void
  onDelete?: (attachmentId: string) => void
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.docx']

export default function FileUpload({
  taskId,
  workspaceId,
  attachments,
  onUploadComplete,
  onDelete,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type not allowed. Supported: ${ALLOWED_EXTENSIONS.join(', ')}`
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return 'File size must be less than 10MB'
    }

    return null
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    const validationError = validateFile(file)

    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('taskId', taskId)
      formData.append('workspaceId', workspaceId)

      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      onUploadComplete?.(result.attachment)
    } catch (err) {
      setError('Failed to upload file')
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Delete this attachment?')) return

    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      onDelete?.(attachmentId)
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType === 'application/pdf') return '📄'
    if (mimeType.includes('word')) return '📝'
    return '📎'
  }

  return (
    <div>
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition ${
          isDragging
            ? 'border-accent-500 bg-accent-50'
            : 'border-gray-300 hover:border-accent-400 hover:bg-[#F3F3F3]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />
        <FaUpload className="mx-auto text-2xl text-[#C4C0C0] mb-2" />
        <p className="text-sm text-[#5a5757]">
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs text-[#A3A3A3] mt-1">
          Supported: {ALLOWED_EXTENSIONS.join(', ')} (max 10MB)
        </p>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-[#1c1b1b]">Attachments</h4>
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-[#F3F3F3] rounded"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl">{getFileIcon(attachment.mimeType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1c1b1b] truncate">
                    {attachment.filename}
                  </p>
                  <p className="text-xs text-[#A3A3A3]">
                    {formatFileSize(attachment.sizeBytes)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/attachments/${attachment.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-[#A3A3A3] hover:text-accent-600 transition"
                  title="Download"
                >
                  <FaDownload />
                </a>
                <button
                  onClick={() => handleDelete(attachment.id)}
                  className="p-2 text-[#A3A3A3] hover:text-red-600 transition"
                  title="Delete"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
