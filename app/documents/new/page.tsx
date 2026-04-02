'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Select, SelectItem } from '@heroui/react';
import { FaArrowLeft, FaFileAlt } from 'react-icons/fa';
import Sidebar from '@/components/Sidebar';
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer';
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader';
import { useWorkspace } from '@/lib/use-workspace';

interface Space {
  id: string;
  name: string;
}

interface Project {
  id: string;
  title: string;
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

export default function NewDocumentPage() {
  const router = useRouter();
  const { workspaceId, loading: workspaceLoading } = useWorkspace();
  
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('notes');
  const [companyId, setSpaceId] = useState('');
  const [projectId, setProjectId] = useState('');
  
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!workspaceLoading && workspaceId) {
      fetchOptions();
    }
  }, [workspaceId, workspaceLoading]);

  const fetchOptions = async () => {
    try {
      const [spacesRes, projectsRes] = await Promise.all([
        fetch(`/api/spaces?workspaceId=${workspaceId}`),
        fetch(`/api/projects?workspaceId=${workspaceId}`)
      ]);

      if (spacesRes.ok) {
        const data = await spacesRes.json();
        setSpaces(data || []);
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Document title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          title: title.trim(),
          documentType,
          companyId: companyId || null,
          projectId: projectId || null,
          contentRich: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: []
              }
            ]
          }
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create document');
      }

      const data = await response.json();
      router.push(`/documents/${data.document.id}`);
    } catch (err: any) {
      console.error('Error creating document:', err);
      setError(err.message || 'Failed to create document');
      setLoading(false);
    }
  };

  const mainPaddingClass = isMobile ? 'pt-[64px]' : sidebarCollapsed ? 'ml-16' : 'ml-64';

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      
      <div className={mainPaddingClass}>
        {/* Header */}
        <header className="bg-white sticky top-0 z-10">
          <div className="px-4 md:px-8 py-4 md:py-6">
            {/* Back Link */}
            <Link 
              href="/documents"
              className="inline-flex items-center gap-2 text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors mb-4 text-[15px]"
            >
              <FaArrowLeft className="text-sm" />
              Back to Documents
            </Link>
            
            {/* Title */}
            <h1 className="text-xl md:text-2xl font-semibold text-[#1A1A1A]">
              New Document
            </h1>
          </div>
        </header>

        <ResponsivePageContainer>
          <div className="py-8 md:py-12">
            <div className="max-w-2xl mx-auto">
              {/* Form Card */}
              <div className="bg-white rounded p-6 md:p-8">
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Document Title */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                      Document Title <span className="text-[#DD3A44]">*</span>
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Q1 Strategy Document"
                      classNames={{
                        input: 'text-[15px]',
                        inputWrapper: 'h-12 border-[#E5E5E5] hover:border-[#D4D4D4]'
                      }}
                      autoFocus
                      required
                    />
                  </div>

                  {/* Document Type */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                      Document Type <span className="text-[#DD3A44]">*</span>
                    </label>
                    <Select
                      selectedKeys={[documentType]}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;
                        if (value) setDocumentType(value);
                      }}
                      placeholder="Select document type"
                      classNames={{
                        trigger: 'h-12 border-[#E5E5E5]',
                        value: 'text-[15px]'
                      }}
                      isRequired
                    >
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  {/* Space */}
                  {spaces.length > 0 && (
                    <div>
                      <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                        Space
                      </label>
                      <Select
                        selectedKeys={companyId ? [companyId] : []}
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0] as string;
                          setSpaceId(value || '');
                        }}
                        placeholder="Select a space (optional)"
                        classNames={{
                          trigger: 'h-12 border-[#E5E5E5]',
                          value: 'text-[15px]'
                        }}
                      >
                        {spaces.map((space) => (
                          <SelectItem key={space.id}>
                            {space.name}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Project */}
                  {projects.length > 0 && (
                    <div>
                      <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                        Project
                      </label>
                      <Select
                        selectedKeys={projectId ? [projectId] : []}
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0] as string;
                          setProjectId(value || '');
                        }}
                        placeholder="Link to a project (optional)"
                        classNames={{
                          trigger: 'h-12 border-[#E5E5E5]',
                          value: 'text-[15px]'
                        }}
                      >
                        {projects.map((project) => (
                          <SelectItem key={project.id}>
                            {project.title}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-4">
                      <p className="text-[13px] text-red-800">{error}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-6 mt-8">
                    <Button
                      type="button"
                      variant="flat"
                      onPress={() => router.back()}
                      className="flex-1 sm:flex-none h-12 text-[15px] font-medium bg-[#F5F5F5] text-[#525252] hover:bg-[#E5E5E5]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={loading}
                      className="flex-1 sm:flex-none h-12 text-[15px] font-medium bg-[#DD3A44] text-white hover:bg-[#C7333D]"
                    >
                      Create Document
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ResponsivePageContainer>
      </div>
    </div>
  );
}
