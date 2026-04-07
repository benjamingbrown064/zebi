'use client';
import LoadingScreen from '@/components/LoadingScreen';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
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
  createdAt: string;
  updatedAt: string;
  space?: { id: string; name: string };
  project?: { id: string; name: string };
  versions: Array<{
    id: string;
    version: number;
    createdAt: string;
    authorName?: string;
    authorAgent?: string;
    authorType?: string;
    changeDescription?: string;
    changeTags?: string[];
    snapshotTitle?: string;
  }>;
  functionTags?: string[];
  typeTags?: string[];
  stageTags?: string[];
  canonical?: boolean;
  supersededBy?: string | null;
}

const FUNCTION_TAGS = ['source','core-strategy','technical','security','ops','gtm','meta']
const TYPE_TAGS     = ['brief','memo','research','spec','playbook','sop','interview','script']
const STAGE_TAGS    = ['validation','mvp','pilot','launch-ready']

function TagPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-2 py-0.5 rounded border transition font-medium ${
        active
          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
          : 'bg-white text-[#737373] border-[#E5E5E5] hover:border-[#C6C6C6] hover:text-[#1A1A1A]'
      }`}
    >
      {label}
    </button>
  )
}

function DocumentTagsPanel({ doc, onSaved }: { doc: Document; onSaved: (updated: Partial<Document>) => void }) {
  const [open, setOpen] = useState(false)
  const [functionTags, setFunctionTags] = useState<string[]>(doc.functionTags || [])
  const [typeTags, setTypeTags]         = useState<string[]>(doc.typeTags || [])
  const [stageTags, setStageTags]       = useState<string[]>(doc.stageTags || [])
  const [canonical, setCanonical]       = useState(doc.canonical || false)
  const [supersededBy, setSupersededBy] = useState(doc.supersededBy || '')
  const [saving, setSaving] = useState(false)

  function toggle(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(t => t !== val) : [...arr, val])
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionTags, typeTags, stageTags, canonical, supersededBy: supersededBy || null }),
      })
      const data = await res.json()
      if (data.success) {
        onSaved({ functionTags, typeTags, stageTags, canonical, supersededBy: supersededBy || null })
      }
    } finally { setSaving(false) }
  }

  const allTags = [...functionTags, ...typeTags, ...stageTags]

  return (
    <div className="border border-[#E5E5E5] rounded overflow-hidden mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F9F9F9] hover:bg-[#F3F3F3] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">Tags</span>
          {canonical && <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded uppercase tracking-wide">Canonical</span>}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allTags.slice(0, 4).map(t => (
                <span key={t} className="text-[10px] bg-[#F3F3F3] text-[#474747] px-1.5 py-0.5 rounded">{t}</span>
              ))}
              {allTags.length > 4 && <span className="text-[10px] text-[#A3A3A3]">+{allTags.length - 4}</span>}
            </div>
          )}
        </div>
        <svg className={`w-3.5 h-3.5 text-[#A3A3A3] transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
      </button>

      {open && (
        <div className="px-4 py-4 space-y-4 bg-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Function</p>
            <div className="flex flex-wrap gap-1.5">
              {FUNCTION_TAGS.map(t => (
                <TagPill key={t} label={t} active={functionTags.includes(t)} onClick={() => toggle(functionTags, setFunctionTags, t)} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Type</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_TAGS.map(t => (
                <TagPill key={t} label={t} active={typeTags.includes(t)} onClick={() => toggle(typeTags, setTypeTags, t)} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Stage</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGE_TAGS.map(t => (
                <TagPill key={t} label={t} active={stageTags.includes(t)} onClick={() => toggle(stageTags, setStageTags, t)} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={canonical}
                onChange={e => setCanonical(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span className="text-[12px] text-[#474747] font-medium">Canonical</span>
            </label>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1.5">Superseded by (doc ID)</p>
            <input
              value={supersededBy}
              onChange={e => setSupersededBy(e.target.value)}
              placeholder="Paste document ID…"
              className="w-full text-[12px] border border-[#E5E5E5] rounded px-3 py-1.5 bg-[#F9F9F9] focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 bg-[#1A1A1A] text-white text-[12px] font-medium rounded hover:bg-black transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save tags'}
          </button>
        </div>
      )}
    </div>
  )
}

interface DocumentVersion {
  id: string;
  version: number;
  contentRich: any;
  createdAt: string;
}

function DocumentMetaPanel({ doc }: { doc: Document }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="border border-[#E5E5E5] rounded overflow-hidden mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F9F9F9] hover:bg-[#F3F3F3] transition-colors"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">Document Info</span>
        <svg className={`w-3.5 h-3.5 text-[#A3A3A3] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
      </button>
      
      {open && (
        <div className="px-4 py-4 space-y-3 bg-white">
          {[
            { label: 'Created', value: doc.createdAt ? new Date(doc.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null },
            { label: 'Last edited', value: doc.updatedAt ? new Date(doc.updatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null },
            { label: 'Version', value: doc.version ? `v${doc.version}` : null },
            { label: 'Space', value: doc.space?.name || null },
            { label: 'Project', value: doc.project?.name || null },
          ].filter(r => r.value).map(r => (
            <div key={r.label} className="flex items-start justify-between gap-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#A3A3A3] flex-shrink-0">{r.label}</span>
              <span className="text-[12px] text-[#474747] text-right">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
        className="inline-flex items-center gap-2 px-4 py-2  text-[#474747] rounded hover:bg-[#F3F3F3] transition text-[13px] font-medium"
      >
        <FaFileDownload />
        Export
        <FaChevronDown className="text-[10px]" />
      </button>
      {isOpen && (
        <div
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          className="absolute right-0 mt-1 w-48 bg-white  rounded shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden z-50"
        >
          <button
            onClick={() => {
              onExport('markdown');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-[13px] text-[#474747] hover:bg-[#F3F3F3] transition"
          >
            Export as Markdown
          </button>
          <button
            onClick={() => {
              onExport('html');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-[13px] text-[#474747] hover:bg-[#F3F3F3] transition"
          >
            Export as HTML
          </button>
          <button
            onClick={() => {
              onExport('pdf');
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-[13px] text-[#474747] hover:bg-[#F3F3F3] transition"
          >
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
}

const CHANGE_TAG_COLORS: Record<string, string> = {
  content:   'bg-blue-50 text-blue-700',
  title:     'bg-purple-50 text-purple-700',
  structure: 'bg-orange-50 text-orange-700',
  tags:      'bg-[#F3F3F3] text-[#474747]',
  minor:     'bg-[#F3F3F3] text-[#A3A3A3]',
  major:     'bg-black text-white',
  fix:       'bg-yellow-50 text-yellow-700',
  rewrite:   'bg-red-50 text-red-700',
}

const AUTHOR_TYPE_ICON: Record<string, string> = {
  agent: '🤖',
  user:  '👤',
  system: '⚙️',
}

function VersionList({ versions, document, selectedVersion, onView }: {
  versions: Document['versions'];
  document: Document;
  selectedVersion: DocumentVersion | null;
  onView: (v: DocumentVersion) => void;
}) {
  if (versions.length === 0) {
    return <p className="text-[12px] text-[#A3A3A3] text-center py-6">No version history yet.<br/>Versions are created when you save content changes.</p>
  }

  return (
    <div className="space-y-2">
      {versions.map((v) => {
        const isCurrent = v.version === document.version
        const isSelected = selectedVersion?.id === v.id
        return (
          <button
            key={v.id}
            onClick={() => onView(v as any)}
            className={`w-full text-left p-3 rounded border transition ${
              isSelected
                ? 'border-[#1A1A1A] bg-[#F9F9F9]'
                : 'border-[#E5E5E5] hover:border-[#C6C6C6] hover:bg-[#F9F9F9]'
            }`}
          >
            {/* Version + current badge */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[13px] font-semibold text-[#1A1A1A]">v{v.version}</span>
              {isCurrent && (
                <span className="text-[10px] px-1.5 py-0.5 bg-[#1A1A1A] text-white rounded uppercase tracking-wide font-medium">Current</span>
              )}
            </div>

            {/* Author */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[11px]">{AUTHOR_TYPE_ICON[v.authorType || 'user']}</span>
              <span className="text-[12px] font-medium text-[#474747]">
                {v.authorName || (v.authorAgent ? v.authorAgent.charAt(0).toUpperCase() + v.authorAgent.slice(1) : 'Unknown')}
              </span>
              <span className="text-[11px] text-[#A3A3A3]">
                {new Date(v.createdAt).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>

            {/* Change description */}
            {v.changeDescription && (
              <p className="text-[12px] text-[#474747] mb-1.5 leading-snug">{v.changeDescription}</p>
            )}

            {/* Change tags */}
            {v.changeTags && v.changeTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {v.changeTags.map(tag => (
                  <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CHANGE_TAG_COLORS[tag] || 'bg-[#F3F3F3] text-[#474747]'}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
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

    // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveDescription, setSaveDescription] = useState('');
  const [saveTags, setSaveTags] = useState<string[]>([]);
  const SAVE_TAG_OPTIONS = ['content', 'structure', 'title', 'tags', 'minor', 'major', 'fix', 'rewrite'];

  const saveDocument = useCallback(async (opts?: { autoSave?: boolean; changeDescription?: string; changeTags?: string[] }) => {
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
          autoSave: opts?.autoSave ?? false, // auto-save won't create a version
          changeDescription: opts?.changeDescription || undefined,
          changeTags: opts?.changeTags || undefined,
          authorName: 'Benjamin',
          authorType: 'user',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDocument(data.document);
        if (showVersionHistory) fetchVersions();
      }
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setSaving(false);
    }
  }, [documentId, title, documentType, content, saving, showVersionHistory]);

  const createVersion = async () => {
    setShowSaveModal(true);
  };

  const handleSaveWithLog = async () => {
    if (!documentId) return;
    setShowSaveModal(false);
    await saveDocument({ changeDescription: saveDescription, changeTags: saveTags });
    setSaveDescription('');
    setSaveTags([]);
    fetchVersions();
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
    // If content already loaded (from full version object), use it
    if (version.contentRich) {
      setContent(version.contentRich);
      return;
    }
    // Otherwise fetch from dedicated endpoint
    try {
      const res = await fetch(`/api/documents/${documentId}/versions/${version.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedVersion(data.version);
        setContent(data.version.contentRich);
      }
    } catch (e) {
      console.error('Failed to fetch version content:', e);
    }
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
          changeDescription: `Restored from v${selectedVersion.version}`,
          changeTags: ['content'],
          authorName: 'Benjamin',
          authorType: 'user',
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
    return <LoadingScreen message="Loading document..." />;
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-[#F9F9F9]">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#1A1C1C] mb-2">Document not found</h2>
            <Link href="/documents" className="text-accent-600 hover:underline">
              Back to documents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-[#F9F9F9]">
      <div>

        {/* Header */}
        <div className="bg-white sticky top-0 z-20 border-b border-[#F0F0F0]">
          <div className="px-4 md:px-8 lg:px-12 py-3 md:py-5">

            {/* Row 1: Back + Title */}
            <div className="flex items-center gap-2 md:gap-4 mb-3">
              <Link
                href="/documents"
                className="flex-shrink-0 p-2 text-[#737373] hover:text-[#DD3A44] transition rounded-md"
              >
                <FaArrowLeft />
              </Link>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => saveDocument({ autoSave: true })}
                className="flex-1 min-w-0 text-[18px] md:text-[24px] leading-[28px] md:leading-[32px] font-medium text-[#1A1A1A] border-none focus:outline-none focus:ring-2 focus:ring-[#DD3A44] rounded px-2 py-1"
                placeholder="Untitled Document"
              />
            </div>

            {/* Row 2: Actions — scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <select
                value={documentType}
                onChange={(e) => { setDocumentType(e.target.value); saveDocument({ autoSave: true }); }}
                className="flex-shrink-0 px-3 py-2 rounded text-[12px] md:text-[13px] font-medium text-[#474747] focus:outline-none focus:ring-2 focus:ring-[#DD3A44] border border-[#E5E5E5] bg-white"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              <button
                onClick={() => { setShowVersionHistory(!showVersionHistory); if (!showVersionHistory) fetchVersions(); }}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-[#474747] rounded hover:bg-[#F3F3F3] transition text-[12px] md:text-[13px] font-medium whitespace-nowrap"
              >
                <FaHistory />
                <span className="hidden sm:inline">History</span>
              </button>

              <ExportDropdown onExport={exportDocument} />

              <button
                onClick={createVersion}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-[#000000] text-white rounded hover:bg-[#1A1C1C] transition text-[12px] md:text-[13px] font-medium whitespace-nowrap"
              >
                <FaSave />
                <span>Save Version</span>
              </button>

              <button
                onClick={deleteDocument}
                className="flex-shrink-0 p-2 text-[#DC2626] hover:bg-[#F3F3F3] rounded-md transition"
              >
                <FaTrash />
              </button>
            </div>

            {selectedVersion && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-sm text-yellow-800">
                  Viewing version {selectedVersion.version} from{' '}
                  {new Date(selectedVersion.createdAt).toLocaleString()}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={restoreVersion}
                    className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => { setSelectedVersion(null); setContent(document.contentRich); }}
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
        <div className="px-2 sm:px-4 md:px-8 lg:px-12 py-4 md:py-6">
          <div className="flex gap-4 md:gap-6">
            {/* Editor */}
            <div className="flex-1 min-w-0">
              {/* Document Info Panel */}
              <DocumentMetaPanel doc={document} />

              {/* Tags Panel */}
              <DocumentTagsPanel
                doc={document}
                onSaved={(updated) => setDocument(prev => prev ? { ...prev, ...updated } : prev)}
              />
              
              <div className="bg-white rounded overflow-hidden">
                {content && (
                  <DocumentEditor
                    content={content}
                    onChange={setContent}
                    onSave={() => saveDocument({ autoSave: true })}
                    autoSave={true}
                    autoSaveDelay={30000}
                  />
                )}
              </div>
            </div>

            {/* Version history sidebar — full-screen sheet on mobile */}
            {showVersionHistory && (
              <>
                {/* Mobile: bottom sheet overlay */}
                <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setShowVersionHistory(false)} />
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[20px] p-5 max-h-[60vh] overflow-y-auto md:hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[#1A1C1C]">Version History</h3>
                    <button onClick={() => setShowVersionHistory(false)} className="p-1 text-[#A3A3A3]"><FaTimes /></button>
                  </div>
                  <VersionList versions={versions} document={document} selectedVersion={selectedVersion} onView={viewVersion} />
                </div>

                {/* Desktop: sidebar */}
                <div className="hidden md:block w-72 lg:w-80 flex-shrink-0 bg-white rounded p-4 self-start sticky top-28">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[#1A1C1C]">Version History</h3>
                    <button onClick={() => setShowVersionHistory(false)} className="p-1 text-[#A3A3A3] hover:text-[#474747]"><FaTimes /></button>
                  </div>
                  <VersionList versions={versions} document={document} selectedVersion={selectedVersion} onView={viewVersion} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Save with log modal - outside main div, inside fragment */}
    {/* Save with log modal */}
    {showSaveModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={e => { if (e.target === e.currentTarget) setShowSaveModal(false) }}>
        <div className="bg-white w-full max-w-[480px] rounded p-6" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
          <h2 className="text-[18px] font-bold text-[#1A1A1A] mb-1">Save version</h2>
          <p className="text-[13px] text-[#737373] mb-5">Add a short description of what changed. This appears in the version history.</p>

          <div className="mb-4">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-1.5">Change description</label>
            <input
              value={saveDescription}
              onChange={e => setSaveDescription(e.target.value)}
              placeholder="e.g. Rewrote introduction, added security section…"
              autoFocus
              className="w-full text-[13px] border border-[#E5E5E5] rounded px-3 py-2 bg-white focus:outline-none focus:border-[#1A1A1A]"
              onKeyDown={e => { if (e.key === 'Enter') handleSaveWithLog() }}
            />
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-2">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {SAVE_TAG_OPTIONS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSaveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  className={`text-[11px] px-2.5 py-1 rounded border font-medium transition ${
                    saveTags.includes(tag)
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                      : 'bg-white text-[#737373] border-[#E5E5E5] hover:border-[#C6C6C6]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveWithLog}
              disabled={saving}
              className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-[14px] font-semibold rounded hover:bg-black transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save version'}
            </button>
            <button
              onClick={() => setShowSaveModal(false)}
              className="px-5 py-2.5 text-[14px] text-[#474747] hover:text-[#1A1A1A] transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
