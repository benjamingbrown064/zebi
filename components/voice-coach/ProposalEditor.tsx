'use client';

import { useState } from 'react';
import { Button, Input, Textarea, Select, SelectItem } from '@heroui/react';
import { FaTimes, FaPlus } from 'react-icons/fa';

interface ProposalGoal {
  name: string;
  description: string;
  successCriteria: string;
  targetDate: string | null;
}

interface ProposalObjective {
  title: string;
  priority: 'high' | 'medium' | 'low';
  targetDate: string | null;
}

interface ProposalProject {
  name: string;
  objectiveIndex: number | null;
}

interface ProposalTask {
  title: string;
  projectIndex: number | null;
}

interface Proposal {
  goal: ProposalGoal;
  objectives: ProposalObjective[];
  projects: ProposalProject[];
  tasks: ProposalTask[];
  blockers: string[];
  uncertainties: string[];
}

interface ProposalEditorProps {
  proposal: Proposal;
  onSave: (updatedProposal: Proposal) => void;
  onCancel: () => void;
}

export default function ProposalEditor({ proposal, onSave, onCancel }: ProposalEditorProps) {
  const [editedProposal, setEditedProposal] = useState<Proposal>(proposal);

  const updateGoal = (field: keyof ProposalGoal, value: string | null) => {
    setEditedProposal({
      ...editedProposal,
      goal: {
        ...editedProposal.goal,
        [field]: value
      }
    });
  };

  const updateObjective = (index: number, field: keyof ProposalObjective, value: string | null) => {
    const updated = [...editedProposal.objectives];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditedProposal({
      ...editedProposal,
      objectives: updated
    });
  };

  const removeObjective = (index: number) => {
    setEditedProposal({
      ...editedProposal,
      objectives: editedProposal.objectives.filter((_, i) => i !== index)
    });
  };

  const addObjective = () => {
    setEditedProposal({
      ...editedProposal,
      objectives: [
        ...editedProposal.objectives,
        { title: '', priority: 'medium', targetDate: null }
      ]
    });
  };

  const updateProject = (index: number, field: keyof ProposalProject, value: string | number | null) => {
    const updated = [...editedProposal.projects];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditedProposal({
      ...editedProposal,
      projects: updated
    });
  };

  const removeProject = (index: number) => {
    setEditedProposal({
      ...editedProposal,
      projects: editedProposal.projects.filter((_, i) => i !== index)
    });
  };

  const addProject = () => {
    setEditedProposal({
      ...editedProposal,
      projects: [
        ...editedProposal.projects,
        { name: '', objectiveIndex: null }
      ]
    });
  };

  const updateTask = (index: number, field: keyof ProposalTask, value: string | number | null) => {
    const updated = [...editedProposal.tasks];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditedProposal({
      ...editedProposal,
      tasks: updated
    });
  };

  const removeTask = (index: number) => {
    setEditedProposal({
      ...editedProposal,
      tasks: editedProposal.tasks.filter((_, i) => i !== index)
    });
  };

  const addTask = () => {
    setEditedProposal({
      ...editedProposal,
      tasks: [
        ...editedProposal.tasks,
        { title: '', projectIndex: null }
      ]
    });
  };

  const updateBlocker = (index: number, value: string) => {
    const updated = [...editedProposal.blockers];
    updated[index] = value;
    setEditedProposal({
      ...editedProposal,
      blockers: updated
    });
  };

  const removeBlocker = (index: number) => {
    setEditedProposal({
      ...editedProposal,
      blockers: editedProposal.blockers.filter((_, i) => i !== index)
    });
  };

  const addBlocker = () => {
    setEditedProposal({
      ...editedProposal,
      blockers: [...editedProposal.blockers, '']
    });
  };

  return (
    <div className="space-y-6">
      {/* Goal Section */}
      <div className="p-4 bg-white rounded-[10px]">
        <h4 className="text-sm font-semibold text-[#A3A3A3] mb-3">🎯 GOAL</h4>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#5a5757] mb-1">Name</label>
            <Input
              value={editedProposal.goal.name}
              onChange={(e) => updateGoal('name', e.target.value)}
              placeholder="Goal name"
              classNames={{
                input: 'text-sm',
                inputWrapper: 'min-h-[44px]'
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5757] mb-1">Description</label>
            <Textarea
              value={editedProposal.goal.description}
              onChange={(e) => updateGoal('description', e.target.value)}
              placeholder="What are you trying to achieve?"
              minRows={3}
              classNames={{
                input: 'text-sm'
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5757] mb-1">Success Criteria</label>
            <Textarea
              value={editedProposal.goal.successCriteria}
              onChange={(e) => updateGoal('successCriteria', e.target.value)}
              placeholder="How will you know you've succeeded?"
              minRows={2}
              classNames={{
                input: 'text-sm'
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5757] mb-1">Target Date</label>
            <Input
              type="date"
              value={editedProposal.goal.targetDate || ''}
              onChange={(e) => updateGoal('targetDate', e.target.value || null)}
              classNames={{
                input: 'text-sm',
                inputWrapper: 'min-h-[44px]'
              }}
            />
          </div>
        </div>
      </div>

      {/* Objectives Section */}
      <div className="p-4 bg-white rounded-[10px]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-[#A3A3A3]">📋 OBJECTIVES ({editedProposal.objectives.length})</h4>
          <Button
            size="sm"
            color="default"
            variant="flat"
            startContent={<FaPlus className="text-xs" />}
            onPress={addObjective}
          >
            Add
          </Button>
        </div>

        <div className="space-y-3">
          {editedProposal.objectives.map((obj, index) => (
            <div key={index} className="p-3 bg-[#f6f3f2] rounded-[8px] space-y-2">
              <div className="flex items-start gap-2">
                <Input
                  value={obj.title}
                  onChange={(e) => updateObjective(index, 'title', e.target.value)}
                  placeholder="Objective title"
                  classNames={{
                    input: 'text-sm',
                    inputWrapper: 'min-h-[40px]'
                  }}
                />
                <Button
                  isIconOnly
                  size="sm"
                  color="danger"
                  variant="flat"
                  onPress={() => removeObjective(index)}
                >
                  <FaTimes />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Priority"
                  selectedKeys={[obj.priority]}
                  onChange={(e) => updateObjective(index, 'priority', e.target.value as 'high' | 'medium' | 'low')}
                  size="sm"
                  classNames={{
                    trigger: 'min-h-[40px]'
                  }}
                >
                  <SelectItem key="high">High</SelectItem>
                  <SelectItem key="medium">Medium</SelectItem>
                  <SelectItem key="low">Low</SelectItem>
                </Select>

                <Input
                  type="date"
                  label="Target Date"
                  value={obj.targetDate || ''}
                  onChange={(e) => updateObjective(index, 'targetDate', e.target.value || null)}
                  size="sm"
                  classNames={{
                    inputWrapper: 'min-h-[40px]'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projects Section */}
      <div className="p-4 bg-white rounded-[10px]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-[#A3A3A3]">🗂️ PROJECTS ({editedProposal.projects.length})</h4>
          <Button
            size="sm"
            color="default"
            variant="flat"
            startContent={<FaPlus className="text-xs" />}
            onPress={addProject}
          >
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {editedProposal.projects.map((proj, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={proj.name}
                onChange={(e) => updateProject(index, 'name', e.target.value)}
                placeholder="Project name"
                classNames={{
                  input: 'text-sm',
                  inputWrapper: 'min-h-[40px]'
                }}
              />
              <Button
                isIconOnly
                size="sm"
                color="danger"
                variant="flat"
                onPress={() => removeProject(index)}
              >
                <FaTimes />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks Section */}
      <div className="p-4 bg-white rounded-[10px]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-[#A3A3A3]">✅ TASKS ({editedProposal.tasks.length})</h4>
          <Button
            size="sm"
            color="default"
            variant="flat"
            startContent={<FaPlus className="text-xs" />}
            onPress={addTask}
          >
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {editedProposal.tasks.map((task, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm text-[#5a5757] min-w-[24px]">{index + 1}.</span>
              <Input
                value={task.title}
                onChange={(e) => updateTask(index, 'title', e.target.value)}
                placeholder="Task description"
                classNames={{
                  input: 'text-sm',
                  inputWrapper: 'min-h-[40px]'
                }}
              />
              <Button
                isIconOnly
                size="sm"
                color="danger"
                variant="flat"
                onPress={() => removeTask(index)}
              >
                <FaTimes />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Blockers Section */}
      {editedProposal.blockers.length > 0 && (
        <div className="p-4 bg-white rounded-[10px]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[#A3A3A3]">⚠️ BLOCKERS & RISKS ({editedProposal.blockers.length})</h4>
            <Button
              size="sm"
              color="default"
              variant="flat"
              startContent={<FaPlus className="text-xs" />}
              onPress={addBlocker}
            >
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {editedProposal.blockers.map((blocker, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={blocker}
                  onChange={(e) => updateBlocker(index, e.target.value)}
                  placeholder="Risk or blocker"
                  classNames={{
                    input: 'text-sm',
                    inputWrapper: 'min-h-[40px]'
                  }}
                />
                <Button
                  isIconOnly
                  size="sm"
                  color="danger"
                  variant="flat"
                  onPress={() => removeBlocker(index)}
                >
                  <FaTimes />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          color="default"
          variant="bordered"
          onPress={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          color="danger"
          onPress={() => onSave(editedProposal)}
          className="flex-1"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
