'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DocumentEditor from '@/components/DocumentEditor';
import {
  FaArrowLeft,
  FaSave,
  FaFileDownload,
  FaHistory,
  FaTrash,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';

interface Document {
  id: string;
  title: string;
  documentType: string;
  contentRich: any;
  version: number;
  updatedAt: string;
  company?: { id: string; name: string };
  project?: { id: string; name: string };
  versions: Array<{
    id: string;
    version: number;
    createdAt: string;
  }>;
}

interface DocumentVersion {
  id: string;
  version: number;
  contentRich: any;
  createdAt: string;
}

const DOCUMENT_TYPES = [
  { value: 'strategy', label: 'Strategy' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'research', label: 'Research' },
  { value: 'development', label: 'Development' },
  { value: 'financial', label: 'Financial' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'notes', label: 'Notes' },
];

function ExportDropdown({ onExport }: { onExport: (format: 'markdown' | 'html' | 'pdf') => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="inline-flex items-center gap-2 px-4 py-2  text-[#525252] rounded-[10px] hover:bg-[#F5F5F5] transition text-[13px] font-medium"
      >
        <FaFileDownload />
        Export
        <FaChevronDown className="text-[10px]" />
      </button>
      {isOpen && (
        <div
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          className="absolute right-0 mt-1 w-48 bg-white  rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden z-50"
        >
          <button
            onClick={() => {
              onExport('markdown');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-[13px] text-[#525252] hover:bg-[#F5F5F5] transition"
          >
            Export as Markdown
          </button>
          <button
            onClick={() => {
              onExport('html');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-[13px] text-[#525252] hover:bg-[#F5F5F5] transition"
          >
            Export as HTML
          </button>
          <button
            onClick={() => {
              onExport('pdf');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-[13px] text-[#525252] hover:bg-[#F5F5F5] transition"
          >
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
}

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('notes');
  const [content, setContent] = useState<any>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  const fetchDocument = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`);
      const data = await res.json();

      if (data.success) {
        setDocument(data.document);
        setTitle(data.document.title);
        setDocumentType(data.document.documentType);
        setContent(data.document.contentRich);
      } else {
        console.error('Failed to fetch document:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`);
      const data = await res.json();

      if (data.success) {
        setVersions(data.versions);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    }
  };

  const saveDocument = useCallback(async () => {
    if (!documentId || saving) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          documentType,
          contentRich: content,
          createVersion: false, // Auto-save doesn't create versions
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDocument(data.document);
      }
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setSaving(false);
    }
  }, [documentId, title, documentType, content, saving]);

  const createVersion = async () => {
    if (!documentId) return;

    try {
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentRich: content }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchDocument();
        await fetchVersions();
        alert('Version saved successfully');
      }
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  };

  const deleteDocument = async () => {
    if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        router.push('/documents');
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const exportDocument = async (format: 'markdown' | 'html' | 'pdf') => {
    if (!document) return;

    try {
      const { tiptapToMarkdown, createHTMLDocument, downloadFile } = await import('@/lib/document-export');

      switch (format) {
        case 'markdown':
          const markdown = tiptapToMarkdown(content);
          downloadFile(`${title}.md`, markdown, 'text/markdown');
          break;

        case 'html':
          const html = createHTMLDocument(title, content);
          downloadFile(`${title}.html`, html, 'text/html');
          break;

        case 'pdf':
          // For PDF, we'll export as HTML and let the user print to PDF
          const pdfHtml = createHTMLDocument(title, content);
          const pdfBlob = new Blob([pdfHtml], { type: 'text/html' });
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const pdfWindow = window.open(pdfUrl);
          if (pdfWindow) {
            pdfWindow.onload = () => {
              setTimeout(() => {
                pdfWindow.print();
              }, 250);
            };
          }
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
          break;
      }
    } catch (error) {
      console.error('Failed to export document:', error);
      alert('Export failed. Please try again.');
    }
  };

  const viewVersion = async (version: DocumentVersion) => {
    setSelectedVersion(version);
    setContent(version.contentRich);
  };

  const restoreVersion = async () => {
    if (!selectedVersion || !confirm('Restore this version? Current content will be replaced.')) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentRich: selectedVersion.contentRich,
          createVersion: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedVersion(null);
        await fetchDocument();
        await fetchVersions();
      }
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-cream">
        <Sidebar workspaceName="My Workspace" isCollapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        <div className="md:ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600"></div>
            <p className="text-[#5a5757] mt-4">Loading document...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-bg-cream">
        <Sidebar workspaceName="My Workspace" isCollapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        <div className="md:ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#1c1b1b] mb-2">Document not found</h2>
            <Link href="/documents" className="text-accent-600 hover:underline">
              Back to documents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-cream">
      <Sidebar workspaceName="My Workspace" isCollapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      <div className="md:ml-64">
      {/* Header */}
      <div className="bg-white sticky top-0 z-20">
        <div className="max-w-[1280px] mx-auto px-12 py-6">
          {/* First line: Document name */}
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/documents"
              className="p-2 text-[#737373] hover:text-[#DD3A44] transition rounded-[6px]"
            >
              <FaArrowLeft />
            </Link>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveDocument}
              className="flex-1 text-[24px] leading-[32px] font-medium text-[#1A1A1A] border-none focus:outline-none focus:ring-2 focus:ring-[#DD3A44] rounded-[10px] px-2 py-1"
              placeholder="Untitled Document"
            />
          </div>

          {/* Second line: Actions */}
          <div className="flex items-center gap-3">
            <select
              value={documentType}
              onChange={(e) => {
                setDocumentType(e.target.value);
                saveDocument();
              }}
              className="px-4 py-2  rounded-[10px] text-[13px] font-medium text-[#525252] focus:outline-none focus:ring-2 focus:ring-[#DD3A44] focus:border-transparent"
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setShowVersionHistory(!showVersionHistory);
                if (!showVersionHistory) fetchVersions();
              }}
              className="inline-flex items-center gap-2 px-4 py-2  text-[#525252] rounded-[10px] hover:bg-[#F5F5F5] transition text-[13px] font-medium"
            >
              <FaHistory />
              History
            </button>

            <ExportDropdown onExport={exportDocument} />

            <button
              onClick={createVersion}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#DD3A44] text-white rounded-[10px] hover:bg-[#C7333D] transition text-[13px] font-medium"
            >
              <FaSave />
              Save Version
            </button>

            <button
              onClick={deleteDocument}
              className="p-2 text-[#DC2626] hover:bg-[#FEF2F2] rounded-[6px] transition"
            >
              <FaTrash />
            </button>
          </div>

          {selectedVersion && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-[10px] flex items-center justify-between">
              <span className="text-sm text-yellow-800">
                Viewing version {selectedVersion.version} from{' '}
                {new Date(selectedVersion.createdAt).toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={restoreVersion}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                >
                  Restore This Version
                </button>
                <button
                  onClick={() => {
                    setSelectedVersion(null);
                    setContent(document.contentRich);
                  }}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                >
                  Back to Current
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Editor */}
          <div className="flex-1">
            <div className="bg-white rounded-[10px] overflow-hidden">
              {content && (
                <DocumentEditor
                  content={content}
                  onChange={setContent}
                  onSave={saveDocument}
                  autoSave={true}
                  autoSaveDelay={30000}
                />
              )}
            </div>
          </div>

          {/* Version history sidebar */}
          {showVersionHistory && (
            <div className="w-80 bg-white rounded-[14px] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#1c1b1b]">Version History</h3>
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className="p-1 text-[#A3A3A3] hover:text-[#5a5757]"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-2">
                {versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => viewVersion(version)}
                    className={`w-full text-left p-3 rounded-[10px] border transition ${
                      selectedVersion?.id === version.id
                        ? 'border-blue-500 bg-accent-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-[#f6f3f2]'
                    }`}
                  >
                    <div className="font-medium text-sm text-[#1c1b1b]">
                      Version {version.version}
                      {version.version === document.version && (
                        <span className="ml-2 px-2 py-0.5 bg-[#e6f4f4] text-[#006766] text-xs rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#A3A3A3] mt-1">
                      {new Date(version.createdAt).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
