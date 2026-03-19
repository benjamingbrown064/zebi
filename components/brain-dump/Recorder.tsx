'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@heroui/react';
import { FaMicrophone, FaStop, FaPause, FaPlay } from 'react-icons/fa';

interface RecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export default function Recorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop
}: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      // Try to use best available format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }
      
      console.log('Using audio format:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        
        console.log('Recorder captured:', {
          chunks: chunksRef.current.length,
          totalSize: audioBlob.size,
          type: audioBlob.type,
          duration: recordingTime
        });
        
        // Debug: Create audio URL to verify recording
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('Audio playback URL (paste in browser to test):', audioUrl);
        
        onRecordingComplete(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        if (onRecordingStop) {
          onRecordingStop();
        }
      };

      // Start recording (no timeslice parameter - let MediaRecorder decide optimal chunk size)
      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
        setRecordingTime(Math.floor(elapsed / 1000));
      }, 100);

      if (onRecordingStart) {
        onRecordingStart();
      }
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      const now = Date.now();
      pausedTimeRef.current += now - (startTimeRef.current + pausedTimeRef.current + recordingTime * 1000);
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-center">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[10px]">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-8">
        {/* Timer */}
        <div className={`text-6xl font-light tracking-wide transition-colors ${
          isRecording ? (isPaused ? 'text-yellow-600' : 'text-[#DD3A44]') : 'text-[#C4C0C0]'
        }`}>
          {formatTime(recordingTime)}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center justify-center w-20 h-20 bg-[#DD3A44] hover:bg-[#C62F3A] rounded-full transition-all transform hover:scale-105 active:scale-95"
            >
              <FaMicrophone className="text-white text-2xl" />
            </button>
          ) : (
            <>
              <button
                onClick={togglePause}
                className="flex items-center justify-center w-16 h-16 bg-[#e8e4e4] hover:bg-gray-300 rounded-full transition-colors"
              >
                {isPaused ? (
                  <FaPlay className="text-[#5a5757] text-xl ml-1" />
                ) : (
                  <FaPause className="text-[#5a5757] text-xl" />
                )}
              </button>
              
              <button
                onClick={stopRecording}
                className="flex items-center justify-center w-20 h-20 bg-[#DD3A44] hover:bg-[#C62F3A] rounded-full transition-all transform hover:scale-105 active:scale-95"
              >
                <FaStop className="text-white text-2xl" />
              </button>
            </>
          )}
        </div>

        {/* Status Text */}
        <div className="text-sm text-[#5a5757]">
          {!isRecording && 'Click to start recording'}
          {isRecording && !isPaused && 'Recording... Click pause or stop when done'}
          {isRecording && isPaused && 'Paused. Click to resume or stop'}
        </div>
      </div>
    </div>
  );
}
