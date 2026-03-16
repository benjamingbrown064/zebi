'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input, Textarea, Checkbox } from '@heroui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faStop, faCircle, faCheckCircle } from '@fortawesome/pro-duotone-svg-icons';

interface VoiceToTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextType: 'project' | 'objective' | 'company' | 'general';
  contextId?: string;
  onComplete?: () => void;
}

type Step = 'capture' | 'processing' | 'review' | 'result';

export function VoiceToTaskModal({
  isOpen,
  onClose,
  contextType,
  contextId,
  onComplete,
}: VoiceToTaskModalProps) {
  const [step, setStep] = useState<Step>('capture');
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      setStep('capture');
      setIsRecording(false);
      setDuration(0);
      setSessionId(null);
      setCandidates([]);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        await handleRecordingComplete(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err: any) {
      setError('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      setStep('processing');

      // Create session
      const sessionRes = await fetch('/api/task-generation/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextType, contextId }),
      });

      if (!sessionRes.ok) throw new Error('Failed to create session');

      const sessionData = await sessionRes.json();
      setSessionId(sessionData.sessionId);

      // Upload audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const uploadRes = await fetch(`/api/task-generation/sessions/${sessionData.sessionId}/audio`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload audio');

      // Poll for completion
      await pollForReview(sessionData.sessionId);
    } catch (err: any) {
      setError(err.message);
      setStep('capture');
    }
  };

  const pollForReview = async (sid: string) => {
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const res = await fetch(`/api/task-generation/sessions/${sid}/review`);
      const data = await res.json();

      if (data.status === 'ready_for_review') {
        setCandidates(data.candidates || []);
        setStep('review');
        return;
      } else if (data.status === 'failed') {
        throw new Error('Processing failed');
      }
    }
    throw new Error('Processing timeout');
  };

  const handleUpdateCandidate = (id: string, updates: any) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleCreateTasks = async () => {
    try {
      const selectedIds = candidates.filter((c) => c.selected).map((c) => c.id);

      if (!sessionId || selectedIds.length === 0) return;

      const res = await fetch(`/api/task-generation/sessions/${sessionId}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateIds: selectedIds }),
      });

      const data = await res.json();
      setResult(data);
      setStep('result');

      if (onComplete) {
        onComplete();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="px-6 py-4 border-b border-[#E5E5E5]">
              <h2 className="text-[17px] font-semibold text-[#1A1A1A]">
                Dictate Tasks
              </h2>
            </ModalHeader>
            <ModalBody className="p-6">
              {step === 'capture' && (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <p className="text-[15px] text-[#6B6B6B] text-center mb-8 max-w-md">
                    Talk through everything that needs to be done. I'll turn it into a task list for you to review.
                  </p>

                  {!isRecording ? (
                    <Button
                      size="lg"
                      color="primary"
                      startContent={<FontAwesomeIcon icon={faMicrophone} />}
                      onPress={startRecording}
                      className="h-14 px-8"
                    >
                      Start Recording
                    </Button>
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon
                          icon={faCircle}
                          className="text-[#DD3A44] animate-pulse"
                        />
                        <span className="text-[15px] font-medium">Recording</span>
                      </div>
                      <div className="text-4xl font-light tabular-nums">
                        {formatDuration(duration)}
                      </div>
                      <Button
                        size="lg"
                        color="danger"
                        variant="flat"
                        startContent={<FontAwesomeIcon icon={faStop} />}
                        onPress={stopRecording}
                        className="h-14 px-8"
                      >
                        Stop Recording
                      </Button>
                    </div>
                  )}

                  {error && (
                    <div className="mt-8 max-w-md">
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 'processing' && (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#DD3A44] mb-6"></div>
                  <p className="text-[15px] text-[#6B6B6B]">Processing your recording...</p>
                </div>
              )}

              {step === 'review' && (
                <div className="space-y-4">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="border border-[#E5E5E5] rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          isSelected={candidate.selected}
                          onValueChange={(selected) =>
                            handleUpdateCandidate(candidate.id, { selected })
                          }
                        />
                        <div className="flex-1">
                          <Input
                            value={candidate.title}
                            onChange={(e) =>
                              handleUpdateCandidate(candidate.id, { title: e.target.value })
                            }
                            classNames={{ input: 'font-medium' }}
                          />
                          {candidate.description && (
                            <Textarea
                              value={candidate.description}
                              onChange={(e) =>
                                handleUpdateCandidate(candidate.id, {
                                  description: e.target.value,
                                })
                              }
                              minRows={2}
                              classNames={{ input: 'text-[13px]' }}
                              className="mt-2"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 pt-4 border-t border-[#E5E5E5] mt-6">
                    <Button variant="flat" onPress={onClose} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      color="primary"
                      onPress={handleCreateTasks}
                      className="flex-1"
                    >
                      Create {candidates.filter((c) => c.selected).length} Tasks
                    </Button>
                  </div>
                </div>
              )}

              {step === 'result' && result && (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    className="text-[#4CAF50] text-6xl mb-6"
                  />
                  <h3 className="text-[20px] font-semibold text-[#1A1A1A] mb-2">
                    {result.created} Task{result.created !== 1 ? 's' : ''} Created
                  </h3>
                  {result.context.name && (
                    <p className="text-[15px] text-[#6B6B6B]">
                      in <span className="font-medium text-[#1A1A1A]">{result.context.name}</span>
                    </p>
                  )}
                  <Button
                    color="primary"
                    onPress={onClose}
                    className="mt-8"
                  >
                    Done
                  </Button>
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
