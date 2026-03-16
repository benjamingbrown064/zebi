#!/bin/bash
# Fix all remaining DEFAULT_WORKSPACE_ID references in API routes

echo "Fixing remaining workspace isolation issues..."

# List of files that need fixing
files=(
  "app/api/ai-insights/[id]/review/route.ts"
  "app/api/assistant/chat/route.ts"
  "app/api/assistant/conversations/route.ts"
  "app/api/ai-memory/route.ts"
  "app/api/ai-memory/[id]/route.ts"
  "app/api/tasks/bot/route.ts"
  "app/api/tasks/[taskId]/route.ts"
  "app/api/ai-insights/route.ts"
  "app/api/ai-insights/[id]/route.ts"
  "app/api/voice-coach/create/route.ts"
  "app/api/projects/[id]/route.ts"
  "app/api/brain-dump/execute/route.ts"
  "app/api/migrate-action-plans/route.ts"
  "app/api/companies/route.ts"
  "app/api/companies/[id]/route.ts"
  "app/api/voice-entity/create/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Checking $file..."
    
    # Check if requireWorkspace is already imported
    if ! grep -q "import.*requireWorkspace.*from.*@/lib/workspace" "$file"; then
      # Add import if missing
      sed -i.fixbak2 "1a\\
import { requireWorkspace } from '@/lib/workspace'
" "$file"
      echo "  - Added requireWorkspace import"
    fi
    
    # Replace DEFAULT_WORKSPACE_ID with workspaceId variable call
    # This is a simplified approach - some files may need manual review
    if grep -q "DEFAULT_WORKSPACE_ID" "$file"; then
      echo "  - Found DEFAULT_WORKSPACE_ID references - needs manual fix"
    fi
  fi
done

echo "Done. Files may need manual review for proper async/await handling."
