// Voice-to-Task Breakdown Types
// TypeScript interfaces for the voice-first task planning feature

export type ContextType = 'project' | 'objective' | 'company' | 'general';

export type SessionStatus =
  | 'recording'
  | 'processing'
  | 'ready_for_review'
  | 'applied'
  | 'cancelled'
  | 'failed';

export type DuplicateStatus = 'none' | 'possible_existing' | 'possible_generated';

// ==================== API Request/Response Types ====================

export interface CreateSessionRequest {
  contextType: ContextType;
  contextId?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  status: SessionStatus;
  context: {
    type: ContextType;
    id?: string;
    name?: string;
  };
}

export interface UploadAudioRequest {
  audio: File | Blob;
}

export interface UploadAudioResponse {
  sessionId: string;
  status: SessionStatus;
  audioDurationSeconds: number;
  audioUrl: string;
}

export interface SessionReviewResponse {
  sessionId: string;
  status: SessionStatus;
  context: {
    type: ContextType;
    id?: string;
    name?: string;
  };
  transcriptSummary?: string;
  candidates: TaskCandidate[];
}

export interface TaskCandidate {
  id: string;
  title: string;
  description: string | null;
  selected: boolean;
  duplicateStatus: DuplicateStatus;
  duplicateReference?: {
    taskId: string;
    title: string;
  };
  confidence?: number;
  sortOrder: number;
  suggestedAssigneeId?: string;
  suggestedDueDate?: string;
  suggestedPriority?: number;
}

export interface UpdateCandidateRequest {
  updates: CandidateUpdate[];
}

export interface CandidateUpdate {
  id: string;
  title?: string;
  description?: string | null;
  selected?: boolean;
  sortOrder?: number;
}

export interface AddManualCandidateRequest {
  title: string;
  description?: string;
  sortOrder?: number;
}

export interface AddManualCandidateResponse {
  candidate: TaskCandidate;
}

export interface CreateTasksRequest {
  candidateIds: string[];
}

export interface CreateTasksResponse {
  success: boolean;
  created: number;
  skipped: number;
  taskIds: string[];
  context: {
    type: ContextType;
    id?: string;
    name?: string;
  };
}

// ==================== Internal Service Types ====================

export interface TranscriptionResult {
  transcript: string;
  duration: number;
  confidence?: number;
}

export interface ExtractedTask {
  title: string;
  description: string;
  confidence: number;
  sourceFragment?: string;
  suggestedAssigneeId?: string;
  suggestedDueDate?: Date;
  suggestedPriority?: number;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matchedTaskId?: string;
  matchedTaskTitle?: string;
  similarity: number;
}

export interface TaskCreationResult {
  success: boolean;
  createdTaskIds: string[];
  skippedCandidateIds: string[];
  errors?: string[];
}

// ==================== Component Props ====================

export interface VoiceToTaskFlowProps {
  contextType: ContextType;
  contextId?: string;
  onComplete?: (result: CreateTasksResponse) => void;
  onCancel?: () => void;
}

export interface CaptureScreenProps {
  onRecordingComplete: (audioBlob: Blob, durationSeconds: number) => void;
  onCancel: () => void;
}

export interface ProcessingScreenProps {
  currentStep: string;
  onCancel?: () => void;
}

export interface ReviewScreenProps {
  sessionId: string;
  context: {
    type: ContextType;
    id?: string;
    name?: string;
  };
  candidates: TaskCandidate[];
  onUpdateCandidates: (updates: CandidateUpdate[]) => Promise<void>;
  onAddManualCandidate: (title: string, description?: string) => Promise<TaskCandidate>;
  onCreateTasks: (candidateIds: string[]) => Promise<CreateTasksResponse>;
  onCancel: () => void;
}

export interface ResultScreenProps {
  result: CreateTasksResponse;
  onClose: () => void;
  onViewTasks?: () => void;
}

export interface TaskCandidateRowProps {
  candidate: TaskCandidate;
  onUpdate: (id: string, updates: Partial<TaskCandidate>) => void;
  onRemove: (id: string) => void;
  onToggleSelect: (id: string, selected: boolean) => void;
}

// ==================== Service Interfaces ====================

export interface ISessionService {
  createSession(
    workspaceId: string,
    userId: string,
    contextType: ContextType,
    contextId?: string
  ): Promise<CreateSessionResponse>;

  uploadAudio(sessionId: string, audioBlob: Blob): Promise<UploadAudioResponse>;

  getSessionReview(sessionId: string): Promise<SessionReviewResponse>;

  updateCandidates(sessionId: string, updates: CandidateUpdate[]): Promise<void>;

  addManualCandidate(
    sessionId: string,
    title: string,
    description?: string
  ): Promise<TaskCandidate>;

  createTasksFromSession(
    sessionId: string,
    candidateIds: string[]
  ): Promise<CreateTasksResponse>;

  cancelSession(sessionId: string): Promise<void>;
}

export interface ITranscriptionService {
  transcribeAudio(audioUrl: string): Promise<TranscriptionResult>;
}

export interface IExtractionService {
  extractTasksFromTranscript(
    transcript: string,
    contextType: ContextType,
    contextName?: string
  ): Promise<ExtractedTask[]>;

  generateDescriptions(tasks: ExtractedTask[]): Promise<ExtractedTask[]>;

  detectDuplicates(
    candidates: ExtractedTask[],
    existingTasks: { id: string; title: string }[]
  ): Promise<Map<string, DuplicateDetectionResult>>;
}
