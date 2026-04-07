'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Textarea, Select, SelectItem } from '@heroui/react';
import { FaArrowLeft, FaProjectDiagram } from 'react-icons/fa';
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer';
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader';
import { useWorkspace } from '@/lib/use-workspace';

interface Space {
  id: string;
  name: string;
}

interface Objective {
  id: string;
  title: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const { workspaceId, loading: workspaceLoading } = useWorkspace();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [companyId, setSpaceId] = useState('');
  const [objectiveId, setObjectiveId] = useState('');
  const [priority, setPriority] = useState('3');
  
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const [spacesRes, objectivesRes] = await Promise.all([
        fetch(`/api/spaces?workspaceId=${workspaceId}`),
        fetch(`/api/objectives?workspaceId=${workspaceId}`)
      ]);

      if (spacesRes.ok) {
        const data = await spacesRes.json();
        setSpaces(data || []);
      }

      if (objectivesRes.ok) {
        const data = await objectivesRes.json();
        setObjectives(data.objectives || []);
      }
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          title: name.trim(), // API expects 'title', not 'name'
          description: description.trim() || null,
          companyId: companyId || null,
          objectiveId: objectiveId || null,
          priority: parseInt(priority),
          createdBy: 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74', // Placeholder user ID
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const data = await response.json();
      router.push(`/projects/${data.project.id}`); // Response has 'project' wrapper
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Failed to create project');
      setLoading(false);
    }
  };

  const mainPaddingClass = ''

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      
      <div className={mainPaddingClass}>
        {/* Header */}
        <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-10">
          <div className="px-4 md:px-8 py-4 md:py-6">
            {/* Back Link */}
            <Link 
              href="/projects"
              className="inline-flex items-center gap-2 text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors mb-4 text-[15px]"
            >
              <FaArrowLeft className="text-sm" />
              Back to Projects
            </Link>
            
            {/* Title */}
            <h1 className="text-xl md:text-2xl font-semibold text-[#1A1A1A]">
              New Project
            </h1>
          </div>
        </header>

        <ResponsivePageContainer>
          <div className="py-8 md:py-12">
            <div className="max-w-2xl mx-auto">
              {/* Form Card */}
              <div className="bg-white rounded border border-[#E5E5E5] p-6 md:p-8">
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Project Name */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                      Project Name <span className="text-[#1A1C1C]">*</span>
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Dashboard Redesign"
                      classNames={{
                        input: 'text-[15px]',
                        inputWrapper: 'h-12 border-[#E5E5E5] hover:border-[#D4D4D4]'
                      }}
                      autoFocus
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                      Description
                    </label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this project about?"
                      minRows={4}
                      classNames={{
                        input: 'text-[15px]',
                        inputWrapper: 'border-[#E5E5E5] hover:border-[#D4D4D4]'
                      }}
                    />
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

                  {/* Objective */}
                  {objectives.length > 0 && (
                    <div>
                      <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                        Objective
                      </label>
                      <Select
                        selectedKeys={objectiveId ? [objectiveId] : []}
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0] as string;
                          setObjectiveId(value || '');
                        }}
                        placeholder="Link to an objective (optional)"
                        classNames={{
                          trigger: 'h-12 border-[#E5E5E5]',
                          value: 'text-[15px]'
                        }}
                      >
                        {objectives.map((objective) => (
                          <SelectItem key={objective.id}>
                            {objective.title}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Priority */}
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                      Priority
                    </label>
                    <Select
                      selectedKeys={[priority]}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;
                        if (value) setPriority(value);
                      }}
                      placeholder="Select priority"
                      classNames={{
                        trigger: 'h-12 border-[#E5E5E5]',
                        value: 'text-[15px]'
                      }}
                    >
                      <SelectItem key="1">P1 - Critical</SelectItem>
                      <SelectItem key="2">P2 - High</SelectItem>
                      <SelectItem key="3">P3 - Medium</SelectItem>
                      <SelectItem key="4">P4 - Low</SelectItem>
                    </Select>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-4">
                      <p className="text-[13px] text-red-800">{error}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-6 border-t border-[#E5E5E5] mt-8">
                    <Button
                      type="button"
                      variant="flat"
                      onPress={() => router.back()}
                      className="flex-1 sm:flex-none h-12 text-[15px] font-medium bg-[#F3F3F3] text-[#474747] hover:bg-[#E5E5E5]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={loading}
                      className="flex-1 sm:flex-none h-12 text-[15px] font-medium bg-[#000000] text-white hover:bg-[#1A1C1C]"
                    >
                      Create Project
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
