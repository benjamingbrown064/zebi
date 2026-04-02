'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Spinner } from '@heroui/react';
import { FaMicrophone, FaStop, FaPause, FaPlay } from 'react-icons/fa';
import Recorder from '@/components/brain-dump/Recorder';

interface Session {
  id: string;
  status: string;
  createdAt: string;
  transcript: string;
  summary: string;
}

export default function BrainDumpClient() {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    loadRecentSessions();
  }, []);

  const loadRecentSessions = async () => {
    try {
      const res = await fetch('/api/brain-dump/session');
      if (res.ok) {
        const data = await res.json();
        setRecentSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setProcessing(true);
    
    try {
      // Create session
      const sessionRes = await fetch('/api/brain-dump/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!sessionRes.ok) throw new Error('Failed to create session');
      const { sessionId } = await sessionRes.json();

      // Upload audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('sessionId', sessionId);

      const uploadRes = await fetch('/api/brain-dump/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) throw new Error('Failed to upload audio');

      // Navigate to review
      router.push(`/brain-dump/review/${sessionId}`);
    } catch (error) {
      console.error('Recording error:', error);
      setProcessing(false);
      alert('Failed to process recording. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-GB', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">Brain Dump</h1>
          <p className="text-sm text-[#474747] mt-1">Speak your updates, we'll structure them</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Recorder */}
        <div className="bg-white rounded p-12 mb-8">
          <div className="max-w-2xl mx-auto">
            {processing ? (
              <div className="text-center py-16">
                <Spinner size="lg" color="default" className="mb-6" />
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Processing your update</h3>
                <p className="text-sm text-[#474747]">This will take a few moments...</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">Record Your Update</h2>
                  <p className="text-sm text-[#474747]">
                    Speak naturally about your work. Mention tasks, projects, deadlines, or priorities.
                  </p>
                </div>

                <Recorder
                  onRecordingComplete={handleRecordingComplete}
                  onRecordingStart={() => setRecording(true)}
                  onRecordingStop={() => setRecording(false)}
                />

                <div className="mt-8 p-4 bg-[#F3F3F3] rounded">
                  <p className="text-xs text-[#474747] leading-relaxed">
                    <span className="font-medium">Tips:</span> Mention specific names, dates (like "Friday" or "next week"), 
                    and priorities. For example: "Add high priority task for Love Warranty claims review, due Friday" 
                    or "Update DGS integration to at risk status."
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        {loadingSessions ? (
          <div className="text-center py-12">
            <Spinner size="md" color="default" />
          </div>
        ) : recentSessions.length > 0 ? (
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Recent Updates</h2>
            <div className="space-y-3">
              {recentSessions.slice(0, 5).map(session => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/brain-dump/review/${session.id}`)}
                  className="w-full bg-white rounded p-5 hover:border-gray-300 transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          session.status === 'processed' ? 'bg-[#F3F3F3]0' :
                          session.status === 'processing' ? 'bg-yellow-500' :
                          session.status === 'applied' ? 'bg-[#F3F3F3]0' :
                          'bg-gray-400'
                        }`} />
                        <span className="text-xs font-medium text-[#A3A3A3] uppercase">
                          {session.status}
                        </span>
                        <span className="text-xs text-[#C4C0C0]">•</span>
                        <span className="text-xs text-[#A3A3A3]">
                          {formatDate(session.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-[#1A1C1C] line-clamp-2 leading-relaxed">
                        {session.summary || session.transcript || 'No transcript available'}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="text-[#DD3A44] text-sm">→</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-[#A3A3A3]">No recent updates yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
