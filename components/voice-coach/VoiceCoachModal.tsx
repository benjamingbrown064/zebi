'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Spinner } from '@heroui/react';
import { useRouter } from 'next/navigation';
import Recorder from '@/components/brain-dump/Recorder';
import ProposalEditor from '@/components/voice-coach/ProposalEditor';
import { FaTimes, FaEdit } from 'react-icons/fa';

interface VoiceCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (goalId: string) => void;
}

type ModalState = 
  | 'opening'      // Show opening question
  | 'recording'    // User speaking
  | 'transcribing' // Processing audio
  | 'context'      // Mandatory context question (new step)
  | 'followup'     // Asking follow-up questions (0-2)
  | 'structuring'  // Generating proposal
  | 'reviewing'    // User reviewing proposal
  | 'creating'     // Saving to database
  | 'success';     // Confirmation

interface Proposal {
  goal: {
    name: string;
    description: string;
    successCriteria: string;
    targetDate: string | null;
  };
  objectives: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    targetDate: string | null;
  }>;
  projects: Array<{
    name: string;
    objectiveIndex: number | null;
  }>;
  tasks: Array<{
    title: string;
    projectIndex: number | null;
  }>;
  blockers: string[];
  uncertainties: string[];
}

export default function VoiceCoachModal({ isOpen, onClose, onSuccess }: VoiceCoachModalProps) {
  const router = useRouter();
  const [state, setState] = useState<ModalState>('opening');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [createdCounts, setCreatedCounts] = useState<{ goals: number; objectives: number; projects: number; tasks: number } | null>(null);

  const openingQuestion = "What are you trying to achieve? Speak naturally — I'll structure it.";
  const contextQuestion = "Where are you starting from? What have you tried, and what ideas do you have?";

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
      // ESC to close
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
        body: JSON.stringify({ sessionType: 'goal_planning' })
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

    console.log('Recording complete:', {
      size: audioBlob.size,
      type: audioBlob.type
    });

    // Check if audio is too small
    if (audioBlob.size < 1000) {
      setError('Recording failed - audio file is too small. Please try again and speak clearly into your microphone.');
      setState('opening');
      return;
    }

    const currentState = state; // Save current state before changing to 'transcribing'
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
      const newTranscript = transcript ? `${transcript}\n\nQ: ${followUpQuestions[currentQuestionIndex] || contextQuestion || openingQuestion}\nA: ${data.transcript}` : data.transcript;
      setTranscript(newTranscript);

      // If this was the opening question, move to mandatory context question
      if (currentState === 'opening' || currentState === 'recording') {
        setState('context');
      }
      // If answering the context question, get AI follow-up questions
      else if (currentState === 'context') {
        await getFollowUpQuestions(newTranscript);
      }
      // If answering a follow-up question
      else if (currentState === 'followup') {
        // Check if there are more questions
        const nextQuestionIndex = currentQuestionIndex + 1;
        if (nextQuestionIndex < followUpQuestions.length) {
          // Show next question
          setCurrentQuestionIndex(nextQuestionIndex);
          setState('followup');
        } else {
          // All questions answered, move to structuring
          await structureProposal(newTranscript);
        }
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe audio. Please check your microphone and try again.');
      setState('opening');
    }
  };

  const getFollowUpQuestions = async (fullTranscript: string) => {
    try {
      const res = await fetch('/api/voice-coach/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          transcript: fullTranscript
        })
      });

      if (!res.ok) throw new Error('Failed to get follow-up questions');

      const data = await res.json();

      if (data.skipToSynthesis || data.questions.length === 0) {
        // No more questions needed, move to structuring
        await structureProposal(fullTranscript);
      } else {
        // Show next follow-up question
        setFollowUpQuestions(data.questions);
        setCurrentQuestionIndex(0);
        setState('followup');
      }
    } catch (err) {
      console.error('Follow-up error:', err);
      setError('Failed to process response. Please try again.');
      setState('opening');
    }
  };

  const structureProposal = async (fullTranscript: string) => {
    setState('structuring');

    try {
      const res = await fetch('/api/voice-coach/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          fullConversation: fullTranscript
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorDetails = errorData.details || errorData.error || 'Unknown error';
        console.error('Structuring API error:', errorData);
        throw new Error(errorDetails);
      }

      const data = await res.json();
      setProposal(data.proposal);
      setState('reviewing');
    } catch (err) {
      console.error('Structuring error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to generate plan: ${errorMessage}. Please try again.`);
      setState('opening');
    }
  };

  const handleConfirmCreate = async () => {
    if (!proposal || !sessionId) return;

    setState('creating');

    try {
      const res = await fetch('/api/voice-coach/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          proposal
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorDetails = errorData.error || 'Unknown error';
        console.error('Creation API error:', errorData);
        throw new Error(errorDetails);
      }

      const data = await res.json();
      console.log('Creation successful:', data);
      console.log('Created in workspace:', data.created.workspaceId);
      console.log('Goal ID:', data.created.goalId);
      setCreatedGoalId(data.created.goalId);
      setCreatedCounts(data.summary);
      setState('success');

      // Redirect to goals list after 2 seconds
      setTimeout(() => {
        // Don't call onSuccess - it might try to navigate to goal detail page
        // Just go to goals list and refresh
        onClose();
        router.push('/goals');
        router.refresh(); // Force refresh to reload goals
      }, 2000);
    } catch (err) {
      console.error('Creation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to save your plan: ${errorMessage}. Please try again.`);
      setState('reviewing');
    }
  };

  const handleClose = () => {
    // Reset state
    setState('opening');
    setSessionId(null);
    setTranscript('');
    setFollowUpQuestions([]);
    setCurrentQuestionIndex(0);
    setProposal(null);
    setError(null);
    setCreatedGoalId(null);
    onClose();
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
            <Button
              color="default"
              variant="bordered"
              onPress={handleClose}
            >
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
        return (
          <div className="py-8">
            <div className="mb-8 text-center">
              <p className="text-lg text-[#1A1A1A] mb-2">{openingQuestion}</p>
              <p className="text-sm text-[#5a5757] mb-4">Question 1 of 2 (required)</p>
              <div className="max-w-md mx-auto p-3 bg-[#f0fafa] border border-transparent rounded-[10px]">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Describe your goal clearly. We'll ask about your progress next.
                </p>
              </div>
            </div>
            <Recorder
              key="opening"
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={() => setState('recording')}
              onRecordingStop={() => {}}
            />
          </div>
        );

      case 'recording':
        return (
          <div className="py-8">
            <div className="mb-8 text-center">
              <p className="text-lg text-[#1A1A1A] mb-2">{openingQuestion}</p>
              <p className="text-sm text-[#5a5757]">Speak naturally...</p>
            </div>
            <Recorder
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={() => {}}
              onRecordingStop={() => {}}
            />
            {transcript && (
              <div className="mt-6 p-4 bg-[#f6f3f2] rounded-[10px]">
                <p className="text-xs text-[#A3A3A3] mb-2">Transcript:</p>
                <p className="text-sm text-[#5a5757]">{transcript}</p>
              </div>
            )}
          </div>
        );

      case 'transcribing':
        return (
          <div className="text-center py-12">
            <div className="mb-6 relative">
              <Spinner size="lg" color="default" />
            </div>
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Converting speech to text...</h3>
            <p className="text-sm text-[#5a5757]">Using OpenAI Whisper</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-[#DD3A44] rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-[#DD3A44] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-[#DD3A44] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        );

      case 'context':
        return (
          <div className="py-8">
            <div className="mb-8 text-center">
              <p className="text-lg text-[#1A1A1A] mb-2">{contextQuestion}</p>
              <p className="text-sm text-[#5a5757] mb-4">Question 2 of 2 (required)</p>
              <div className="max-w-md mx-auto p-3 bg-[#f0fafa] border border-transparent rounded-[10px]">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Mention what you've already done, any blockers you're facing, and ideas you're considering.
                </p>
              </div>
            </div>
            <Recorder
              key="context"
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={() => {}}
              onRecordingStop={() => {}}
            />
            {transcript && (
              <div className="mt-6 p-4 bg-[#f6f3f2] rounded-[10px] max-h-40 overflow-y-auto">
                <p className="text-xs text-[#A3A3A3] mb-2">Your goal:</p>
                <p className="text-sm text-[#5a5757] whitespace-pre-wrap">{transcript}</p>
              </div>
            )}
          </div>
        );

      case 'followup':
        return (
          <div className="py-8">
            <div className="mb-8 text-center">
              <p className="text-lg text-[#1A1A1A] mb-2">
                {followUpQuestions[currentQuestionIndex]}
              </p>
              <p className="text-sm text-[#5a5757]">
                Question {currentQuestionIndex + 1} of {followUpQuestions.length}
              </p>
            </div>
            <Recorder
              key={`followup-${currentQuestionIndex}`}
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={() => {}}
              onRecordingStop={() => {}}
            />
            {transcript && (
              <div className="mt-6 p-4 bg-[#f6f3f2] rounded-[10px] max-h-40 overflow-y-auto">
                <p className="text-xs text-[#A3A3A3] mb-2">Conversation so far:</p>
                <p className="text-sm text-[#5a5757] whitespace-pre-wrap">{transcript}</p>
              </div>
            )}
          </div>
        );

      case 'structuring':
        return (
          <div className="text-center py-12">
            <div className="mb-6 relative">
              <Spinner size="lg" color="default" />
            </div>
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Structuring your plan...</h3>
            <p className="text-sm text-[#5a5757] mb-4">AI is analyzing your goal</p>
            <div className="max-w-md mx-auto space-y-2 text-xs text-[#A3A3A3]">
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#f0fafa]0 rounded-full"></div>
                <span>Extracting objectives</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#f0fafa]0 rounded-full"></div>
                <span>Identifying projects</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#f0fafa]0 rounded-full"></div>
                <span>Generating tasks</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#f0fafa]0 rounded-full"></div>
                <span>Checking for blockers</span>
              </div>
            </div>
          </div>
        );

      case 'reviewing':
        return (
          <div className="py-6">
            {isEditing ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#1A1A1A]">Edit Your Plan</h3>
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => setIsEditing(false)}
                  >
                    Cancel Editing
                  </Button>
                </div>
                {proposal && (
                  <ProposalEditor
                    proposal={proposal}
                    onSave={(updatedProposal) => {
                      setProposal(updatedProposal);
                      setIsEditing(false);
                    }}
                    onCancel={() => setIsEditing(false)}
                  />
                )}
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Here's what I understood</h3>
                
                {/* Goal Card */}
                {proposal && (
                  <>
                    <div className="mb-6 p-4 bg-white rounded-[10px]">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-[#A3A3A3]">🎯 GOAL TO CREATE</h4>
                      </div>
                      <h5 className="text-lg font-semibold text-[#1A1A1A] mb-2">{proposal.goal.name}</h5>
                      <p className="text-sm text-[#5a5757] mb-2">{proposal.goal.description}</p>
                      {proposal.goal.successCriteria && (
                        <p className="text-sm text-[#5a5757] mb-1">
                          <span className="font-medium">Success:</span> {proposal.goal.successCriteria}
                        </p>
                      )}
                      {proposal.goal.targetDate && (
                        <p className="text-sm text-[#5a5757]">
                          <span className="font-medium">Target:</span> {new Date(proposal.goal.targetDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                {/* Objectives */}
                {proposal.objectives.length > 0 && (
                  <div className="mb-6 p-4 bg-white rounded-[10px]">
                    <h4 className="text-sm font-semibold text-[#A3A3A3] mb-3">📋 OBJECTIVES ({proposal.objectives.length})</h4>
                    <div className="space-y-2">
                      {proposal.objectives.map((obj, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-sm text-[#5a5757]">{index + 1}.</span>
                          <div className="flex-1">
                            <p className="text-sm text-[#1A1A1A]">
                              {obj.priority === 'high' && '⚠️ '}
                              {obj.title}
                            </p>
                            {obj.targetDate && (
                              <p className="text-xs text-[#A3A3A3]">
                                Target: {new Date(obj.targetDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {proposal.projects.length > 0 && (
                  <div className="mb-6 p-4 bg-white rounded-[10px]">
                    <h4 className="text-sm font-semibold text-[#A3A3A3] mb-3">🗂️ PROJECTS ({proposal.projects.length})</h4>
                    <ul className="space-y-1">
                      {proposal.projects.map((proj, index) => (
                        <li key={index} className="text-sm text-[#1A1A1A]">• {proj.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tasks */}
                {proposal.tasks.length > 0 && (
                  <div className="mb-6 p-4 bg-white rounded-[10px]">
                    <h4 className="text-sm font-semibold text-[#A3A3A3] mb-3">✅ FIRST TASKS ({proposal.tasks.length})</h4>
                    <ul className="space-y-1">
                      {proposal.tasks.map((task, index) => (
                        <li key={index} className="text-sm text-[#1A1A1A]">{index + 1}. {task.title}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Blockers */}
                {proposal.blockers.length > 0 && (
                  <div className="mb-6 p-4 bg-white rounded-[10px]">
                    <h4 className="text-sm font-semibold text-[#A3A3A3] mb-3">⚠️ BLOCKERS & RISKS</h4>
                    <ul className="space-y-1">
                      {proposal.blockers.map((blocker, index) => (
                        <li key={index} className="text-sm text-[#1A1A1A]">• {blocker}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Uncertainties */}
                {proposal.uncertainties.length > 0 && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-[10px]">
                    <h4 className="text-sm font-semibold text-yellow-800 mb-3">❓ NEEDS CLARIFICATION</h4>
                    <ul className="space-y-1">
                      {proposal.uncertainties.map((uncertainty, index) => (
                        <li key={index} className="text-sm text-yellow-700">• {uncertainty}</li>
                      ))}
                    </ul>
                  </div>
                )}

                    <div className="flex gap-3">
                      <Button
                        color="default"
                        variant="bordered"
                        onPress={handleClose}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        color="default"
                        variant="flat"
                        startContent={<FaEdit />}
                        onPress={() => setIsEditing(true)}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        color="danger"
                        onPress={handleConfirmCreate}
                        className="flex-1"
                      >
                        Create
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        );

      case 'creating':
        return (
          <div className="text-center py-12">
            <div className="mb-6 relative">
              <Spinner size="lg" color="default" />
            </div>
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Creating your plan...</h3>
            <p className="text-sm text-[#5a5757] mb-4">Adding to your workspace</p>
            <div className="max-w-md mx-auto space-y-2 text-xs text-[#A3A3A3]">
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#f0fafa]0 rounded-full animate-pulse"></div>
                <span>Creating goal</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#f0fafa]0 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <span>Adding {proposal?.objectives.length || 0} objectives</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#f0fafa]0 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span>Setting up {proposal?.projects.length || 0} projects</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#f0fafa]0 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                <span>Creating {proposal?.tasks.length || 0} tasks</span>
              </div>
            </div>
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
            <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">🎉 Plan created successfully!</h3>
            
            {createdCounts && (
              <div className="mb-4 max-w-sm mx-auto space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-[#5a5757]">
                  <span className="w-2 h-2 bg-[#DD3A44] rounded-full"></span>
                  <span><strong>{createdCounts.goals}</strong> goal</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-[#5a5757]">
                  <span className="w-2 h-2 bg-[#f0fafa]0 rounded-full"></span>
                  <span><strong>{createdCounts.objectives}</strong> {createdCounts.objectives === 1 ? 'objective' : 'objectives'}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-[#5a5757]">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span><strong>{createdCounts.projects}</strong> {createdCounts.projects === 1 ? 'project' : 'projects'}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-[#5a5757]">
                  <span className="w-2 h-2 bg-[#f0fafa]0 rounded-full"></span>
                  <span><strong>{createdCounts.tasks}</strong> {createdCounts.tasks === 1 ? 'task' : 'tasks'}</span>
                </div>
              </div>
            )}
            
            <p className="text-sm text-[#5a5757] animate-pulse">Opening your goal...</p>
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
        wrapper: 'z-[999]',
        backdrop: 'bg-black/30',
        header: 'border-b border-gray-200',
        body: 'py-6',
        closeButton: 'hover:bg-[#f0eded]'
      }}
    >
      <ModalContent className=" shadow-[0_20px_40px_rgba(28,27,27,0.06)] !outline-none focus:outline-none">
        <ModalHeader className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Voice Coach</h2>
        </ModalHeader>
        <ModalBody>
          {renderContent()}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
