'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Spinner } from '@heroui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faStop, faCircle, faCheckCircle } from '@fortawesome/pro-duotone-svg-icons';
import { FaEdit, FaTrash } from 'react-icons/fa';

interface VoiceToTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextType: 'project' | 'objective' | 'space' | 'general';
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
        if (event.data.size > 0) chunksRef.current.push(event.data);
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
      setError('Microphone access denied. Please allow microphone access and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      setStep('processing');

      const sessionRes = await fetch('/api/task-generation/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextType, contextId }),
      });

      if (!sessionRes.ok) throw new Error('Failed to create session');
      const sessionData = await sessionRes.json();
      setSessionId(sessionData.sessionId);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const uploadRes = await fetch(`/api/task-generation/sessions/${sessionData.sessionId}/audio`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload audio');
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
        setCandidates(data.candidates?.map((c: any) => ({ ...c, selected: true })) || []);
        setStep('review');
        return;
      } else if (data.status === 'failed') {
        throw new Error('Processing failed');
      }
    }
    throw new Error('Processing timeout');
  };

  const handleUpdateCandidate = (id: string, updates: any) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
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
      if (onComplete) onComplete();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedCount = candidates.filter((c) => c.selected).length;

  const handleClose = () => {
    setStep('capture');
    setIsRecording(false);
    setDuration(0);
    setSessionId(null);
    setCandidates([]);
    setResult(null);
    setError(null);
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
          <div className="mb-6 max-w-md mx-auto p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button color="default" variant="bordered" onPress={handleClose}>
              Cancel
            </Button>
            <Button color="danger" onPress={() => { setError(null); setStep('capture'); }}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    switch (step) {
      case 'capture':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] py-8">
            <div className="mb-8 text-center">
              <p className="text-lg text-[#1A1A1A] mb-2">
                Talk through everything that needs to be done.
              </p>
              <p className="text-sm text-[#474747] mb-4">
                I'll turn it into a task list for you to review.
              </p>
              <div className="max-w-md mx-auto p-3 bg-[#f0fafa] border border-transparent rounded">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Describe tasks clearly — mention priorities, deadlines, and who should do what.
                </p>
              </div>
            </div>

            {!isRecording ? (
              <button
                onClick={startRecording}
                className="w-24 h-24 rounded-full bg-[#000000] hover:bg-[#1A1C1C] text-white flex items-center justify-center transition-all shadow-[0_20px_40px_rgba(28,27,27,0.06)] hover:shadow-xl hover:scale-105"
              >
                <FontAwesomeIcon icon={faMicrophone} className="text-3xl" />
              </button>
            ) : (
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faCircle} className="text-[#1A1C1C] animate-pulse" />
                  <span className="text-[15px] font-medium text-[#1A1A1A]">Recording</span>
                </div>
                <div className="text-5xl font-light tabular-nums text-[#1A1A1A]">
                  {formatDuration(duration)}
                </div>
                {/* Animated waveform */}
                <div className="flex items-center justify-center gap-1 h-8">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#000000] rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 24 + 8}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: `${0.4 + Math.random() * 0.4}s`,
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-[#1A1A1A] hover:bg-[#333] text-white flex items-center justify-center transition-all shadow-[0_20px_40px_rgba(28,27,27,0.06)]"
                >
                  <FontAwesomeIcon icon={faStop} className="text-xl" />
                </button>
                <p className="text-xs text-[#A3A3A3]">Tap to stop recording</p>
              </div>
            )}
          </div>
        );

      case 'processing':
        return (
          <div className="text-center py-12 min-h-[400px] flex flex-col items-center justify-center">
            <div className="mb-6 relative">
              <Spinner size="lg" color="default" />
            </div>
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Processing your recording...</h3>
            <p className="text-sm text-[#474747] mb-4">Converting speech to tasks</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-[#000000] rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-[#000000] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-[#000000] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <div className="max-w-md mx-auto mt-6 space-y-2 text-xs text-[#A3A3A3]">
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#f0fafa]0 rounded-full"></div>
                <span>Transcribing audio</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#f0fafa]0 rounded-full"></div>
                <span>Extracting tasks</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#f0fafa]0 rounded-full"></div>
                <span>Setting priorities</span>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="py-6">
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">Here's what I understood</h3>
            <p className="text-sm text-[#474747] mb-6">
              {candidates.length} task{candidates.length !== 1 ? 's' : ''} found — edit or remove any before creating.
            </p>

            <div className="space-y-3">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className={`p-4 bg-white border rounded transition-all ${
                    candidate.selected
                      ? 'border-gray-200 shadow-[0_1px_3px_rgba(28,27,27,0.06)]'
                      : 'border-gray-100 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleUpdateCandidate(candidate.id, { selected: !candidate.selected })}
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        candidate.selected
                          ? 'bg-[#000000] border-[#DD3A44] text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {candidate.selected && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Editable title */}
                      <input
                        type="text"
                        value={candidate.title}
                        onChange={(e) => handleUpdateCandidate(candidate.id, { title: e.target.value })}
                        className="w-full text-[15px] font-medium text-[#1A1A1A] bg-transparent border-none outline-none focus:bg-[#F3F3F3] focus:px-2 focus:py-1 focus:-mx-2 focus:-my-1 rounded-md transition-all"
                      />
                      {/* Editable description */}
                      {candidate.description && (
                        <textarea
                          value={candidate.description}
                          onChange={(e) => handleUpdateCandidate(candidate.id, { description: e.target.value })}
                          rows={2}
                          className="w-full mt-1 text-[13px] text-[#474747] bg-transparent border-none outline-none focus:bg-[#F3F3F3] focus:px-2 focus:py-1 focus:-mx-2 focus:-my-1 rounded-md transition-all resize-none"
                        />
                      )}
                      {/* Priority badge */}
                      {candidate.priority && (
                        <span className={`inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          candidate.priority <= 1 ? 'bg-red-100 text-red-700' :
                          candidate.priority === 2 ? 'bg-orange-100 text-orange-700' :
                          candidate.priority === 3 ? 'bg-[#F3F3F3] text-[#474747]' :
                          'bg-[#F3F3F3] text-[#A3A3A3]'
                        }`}>
                          P{candidate.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-6 mt-6">
              <Button color="default" variant="bordered" onPress={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                color="danger"
                onPress={handleCreateTasks}
                isDisabled={selectedCount === 0}
                className="flex-1"
              >
                Create {selectedCount} Task{selectedCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        );

      case 'result':
        return (
          <div className="text-center py-12 min-h-[400px] flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="mb-6 w-20 h-20 mx-auto bg-[#e6f4f4] rounded-full flex items-center justify-center animate-in zoom-in duration-700">
              <svg className="w-10 h-10 text-[#006766]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">
              🎉 {result?.created || 0} Task{(result?.created || 0) !== 1 ? 's' : ''} Created
            </h3>
            {result?.context?.name && (
              <p className="text-[15px] text-[#474747] mb-2">
                in <span className="font-medium text-[#1A1A1A]">{result.context.name}</span>
              </p>
            )}
            <Button color="danger" onPress={handleClose} className="mt-8">
              Done
            </Button>
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
        base: 'bg-[#F9F9F9]',
        wrapper: 'z-[999]',
        backdrop: 'bg-black/30',
        header: 'border-b border-gray-200',
        body: 'py-6',
        closeButton: 'hover:bg-[#F3F3F3]'
      }}
    >
      <ModalContent className=" shadow-[0_20px_40px_rgba(28,27,27,0.06)] !outline-none focus:outline-none">
        <ModalHeader className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Dictate Tasks</h2>
        </ModalHeader>
        <ModalBody>
          {renderContent()}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
