'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer';
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileLines, faArchive } from '@fortawesome/pro-duotone-svg-icons'
import { FaPlus, FaSearch, FaFile, FaBuilding, FaFolder, FaTh, FaList, FaFilter, FaUser } from 'react-icons/fa';
import LoadingScreen from '@/components/LoadingScreen';
import { cachedFetch, DEFAULT_TTL } from '@/lib/client-cache';

interface Document {
  id: string;
  title: string;
  documentType: string;
  updatedAt: string;
  createdAt: string;
  archivedAt?: string | null;
  version: number;
  authorName?: string | null;
  createdBy?: string;
  functionTags?: string[];
  typeTags?: string[];
  stageTags?: string[];
  canonical?: boolean;
  space?: { id: string; name: string };
  project?: { id: string; name: string };
  company?: { id: string; name: string };
}

const DOCUMENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'research', label: 'Research' },
  { value: 'development', label: 'Development' },
  { value: 'financial', label: 'Financial' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'notes', label: 'Notes' },
];

const PAGE_SIZE = 25;

type TabMode = 'active' | 'archived';

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [tab, setTab] = useState<TabMode>('active');

  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchDocuments();
  }, [typeFilter, search, tab]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', PAGE_SIZE.toString());
      params.append('offset', '0');
      if (typeFilter) params.append('documentType', typeFilter);
      if (search) params.append('search', search);
      if (tab === 'archived') params.append('archived', 'true');

      const data = await cachedFetch<any>(`/api/documents?${params.toString()}`, { ttl: DEFAULT_TTL });
      if (data.success) {
        setDocuments(data.documents);
        setHasMore(data.documents.length === PAGE_SIZE);
        setPage(0);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreDocuments = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams();
      params.append('limit', PAGE_SIZE.toString());
      params.append('offset', (nextPage * PAGE_SIZE).toString());
      if (typeFilter) params.append('documentType', typeFilter);
      if (search) params.append('search', search);
      if (tab === 'archived') params.append('archived', 'true');

      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        if (data.documents.length === 0) { setHasMore(false); setLoadingMore(false); return; }
        setDocuments(prev => [...prev, ...data.documents]);
        setPage(nextPage);
        setHasMore(data.documents.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error('Failed to load more documents:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, typeFilter, search, tab]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMoreDocuments(); },
      { threshold: 1.0 }
    );
    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => { if (currentTarget) observer.unobserve(currentTarget); };
  }, [hasMore, loadingMore, loadMoreDocuments]);

  const getTypeBadge = (type: string) => {
    const typeLabel = DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F3F3F3] text-[#474747] uppercase tracking-wide">
        {typeLabel}
      </span>
    );
  };

  const renderTags = (doc: Document) => {
    const allTags = [...(doc.functionTags || []), ...(doc.typeTags || []), ...(doc.stageTags || [])];
    if (allTags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {allTags.slice(0, 4).map(tag => (
          <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-[#F3F3F3] text-[#737373]">{tag}</span>
        ))}
        {allTags.length > 4 && <span className="text-[10px] text-[#A3A3A3]">+{allTags.length - 4}</span>}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) return <LoadingScreen message="Loading documents..." />;

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <ResponsiveHeader
        title="Documents"
        subtitle={`${documents.length} document${documents.length !== 1 ? 's' : ''}`}
        primaryAction={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#F3F3F3] rounded p-1">
              <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#A3A3A3] hover:text-[#474747]'}`}><FaList className="text-sm" /></button>
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#A3A3A3] hover:text-[#474747]'}`}><FaTh className="text-sm" /></button>
            </div>
            {tab === 'active' && (
              <button onClick={() => router.push('/documents/new')} className="flex items-center gap-2 px-4 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium text-[13px] transition-colors min-h-[44px]">
                <FaPlus className="text-sm" />
                <span className="hidden sm:inline">New Document</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
          </div>
        }
        secondaryActions={[{ label: 'Search', icon: <FaSearch />, onClick: () => setIsSearchOpen(true) }]}
      >
        {/* Tabs */}
        <div className="mt-4 flex items-center gap-1 border-b border-[#E5E5E5]">
          <button
            onClick={() => setTab('active')}
            className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${tab === 'active' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-[#A3A3A3] hover:text-[#474747]'}`}
          >
            Active
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${tab === 'archived' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-[#A3A3A3] hover:text-[#474747]'}`}
          >
            <FontAwesomeIcon icon={faArchive} className="text-[11px]" />
            Archive
          </button>
          {/* Filters */}
          <div className="ml-auto relative pb-1">
            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E5E5E5] rounded text-[12px] font-medium text-[#474747] hover:bg-[#F3F3F3] transition-colors">
              <FaFilter className="text-xs" />
              <span>Filter</span>
              {typeFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] inline-block" />}
            </button>
            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-[#E5E5E5] rounded shadow-lg z-10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">Type</span>
                  {typeFilter && <button onClick={() => setTypeFilter('')} className="text-[11px] text-[#474747] hover:underline">Clear</button>}
                </div>
                <div className="space-y-0.5">
                  {DOCUMENT_TYPES.map(type => (
                    <button key={type.value} onClick={() => { setTypeFilter(type.value); setIsFilterOpen(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded text-[12px] transition-colors ${typeFilter === type.value ? 'bg-[#1A1A1A] text-white' : 'text-[#474747] hover:bg-[#F3F3F3]'}`}>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </ResponsiveHeader>

      <ResponsivePageContainer>
        <div className="py-6 md:py-10">
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-[#F3F3F3] flex items-center justify-center mx-auto mb-4">
                {tab === 'archived' ? <FontAwesomeIcon icon={faArchive} className="text-[#A3A3A3] text-xl" /> : <FaFile className="text-[#A3A3A3] text-xl" />}
              </div>
              <h3 className="text-[15px] font-medium text-[#1A1A1A] mb-1">
                {tab === 'archived' ? 'No archived documents' : 'No documents found'}
              </h3>
              <p className="text-[13px] text-[#A3A3A3]">
                {tab === 'archived' ? 'Documents you archive will appear here.' : search || typeFilter ? 'Try adjusting your filters.' : 'Create your first document to get started.'}
              </p>
              {tab === 'active' && !search && !typeFilter && (
                <button onClick={() => router.push('/documents/new')} className="mt-4 px-5 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium text-[13px] transition-colors">
                  Create Document
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-white rounded border border-[#E5E5E5] overflow-hidden">
              {documents.map(doc => {
                const allTags = [...(doc.functionTags || []), ...(doc.typeTags || []), ...(doc.stageTags || [])]
                return (
                  <div key={doc.id} onClick={() => router.push(`/documents/${doc.id}`)}
                    className="flex items-center gap-4 px-5 py-3 border-b border-[#F3F3F3] hover:bg-[#F9F9F9] cursor-pointer transition-colors last:border-0">
                    {/* Icon */}
                    <div className="w-7 h-7 rounded bg-[#F3F3F3] flex items-center justify-center flex-shrink-0">
                      <FontAwesomeIcon icon={faFileLines} className="text-[#474747] text-[11px]" />
                    </div>
                    {/* Title + author */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(doc.company || doc.space) && <span className="text-[11px] text-[#737373] truncate">{(doc.company || doc.space)!.name}</span>}
                        {doc.authorName && <span className="text-[11px] text-[#A3A3A3] flex-shrink-0">· {doc.authorName}</span>}
                      </div>
                    </div>
                    {/* Tags + type + date — right side, inline */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {allTags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-[#F3F3F3] text-[#737373] hidden sm:inline">{tag}</span>
                      ))}
                      {getTypeBadge(doc.documentType)}
                      <p className="text-[11px] text-[#A3A3A3] hidden md:block">{formatDate(doc.updatedAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {documents.map(doc => (
                <div key={doc.id} onClick={() => router.push(`/documents/${doc.id}`)}
                  className="bg-white rounded border border-[#E5E5E5] p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow cursor-pointer">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded bg-[#F3F3F3] flex items-center justify-center flex-shrink-0">
                      <FontAwesomeIcon icon={faFileLines} className="text-[#474747]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-semibold text-[#1A1A1A] truncate">{doc.title}</h3>
                      {getTypeBadge(doc.documentType)}
                    </div>
                  </div>
                  <div className="space-y-1 mb-3 text-[12px] text-[#474747]">
                    {(doc.company || doc.space) && <div className="flex items-center gap-1.5"><FaBuilding className="text-[#C6C6C6]" />{(doc.company || doc.space)!.name}</div>}
                    {doc.project && <div className="flex items-center gap-1.5"><FaFolder className="text-[#C6C6C6]" />{doc.project.name}</div>}
                    {doc.authorName && <div className="flex items-center gap-1.5"><FaUser className="text-[#C6C6C6]" />{doc.authorName}</div>}
                  </div>
                  {renderTags(doc)}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F3F3F3] text-[11px] text-[#A3A3A3]">
                    <span>{formatDate(doc.updatedAt)}</span>
                    <span>v{doc.version}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div ref={observerTarget} className="py-6 flex justify-center">
            {loadingMore && <div className="w-4 h-4 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" />}
            {!loadingMore && !hasMore && documents.length > 0 && <p className="text-[12px] text-[#C6C6C6]">All documents loaded</p>}
          </div>
        </div>
      </ResponsivePageContainer>

      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-12 px-4" onClick={() => setIsSearchOpen(false)}>
          <div className="bg-white w-full max-w-2xl rounded shadow-lg p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 rounded px-4 py-3">
              <FaSearch className="text-[#A3A3A3]" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search documents..." autoFocus
                className="flex-1 outline-none bg-transparent text-[#1A1A1A] text-[15px] placeholder-[#A3A3A3]" />
              {search && <button onClick={() => setSearch('')} className="text-[#A3A3A3] hover:text-[#474747]">✕</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
