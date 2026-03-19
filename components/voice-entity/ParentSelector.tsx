'use client';

import { Select, SelectItem } from '@heroui/react';

interface ParentSelectorProps {
  entityType: 'objective' | 'project';
  selectedParentId: string | null;
  selectedParentType: 'goal' | 'company' | 'objective' | null;
  onParentChange: (parentId: string | null, parentType: 'goal' | 'company' | 'objective' | null) => void;
  context?: {
    existingGoals?: Array<{ id: string; name: string }>;
    existingCompanies?: Array<{ id: string; name: string }>;
    existingObjectives?: Array<{ id: string; title: string }>;
  };
}

export default function ParentSelector({
  entityType,
  selectedParentId,
  selectedParentType,
  onParentChange,
  context
}: ParentSelectorProps) {
  if (!context) return null;

  return (
    <div className="mb-6 p-4 bg-[#f0fafa] border border-transparent rounded-[10px]">
      <p className="text-sm font-medium text-blue-900 mb-3">
        {entityType === 'objective' 
          ? 'Link to Goal or Company (optional)' 
          : 'Link to Objective or Company (optional)'}
      </p>
      <div className="space-y-3">
        {entityType === 'objective' && context.existingGoals && context.existingGoals.length > 0 && (
          <Select
            label="Select Goal"
            placeholder="No goal (standalone)"
            selectedKeys={selectedParentType === 'goal' && selectedParentId ? [selectedParentId] : []}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0];
              if (selectedKey) {
                onParentChange(String(selectedKey), 'goal');
              } else {
                onParentChange(null, null);
              }
            }}
            classNames={{
              trigger: 'min-h-[44px]',
            }}
          >
            {context.existingGoals.map((goal) => (
              <SelectItem key={goal.id}>
                {goal.name}
              </SelectItem>
            ))}
          </Select>
        )}
        
        {entityType === 'project' && context.existingObjectives && context.existingObjectives.length > 0 && (
          <Select
            label="Select Objective"
            placeholder="No objective"
            selectedKeys={selectedParentType === 'objective' && selectedParentId ? [selectedParentId] : []}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0];
              if (selectedKey) {
                onParentChange(String(selectedKey), 'objective');
              } else {
                onParentChange(null, null);
              }
            }}
            classNames={{
              trigger: 'min-h-[44px]',
            }}
          >
            {context.existingObjectives.map((objective) => (
              <SelectItem key={objective.id}>
                {objective.title}
              </SelectItem>
            ))}
          </Select>
        )}
        
        {context.existingCompanies && context.existingCompanies.length > 0 && (
          <Select
            label={entityType === 'objective' ? 'Or Select Company' : 'Or Select Company'}
            placeholder="No company"
            selectedKeys={selectedParentType === 'company' && selectedParentId ? [selectedParentId] : []}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0];
              if (selectedKey) {
                onParentChange(String(selectedKey), 'company');
              } else {
                onParentChange(null, null);
              }
            }}
            classNames={{
              trigger: 'min-h-[44px]',
            }}
          >
            {context.existingCompanies.map((company) => (
              <SelectItem key={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </Select>
        )}
      </div>
    </div>
  );
}
