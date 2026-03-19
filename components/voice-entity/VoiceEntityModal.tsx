'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Spinner, Select, SelectItem } from '@heroui/react';
import { useRouter } from 'next/navigation';
import Recorder from '@/components/brain-dump/Recorder';
import ParentSelector from './ParentSelector';
import { FaEdit } from 'react-icons/fa';

type EntityType = 'company' | 'objective' | 'project';

interface VoiceEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  onSuccess?: (entityId: string) => void;
  parentId?: string | null;
  parentType?: 'goal' | 'company' | 'objective' | null;
  context?: {
    existingGoals?: Array<{ id: string; name: string }>;
    existingCompanies?: Array<{ id: string; name: string }>;
    existingObjectives?: Array<{ id: string; title: string }>;
  };
}

type ModalState = 
  | 'opening'      // Show opening question
  | 'recording'    // User speaking
  | 'transcribing' // Processing audio
  | 'structuring'  // Generating proposal
  | 'reviewing'    // User reviewing proposal
  | 'creating'     // Saving to database
  | 'success';     // Confirmation

const ENTITY_CONFIG = {
  company: {
    singular: 'Company',
    plural: 'Companies',
    icon: '🏢',
    openingQuestion: "Tell me about this company. What's the name, industry, and what do they do?",
    redirectPath: '/companies'
  },
  objective: {
    singular: 'Objective',
    plural: 'Objectives',
    icon: '🎯',
    openingQuestion: "What objective do you want to achieve? Be specific about the outcome and timeline.",
    redirectPath: '/objectives'
  },
  project: {
    singular: 'Project',
    plural: 'Projects',
    icon: '🗂️',
    openingQuestion: "Tell me about this project. What's the goal, scope, and key deliverables?",
    redirectPath: '/projects'
  }
};

