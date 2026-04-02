'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Spinner, Chip, Input, Select, SelectItem } from '@heroui/react';
import { FaChevronLeft, FaCheck, FaTimes, FaEdit, FaCalendarCheck } from 'react-icons/fa';

// Helper function to format ISO date for date input (YYYY-MM-DD)
function formatDateForInput(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

// Helper function to format ISO date for display
function formatDateForDisplay(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    const daysAway = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAway >= 0 && daysAway < 7) {
      const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' });
      return `${dayName} at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString('en-GB', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoDate;
  }
}

interface ProposedAction {
  id: string;
  actionType: string;
  targetEntityType: string;
  targetEntityId: string | null;
  payload: Record<string, any>;
  reasoning: string;
  confidenceScore: number;
  needsReview: boolean;
  status: string;
}

interface ActionGroup {
  category: string;
  actions: ProposedAction[];
}

interface ReviewData {
  session: {
    id: string;
    status: string;
    transcript: string;
    summary: string;
  };
  actions: ProposedAction[];
  grouped: ActionGroup[];
  issues: any[];
}

interface WorkspaceEntity {
  id: string;
  name: string;
  type: 'space' | 'project' | 'objective';
}

export default function ReviewClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [editedActions, setEditedActions] = useState<Map<string, Record<string, any>>>(new Map());
  const [workspaceEntities, setWorkspaceEntities] = useState<WorkspaceEntity[]>([]);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  useEffect(() => {
    loadActions();
    loadWorkspaceEntities();
  }, [sessionId]);

  const loadActions = async () => {
    try {
      const res = await fetch(`/api/brain-dump/actions?sessionId=${sessionId}`);
      if (!res.ok) throw new Error('Failed to load actions');
      
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError('Failed to load proposed actions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceEntities = async () => {
    try {
      const [spacesRes, projectsRes, objectivesRes] = await Promise.all([
        fetch('/api/spaces'),
        fetch('/api/projects'),
        fetch('/api/objectives')
      ]);

      const spaces = await spacesRes.json();
      const projects = await projectsRes.json();
      const objectives = await objectivesRes.json();

      const entities: WorkspaceEntity[] = [
        ...spaces.map((c: any) => ({ id: c.id, name: c.name, type: 'space' as const })),
        ...projects.map((p: any) => ({ id: p.id, name: p.name, type: 'project' as const })),
        ...objectives.map((o: any) => ({ id: o.id, name: o.title, type: 'objective' as const }))
      ];

      setWorkspaceEntities(entities);
    } catch (err) {
      console.error('Failed to load workspace entities:', err);
    }
  };

  const handleApprove = async (actionId: string) => {
    try {
      const edits = editedActions.get(actionId);
      if (edits) {
        await fetch('/api/brain-dump/actions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionId, payload: edits })
        });
      }

      await fetch('/api/brain-dump/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, status: 'approved' })
      });
      
      await loadActions();
    } catch (err) {
      console.error('Approve error:', err);
    }
  };

  const handleReject = async (actionId: string) => {
    try {
      await fetch('/api/brain-dump/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, status: 'rejected' })
      });
      
      await loadActions();
    } catch (err) {
      console.error('Reject error:', err);
    }
  };

  const handleEdit = (actionId: string, field: string, value: any) => {
    const current = editedActions.get(actionId) || {};
    const updated = { ...current, [field]: value };
    const newMap = new Map(editedActions);
    newMap.set(actionId, updated);
    setEditedActions(newMap);
  };

  const getEditedPayload = (action: ProposedAction) => {
    const edits = editedActions.get(action.id);
    return edits ? { ...action.payload, ...edits } : action.payload;
  };

  const handleExecute = async () => {
    if (!data) return;

    const approvedActions = data.actions.filter(a => a.status === 'approved');
    
    if (approvedActions.length === 0) {
      alert('Please approve at least one action before executing');
      return;
    }

    const confirmed = confirm(
      `Execute ${approvedActions.length} approved action${approvedActions.length > 1 ? 's' : ''}?\n\nThis will create/update items in your workspace.`
    );

    if (!confirmed) return;

    setExecuting(true);
    setExecutionResult(null);

    try {
      for (const [actionId, edits] of editedActions.entries()) {
        await fetch('/api/brain-dump/actions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionId, payload: edits })
        });
      }

      const res = await fetch('/api/brain-dump/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          actionIds: approvedActions.map(a => a.id)
        })
      });

      if (!res.ok) {
        throw new Error('Execution failed');
      }

      const result = await res.json();
      setExecutionResult(result);

      await loadActions();

      if (result.success && result.summary) {
        setTimeout(() => {
          const { createdEntities } = result.summary;
          if (createdEntities.tasks.length > 0) {
            router.push('/tasks');
          } else if (createdEntities.projects.length > 0) {
            router.push('/projects');
          } else if (createdEntities.objectives.length > 0) {
            router.push('/objectives');
          } else {
            router.push('/dashboard');
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Execute error:', err);
      setExecutionResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <Spinner size="lg" color="default" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded p-8 border border-red-200">
            <p className="text-[#DD3A44] text-base">{error || 'No data available'}</p>
          </div>
        </div>
      </div>
    );
  }

  const approvedCount = data.actions.filter(a => a.status === 'approved').length;

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/brain-dump')}
              className="flex items-center justify-center w-10 h-10 rounded hover:bg-[#F3F3F3] transition-colors"
            >
              <FaChevronLeft className="text-[#5a5757]" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-1">Review Changes</h1>
              <p className="text-sm text-[#5a5757]">{data.session.summary}</p>
            </div>
            {approvedCount > 0 && (
              <Button
                onPress={handleExecute}
                isDisabled={executing}
                isLoading={executing}
                className="bg-[#DD3A44] text-white font-medium px-6 py-2 h-11 rounded hover:bg-[#C62F3A] transition-colors"
              >
                {executing ? 'Applying...' : `Apply ${approvedCount} ${approvedCount === 1 ? 'Change' : 'Changes'}`}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Execution Result */}
        {executionResult && (
          <div className={`mb-8 rounded p-6 ${executionResult.success ? 'bg-[#f0fafa] border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${executionResult.success ? 'bg-[#f0fafa]0' : 'bg-red-500'}`}>
                {executionResult.success ? (
                  <FaCheck className="text-white text-sm" />
                ) : (
                  <FaTimes className="text-white text-sm" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold mb-2 ${executionResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {executionResult.success ? 'Successfully Applied' : 'Execution Failed'}
                </h3>
                <p className={`text-sm mb-3 ${executionResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {executionResult.message || executionResult.error}
                </p>
                {executionResult.summary && (
                  <div className="space-y-1 text-sm text-[#5a5757]">
                    {executionResult.summary.createdEntities.tasks.length > 0 && (
                      <p>✓ Created {executionResult.summary.createdEntities.tasks.length} task(s)</p>
                    )}
                    {executionResult.summary.createdEntities.projects.length > 0 && (
                      <p>✓ Created {executionResult.summary.createdEntities.projects.length} project(s)</p>
                    )}
                    {executionResult.summary.createdEntities.objectives.length > 0 && (
                      <p>✓ Created {executionResult.summary.createdEntities.objectives.length} objective(s)</p>
                    )}
                    {executionResult.success && (
                      <p className="text-[#5a5757] mt-3">Redirecting in 2 seconds...</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transcript */}
        <div className="mb-8 bg-white rounded p-8">
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Your Update</h2>
          <p className="text-base text-[#5a5757] leading-relaxed">{data.session.transcript}</p>
        </div>

        {/* No Actions */}
        {data.actions.length === 0 && (
          <div className="bg-[#f0fafa] rounded p-8 border border-transparent">
            <p className="text-blue-900 text-base">
              No actionable items found in your update. Try speaking more specifically about tasks, projects, or objectives.
            </p>
          </div>
        )}

        {/* Actions */}
        {data.grouped.map(group => (
          <div key={group.category} className="mb-8">
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">
              {group.category === 'creates' && '📝 New Items to Create'}
              {group.category === 'updates' && '🔄 Updates'}
              {group.category === 'assignments' && '👤 Assignments'}
              {group.category === 'scheduling' && '📅 Scheduling'}
              {group.category === 'notes' && '📌 Notes'}
              {group.category === 'clarification' && '⚠️ Needs Clarification'}
            </h2>
            
            <div className="space-y-4">
              {group.actions.map(action => {
                const isEditing = editingAction === action.id;
                const displayPayload = getEditedPayload(action);
                const isApproved = action.status === 'approved';
                const isRejected = action.status === 'rejected';

                return (
                  <div
                    key={action.id}
                    className={`bg-white rounded p-6 border transition-all ${
                      isApproved ? 'border-green-500 bg-[#f0fafa]' :
                      isRejected ? 'border-gray-300 bg-[#F3F3F3] opacity-60' :
                      'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        {/* Action Type & Confidence */}
                        <div className="flex items-center gap-3 mb-3">
                          <Chip
                            size="sm"
                            variant="flat"
                            className="bg-[#F3F3F3] text-[#5a5757] text-xs font-medium"
                          >
                            {action.actionType.replace(/_/g, ' ')}
                          </Chip>
                          <span className="text-xs text-[#A3A3A3]">
                            {Math.round(action.confidenceScore * 100)}% confidence
                          </span>
                        </div>

                        {/* Reasoning */}
                        <p className="text-base text-[#1c1b1b] mb-4 leading-relaxed">{action.reasoning}</p>

                        {/* Editable Fields */}
                        {isEditing ? (
                          <div className="space-y-5 p-5 bg-[#F3F3F3] rounded">
                            <Input
                              label="Title"
                              labelPlacement="outside"
                              placeholder="Enter title"
                              value={displayPayload.title || ''}
                              onChange={(e) => handleEdit(action.id, 'title', e.target.value)}
                              classNames={{
                                label: 'text-sm font-medium text-[#5a5757] mb-1',
                                input: 'text-sm',
                                inputWrapper: 'bg-white border-gray-200'
                              }}
                            />

                            <Input
                              label="Description"
                              labelPlacement="outside"
                              placeholder="Enter description"
                              value={displayPayload.description || ''}
                              onChange={(e) => handleEdit(action.id, 'description', e.target.value)}
                              classNames={{
                                label: 'text-sm font-medium text-[#5a5757] mb-1',
                                input: 'text-sm',
                                inputWrapper: 'bg-white border-gray-200'
                              }}
                            />

                            {displayPayload.dueAt && (
                              <div>
                                <Input
                                  label="Due Date"
                                  labelPlacement="outside"
                                  type="date"
                                  value={displayPayload.dueAt ? formatDateForInput(displayPayload.dueAt) : ''}
                                  onChange={(e) => handleEdit(action.id, 'dueAt', e.target.value)}
                                  classNames={{
                                    label: 'text-sm font-medium text-[#5a5757] mb-1',
                                    input: 'text-sm',
                                    inputWrapper: 'bg-white border-gray-200'
                                  }}
                                />
                                {displayPayload.dueAt && (
                                  <p className="text-xs text-[#A3A3A3] mt-2 pl-1">
                                    {formatDateForDisplay(displayPayload.dueAt)}
                                  </p>
                                )}
                              </div>
                            )}

                            <Select
                              label="Priority"
                              labelPlacement="outside"
                              placeholder="Select priority"
                              selectedKeys={displayPayload.priority ? [displayPayload.priority] : []}
                              onSelectionChange={(keys) => {
                                const priority = Array.from(keys)[0] as string;
                                handleEdit(action.id, 'priority', priority);
                              }}
                              classNames={{
                                label: 'text-sm font-medium text-[#5a5757] mb-1',
                                trigger: 'bg-white border-gray-200',
                                value: 'text-sm'
                              }}
                            >
                              <SelectItem key="low">Low</SelectItem>
                              <SelectItem key="medium">Medium</SelectItem>
                              <SelectItem key="high">High</SelectItem>
                            </Select>

                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                onPress={() => setEditingAction(null)}
                                className="bg-[#DD3A44] text-white hover:bg-[#C62F3A] rounded-md font-medium"
                              >
                                Done Editing
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 text-sm text-[#5a5757]">
                            {displayPayload.title && (
                              <p><span className="font-medium">Title:</span> {displayPayload.title}</p>
                            )}
                            {displayPayload.dueAt && (
                              <p><span className="font-medium">Due:</span> {formatDateForDisplay(displayPayload.dueAt)}</p>
                            )}
                            {displayPayload.priority && (
                              <p><span className="font-medium">Priority:</span> {displayPayload.priority}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {!isApproved && !isRejected && (
                          <>
                            <button
                              onClick={() => setEditingAction(isEditing ? null : action.id)}
                              className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-[#F3F3F3] transition-colors"
                              title="Edit"
                            >
                              <FaEdit className="text-[#5a5757] text-sm" />
                            </button>
                            <button
                              onClick={() => handleReject(action.id)}
                              className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-red-50 transition-colors"
                              title="Reject"
                            >
                              <FaTimes className="text-red-600 text-sm" />
                            </button>
                            <button
                              onClick={() => handleApprove(action.id)}
                              className="flex items-center justify-center w-9 h-9 rounded-md bg-[#DD3A44] hover:bg-[#C62F3A] transition-colors"
                              title="Approve"
                            >
                              <FaCheck className="text-white text-sm" />
                            </button>
                          </>
                        )}
                        {isApproved && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-[#f0fafa]0 rounded-md">
                            <FaCheck className="text-white text-sm" />
                            <span className="text-white text-sm font-medium">Approved</span>
                          </div>
                        )}
                        {isRejected && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-gray-400 rounded-md">
                            <FaTimes className="text-white text-sm" />
                            <span className="text-white text-sm font-medium">Rejected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
