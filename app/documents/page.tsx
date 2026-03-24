'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer';
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader';
import MobileListItem from '@/components/responsive/MobileListItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileLines } from '@fortawesome/pro-duotone-svg-icons'
import { FaPlus, FaSearch, FaFile, FaBuilding, FaFolder, FaSpinner } from 'react-icons/fa';
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
      <span className="px-2 py-1 rounded-[6px] text-[11px] font-semibold bg-[#e6f4f4] text-[#006766]">
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
    <div className="min-h-screen bg-[#fcf9f8]">
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
            <button
              onClick={() => router.push('/documents/new')}
              className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[13px] md:text-[15px] transition-colors min-h-[44px]"
            >
              <FaPlus className="text-sm" />
              <span className="hidden sm:inline">New Document</span>
              <span className="sm:hidden">New</span>
            </button>
          }
          secondaryActions={[
            {
              label: 'Search',
              icon: <FaSearch />,
              onClick: () => setIsSearchOpen(true),
            },
          ]}
        >
          {/* Type Filters - Horizontal scroll on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide mt-4">
            {DOCUMENT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setTypeFilter(type.value)}
                className={`
                  px-4 py-2 rounded-[10px] text-[13px] font-medium transition-colors whitespace-nowrap min-h-[44px]
                  ${
                    typeFilter === type.value
                      ? 'bg-[#FEF2F2] text-[#DD3A44] border border-[#DD3A44]'
                      : 'bg-white text-[#525252] hover:bg-[#F5F5F5]'
                  }
                `}
              >
                {type.label}
              </button>
            ))}
          </div>
        </ResponsiveHeader>

        <ResponsivePageContainer>
          <div className="py-6 md:py-12">
            {documents.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
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
                    className="px-6 py-3 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium transition-colors min-h-[44px]"
                  >
                    Create First Document
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile: List View */}
                <div className="block lg:hidden space-y-3">
                  {documents.map((doc) => (
                    <MobileListItem
                      key={doc.id}
                      title={doc.title}
                      icon={
                        <div className="w-10 h-10 rounded-[6px] bg-[#FEF2F2] flex items-center justify-center">
                          {getDocumentIcon(doc.documentType)}
                        </div>
                      }
                      badge={getTypeBadge(doc.documentType)}
                      metadata={[
                        ...(doc.space ? [{ label: 'Space', value: doc.space.name }] : []),
                        ...(doc.project ? [{ label: 'Project', value: doc.project.name }] : []),
                        { label: 'Updated', value: formatDate(doc.updatedAt) },
                        { label: 'Version', value: `v${doc.version}` },
                      ]}
                      href={`/documents/${doc.id}`}
                    />
                  ))}
                </div>

                {/* Desktop: Card Grid */}
                <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => router.push(`/documents/${doc.id}`)}
                      className="bg-white rounded-[10px] p-6 hover:shadow-[0_20px_40px_rgba(28,27,27,0.06)] transition-shadow cursor-pointer"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-[6px] bg-[#FEF2F2] flex items-center justify-center flex-shrink-0">
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
                          <div className="flex items-center gap-2 text-[12px] text-[#525252]">
                            <FaBuilding className="text-[#A3A3A3]" />
                            <span>{doc.space.name}</span>
                          </div>
                        )}
                        {doc.project && (
                          <div className="flex items-center gap-2 text-[12px] text-[#525252]">
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
              </>
            )}

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="py-8 flex justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-[#A3A3A3]">
                  <FaSpinner className="animate-spin" />
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
            className="bg-white w-full max-w-2xl rounded-[14px] shadow-[0_20px_40px_rgba(28,27,27,0.06)] p-4 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3  rounded-[10px] px-4 py-3">
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
                  className="text-[#A3A3A3] hover:text-[#525252] min-h-[44px] min-w-[44px] flex items-center justify-center"
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