export default function VoiceEntityModal({ 
  isOpen, 
  onClose, 
  entityType,
  onSuccess,
  parentId: initialParentId,
  parentType: initialParentType,
  context
}: VoiceEntityModalProps) {
  const router = useRouter();
  const [state, setState] = useState<ModalState>('opening');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [proposal, setProposal] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdEntityId, setCreatedEntityId] = useState<string | null>(null);
  const [createdCounts, setCreatedCounts] = useState<any>(null);
  
  // Parent selection state
  const [selectedParentId, setSelectedParentId] = useState<string | null>(initialParentId || null);
  const [selectedParentType, setSelectedParentType] = useState<'goal' | 'company' | 'objective' | null>(initialParentType || null);

  const config = ENTITY_CONFIG[entityType];

  // Show parent selector for objectives and projects
  const showParentSelector = (entityType === 'objective' || entityType === 'project') && !initialParentId;

  // Initialize session when modal opens
  useEffect(() => {
    if (isOpen && !sessionId) {
      initializeSession();
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state === 'opening') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, state]);

  const initializeSession = async () => {
    try {
      const res = await fetch('/api/voice-coach/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionType: `${entityType}_creation` })
      });

      if (!res.ok) throw new Error('Failed to create session');

      const data = await res.json();
      setSessionId(data.sessionId);
    } catch (err) {
      console.error('Session init error:', err);
      setError('Failed to start session. Please try again.');
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (!sessionId) {
      setError('No session found. Please close and try again.');
      return;
    }

    setState('transcribing');

    try {
      // Transcribe audio
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('audio', audioBlob, 'recording.webm');

      const res = await fetch('/api/voice-coach/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Transcription failed');

      const data = await res.json();
      const newTranscript = transcript ? `${transcript}\n\n${data.transcript}` : data.transcript;
      setTranscript(newTranscript);

      // Immediately structure the proposal
      await structureProposal(newTranscript);
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe audio. Please check your microphone and try again.');
      setState('opening');
    }
  };

  const structureProposal = async (fullTranscript: string) => {
    setState('structuring');

    try {
      const res = await fetch('/api/voice-entity/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          entityType,
          fullConversation: fullTranscript,
          parentContext: selectedParentId && selectedParentType ? { parentId: selectedParentId, parentType: selectedParentType } : null
        })
      });

      if (!res.ok) throw new Error('Failed to structure proposal');

      const data = await res.json();
      setProposal(data.proposal);
      setState('reviewing');
    } catch (err) {
      console.error('Structuring error:', err);
      setError('Failed to generate proposal. Please try again.');
      setState('opening');
    }
  };

  const handleConfirmCreate = async () => {
    if (!proposal || !sessionId) return;

    setState('creating');

    try {
      const res = await fetch('/api/voice-entity/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          entityType,
          proposal,
          parentId: selectedParentId || null,
          parentType: selectedParentType || null
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create entity');
      }

      const data = await res.json();
      
      // Extract the created ID based on entity type
      let createdId = null;
      if (entityType === 'company') {
        createdId = data.created.companyId;
      } else if (entityType === 'objective') {
        createdId = data.created.objectiveId;
      } else if (entityType === 'project') {
        createdId = data.created.projectId;
      }
      
      setCreatedEntityId(createdId);
      setCreatedCounts(data.summary);
      setState('success');

      // Call success callback and redirect after 2 seconds
      setTimeout(() => {
        if (onSuccess && createdId) {
          onSuccess(createdId);
        }
        if (createdId) {
          router.push(`${config.redirectPath}/${createdId}`);
        } else {
          router.push(config.redirectPath);
        }
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
      setState('reviewing');
    }
  };

  const handleClose = () => {
    setState('opening');
    setSessionId(null);
    setTranscript('');
    setProposal(null);
    setError(null);
    setCreatedEntityId(null);
    setSelectedParentId(initialParentId || null);
    setSelectedParentType(initialParentType || null);
    onClose();
  };

  const renderProposal = () => {
    if (!proposal) return null;

    switch (entityType) {
      case 'company':
        return (
          <>
            <div className="mb-6 p-4 bg-white rounded-[10px]">
              <h4 className="text-sm font-semibold text-[#A3A3A3] mb-2">{config.icon} COMPANY</h4>
              <h5 className="text-lg font-semibold text-[#1A1A1A] mb-2">{proposal.company.name}</h5>
              <div className="space-y-1 text-sm text-[#5a5757]">
                <p><span className="font-medium">Industry:</span> {proposal.company.industry}</p>
                {proposal.company.stage && (
                  <p><span className="font-medium">Stage:</span> {proposal.company.stage}</p>
                )}
                {proposal.company.businessModel && (
                  <p><span className="font-medium">Model:</span> {proposal.company.businessModel}</p>
                )}
                <p className="mt-2">{proposal.company.description}</p>
              </div>
            </div>

            {proposal.objectives && proposal.objectives.length > 0 && (
              <div className="mb-6 p-4 bg-white rounded-[10px]">
                <h4 className="text-sm font-semibold text-[#A3A3A3] mb-3">
                  🎯 OBJECTIVES ({proposal.objectives.length})
                </h4>
                <div className="space-y-2">
                  {proposal.objectives.map((obj: any, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-sm text-[#5a5757]">{index + 1}.</span>
                      <div className="flex-1">
                        <p className="text-sm text-[#1A1A1A]">
                          {obj.priority === 'high' && '⚠️ '}
                          {obj.title}
                        </p>
                        {obj.deadline && (
                          <p className="text-xs text-[#A3A3A3]">
                            Target: {new Date(obj.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );

      case 'objective':
        return (
          <>
            <div className="mb-6 p-4 bg-white rounded-[10px]">
              <h4 className="text-sm font-semibold text-[#A3A3A3] mb-2">{config.icon} OBJECTIVE</h4>
              <h5 className="text-lg font-semibold text-[#1A1A1A] mb-2">{proposal.objective.title}</h5>
              <div className="space-y-1 text-sm text-[#5a5757]">
                <p><span className="font-medium">Type:</span> {proposal.objective.objectiveType}</p>
                <p><span className="font-medium">Priority:</span> {proposal.objective.priority}</p>
                {proposal.objective.deadline && (
                  <p><span className="font-medium">Deadline:</span> {new Date(proposal.objective.deadline).toLocaleDateString()}</p>
                )}
                {proposal.objective.targetValue && (
                  <p><span className="font-medium">Target:</span> {proposal.objective.targetValue} {proposal.objective.unit || ''}</p>
                )}
                <p className="mt-2">{proposal.objective.description}</p>
              </div>
            </div>

            {proposal.projects && proposal.projects.length > 0 && (
              <div className="mb-6 p-4 bg-white rounded-[10px]">
                <h4 className="text-sm font-semibold text-[#A3A3A3] mb-3">
                  🗂️ PROJECTS ({proposal.projects.length})
                </h4>
                <ul className="space-y-1">
                  {proposal.projects.map((proj: any, index: number) => (
                    <li key={index} className="text-sm text-[#1A1A1A]">• {proj.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {proposal.tasks && proposal.tasks.length > 0 && (
              <div className="mb-6 p-4 bg-white rounded-[10px]">
                <h4 className="text-sm font-semibold text-[#A3A3A3] mb-3">
                  ✅ TASKS ({proposal.tasks.length})
                </h4>
                <ul className="space-y-1">
                  {proposal.tasks.map((task: any, index: number) => (
                    <li key={index} className="text-sm text-[#1A1A1A]">{index + 1}. {task.title}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        );

      case 'project':
        return (
          <>
            <div className="mb-6 p-4 bg-white rounded-[10px]">
              <h4 className="text-sm font-semibold text-[#A3A3A3] mb-2">{config.icon} PROJECT</h4>
              <h5 className="text-lg font-semibold text-[#1A1A1A] mb-2">{proposal.project.name}</h5>
              <div className="space-y-1 text-sm text-[#5a5757]">
                {proposal.project.stage && (
                  <p><span className="font-medium">Stage:</span> {proposal.project.stage}</p>
                )}
                <p><span className="font-medium">Priority:</span> {proposal.project.priority}</p>
                {proposal.project.deadline && (
                  <p><span className="font-medium">Deadline:</span> {new Date(proposal.project.deadline).toLocaleDateString()}</p>
                )}
                <p className="mt-2">{proposal.project.description}</p>
              </div>
            </div>

            {proposal.tasks && proposal.tasks.length > 0 && (
              <div className="mb-6 p-4 bg-white rounded-[10px]">
                <h4 className="text-sm font-semibold text-[#A3A3A3] mb-3">
                  ✅ TASKS ({proposal.tasks.length})
                </h4>
                <div className="space-y-2">
                  {proposal.tasks.map((task: any, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-sm text-[#5a5757]">{index + 1}.</span>
                      <div className="flex-1">
                        <p className="text-sm text-[#1A1A1A]">
                          {task.priority === 'high' && '⚠️ '}
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-[#A3A3A3] mt-1">{task.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="text-center py-12">
          <div className="mb-6 w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Something went wrong</h3>
          <div className="mb-6 max-w-md mx-auto p-4 bg-red-50 border border-red-200 rounded-[10px]">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button color="default" variant="bordered" onPress={handleClose}>
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={() => {
                setError(null);
                setState('opening');
              }}
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    switch (state) {
      case 'opening':
      case 'recording':
        return (
          <div className="py-8">
            {/* Parent Selection for Objectives and Projects */}
            {showParentSelector && state === 'opening' && (
              <ParentSelector
                entityType={entityType as 'objective' | 'project'}
                selectedParentId={selectedParentId}
                selectedParentType={selectedParentType}
                onParentChange={(parentId, parentType) => {
                  setSelectedParentId(parentId);
                  setSelectedParentType(parentType);
                }}
                context={context}
              />
            )}
            
            <div className="mb-8 text-center">
              <p className="text-lg text-[#1A1A1A] mb-2">{config.openingQuestion}</p>
              <p className="text-sm text-[#5a5757] mb-4">Speak naturally for 30-90 seconds</p>
              <div className="max-w-md mx-auto p-3 bg-[#f0fafa] border border-transparent rounded-[10px]">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Be specific about names, dates, and key details.
                </p>
              </div>
            </div>
            <Recorder
              key={state}
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={() => setState('recording')}
              onRecordingStop={() => {}}
            />
          </div>
        );

      case 'transcribing':
        return (
          <div className="text-center py-12">
            <Spinner size="lg" color="default" className="mb-6" />
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Converting speech to text...</h3>
            <p className="text-sm text-[#5a5757]">Using OpenAI Whisper</p>
          </div>
        );

      case 'structuring':
        return (
          <div className="text-center py-12">
            <Spinner size="lg" color="default" className="mb-6" />
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Analyzing your input...</h3>
            <p className="text-sm text-[#5a5757]">AI is structuring the {config.singular.toLowerCase()}</p>
          </div>
        );

      case 'reviewing':
        return (
          <div className="py-6">
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Review before creating</h3>
            {renderProposal()}
            <div className="flex gap-3">
              <Button color="default" variant="bordered" onPress={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button color="danger" onPress={handleConfirmCreate} className="flex-1">
                Create {config.singular}
              </Button>
            </div>
          </div>
        );

      case 'creating':
        return (
          <div className="text-center py-12">
            <Spinner size="lg" color="default" className="mb-6" />
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Creating {config.singular.toLowerCase()}...</h3>
            <p className="text-sm text-[#5a5757]">Saving to workspace</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-12 animate-in fade-in duration-500">
            <div className="mb-6 w-20 h-20 mx-auto bg-[#e6f4f4] rounded-full flex items-center justify-center animate-in zoom-in duration-700">
              <svg className="w-10 h-10 text-[#006766]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">
              🎉 {config.singular} created successfully!
            </h3>
            {createdCounts && (
              <div className="mb-4 max-w-sm mx-auto space-y-2 text-sm text-[#5a5757]">
                {Object.entries(createdCounts).map(([key, value]) => {
                  const count = value as number;
                  return count > 0 ? (
                    <div key={key} className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-[#DD3A44] rounded-full"></span>
                      <span><strong>{count}</strong> {key}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
            <p className="text-sm text-[#5a5757] animate-pulse">Redirecting...</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="3xl"
      scrollBehavior="inside"
      classNames={{
        base: 'bg-[#fcf9f8]',
        header: 'border-b border-gray-200',
        body: 'py-6',
        closeButton: 'hover:bg-[#f0eded]'
      }}
    >
      <ModalContent>
        <ModalHeader>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">
            {config.icon} Create {config.singular} via Voice
          </h2>
        </ModalHeader>
        <ModalBody>
          {renderContent()}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
