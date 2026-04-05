'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer';
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader';
import MobileListItem from '@/components/responsive/MobileListItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileLines } from '@fortawesome/pro-duotone-svg-icons'
import { FaPlus, FaSearch, FaFile, FaBuilding, FaFolder, FaTh, FaList, FaFilter } from 'react-icons/fa';
import LoadingScreen from '@/components/LoadingScreen';

interface Document {
  id: string;
  title: string;
  documentType: string;
  updatedAt: string;
  version: number;
  space?: { id: string; name: string };
  project?: { id: string; name: string };
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  }, [typeFilter, search]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', PAGE_SIZE.toString());
      params.append('offset', '0');
      if (typeFilter) params.append('documentType', typeFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await res.json();
      
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

      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        if (data.documents.length === 0) {
          setHasMore(false);
          setLoadingMore(false);
          return;
        }

        setDocuments(prev => [...prev, ...data.documents]);
        setPage(nextPage);
        setHasMore(data.documents.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error('Failed to load more documents:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, typeFilter, search]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreDocuments();
        }
      },
      { threshold: 1.0 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loadMoreDocuments]);

  const getDocumentIcon = (type: string) => {
    return <FontAwesomeIcon icon={faFileLines} className="text-[#DD3A44]" />;
  };

  const getTypeBadge = (type: string) => {
    const typeLabel = DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
    return (
      <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#F3F3F3] text-[#474747]">
        {typeLabel}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return <LoadingScreen message="Loading documents..." />;
  }

  const mainPaddingClass = isMobile ? '' : sidebarCollapsed ? 'ml-20' : 'ml-64';

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className={mainPaddingClass}>
        <ResponsiveHeader
          title="Documents"
          subtitle={`${documents.length} document${documents.length !== 1 ? 's' : ''}`}
          primaryAction={
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center gap-1 bg-[#F3F3F3] rounded p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#A3A3A3] hover:text-[#474747]'
                  }`}
                  aria-label="List view"
                >
                  <FaList className="text-sm" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#A3A3A3] hover:text-[#474747]'
                  }`}
                  aria-label="Grid view"
                >
                  <FaTh className="text-sm" />
                </button>
              </div>
              
              <button
                onClick={() => router.push('/documents/new')}
                className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium text-[13px] md:text-[15px] transition-colors min-h-[44px]"
              >
                <FaPlus className="text-sm" />
                <span className="hidden sm:inline">New Document</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          }
          secondaryActions={[
            {
              label: 'Search',
              icon: <FaSearch />,
              onClick: () => setIsSearchOpen(true),
            },
          ]}
        >
          {/* Filters button */}
          <div className="mt-4 relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5E5E5] rounded text-[13px] font-medium text-[#474747] hover:bg-[#F3F3F3] transition-colors min-h-[44px]"
            >
              <FaFilter className="text-xs" />
              <span>Filters</span>
              {typeFilter && <span className="px-2 py-0.5 bg-[#DD3A44] text-white text-[11px] rounded-full">1</span>}
            </button>
            
            {isFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-[#E5E5E5] rounded shadow-lg z-10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">Type</span>
                  {typeFilter && (
                    <button
                      onClick={() => setTypeFilter('')}
                      className="text-[11px] text-[#DD3A44] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {DOCUMENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setTypeFilter(type.value);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-[13px] transition-colors ${
                        typeFilter === type.value
                          ? 'bg-[#FEF2F2] text-[#DD3A44] font-medium'
                          : 'text-[#474747] hover:bg-[#F3F3F3]'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ResponsiveHeader>

        <ResponsivePageContainer>
          <div className="py-6 md:py-12">
            {documents.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <div className="w-16 h-16 rounded-full bg-[#F3F3F3] flex items-center justify-center mx-auto mb-4">
                  <FaFile className="text-[#A3A3A3] text-2xl" />
                </div>
                <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No documents found</h3>
                <p className="text-[#A3A3A3] mb-6">
                  {search || typeFilter
                    ? 'Try adjusting your filters'
                    : 'Get started by creating your first document'}
                </p>
                {!search && !typeFilter && (
                  <button
                    onClick={() => router.push('/documents/new')}
                    className="px-6 py-3 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium transition-colors min-h-[44px]"
                  >
                    Create First Document
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* List View */}
                {viewMode === 'list' && (
                  <div className="bg-white rounded border border-[#E5E5E5] overflow-hidden">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => router.push(`/documents/${doc.id}`)}
                        className="flex items-center gap-4 px-5 py-3.5 border-b border-[#F3F3F3] hover:bg-[#F9F9F9] cursor-pointer transition-colors last:border-0"
                      >
                        {/* Icon */}
                        <div className="w-8 h-8 rounded bg-[#F3F3F3] flex items-center justify-center flex-shrink-0">
                          <FontAwesomeIcon icon={faFileLines} className="text-[#474747] text-[13px]" />
                        </div>
                        
                        {/* Title + meta */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{doc.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {doc.space && <span className="text-[11px] text-[#737373]">{doc.space.name}</span>}
                            {doc.project && <span className="text-[11px] text-[#A3A3A3]">{doc.project.name}</span>}
                          </div>
                        </div>
                        
                        {/* Type badge */}
                        {getTypeBadge(doc.documentType)}
                        
                        {/* Updated + version — right side */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-[12px] text-[#737373]">{formatDate(doc.updatedAt)}</p>
                          <p className="text-[10px] text-[#C6C6C6]">v{doc.version}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Grid View */}
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => router.push(`/documents/${doc.id}`)}
                        className="bg-white rounded p-6 hover:shadow-[0_20px_40px_rgba(28,27,27,0.06)] transition-shadow cursor-pointer"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-md bg-[#FEF2F2] flex items-center justify-center flex-shrink-0">
                              {getDocumentIcon(doc.documentType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[15px] font-medium text-[#1A1A1A] truncate">
                                {doc.title}
                              </h3>
                              {getTypeBadge(doc.documentType)}
                            </div>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-2 mb-4">
                          {doc.space && (
                            <div className="flex items-center gap-2 text-[12px] text-[#474747]">
                              <FaBuilding className="text-[#A3A3A3]" />
                              <span>{doc.space.name}</span>
                            </div>
                          )}
                          {doc.project && (
                            <div className="flex items-center gap-2 text-[12px] text-[#474747]">
                              <FaFolder className="text-[#A3A3A3]" />
                              <span>{doc.project.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 text-[12px] text-[#A3A3A3]">
                          <span>Updated {formatDate(doc.updatedAt)}</span>
                          <span>v{doc.version}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="py-8 flex justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-[#A3A3A3]">
                  <div className="w-4 h-4 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" />
                  <span className="text-[13px]">Loading more documents...</span>
                </div>
              )}
              {!loadingMore && !hasMore && documents.length > 0 && (
                <p className="text-[13px] text-[#A3A3A3]">All documents loaded</p>
              )}
            </div>
          </div>
        </ResponsivePageContainer>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-12 md:pt-20 px-4"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded shadow-[0_20px_40px_rgba(28,27,27,0.06)] p-4 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3  rounded px-4 py-3">
              <FaSearch className="text-[#A3A3A3]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents..."
                className="flex-1 outline-none bg-transparent text-[#1A1A1A] text-[15px] placeholder-[#A3A3A3]"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-[#A3A3A3] hover:text-[#474747] min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
