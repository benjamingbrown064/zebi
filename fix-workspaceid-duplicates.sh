#!/bin/bash
# Fix duplicate workspaceId declarations

files=(
  "app/api/assistant/chat/route.ts"
  "app/api/assistant/conversations/route.ts"
  "app/api/ai-memory/route.ts"
  "app/api/tasks/bot/route.ts"
  "app/api/ai-insights/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Remove lines like "const workspaceId = workspaceId;"
    sed -i.fixbak '/^[[:space:]]*const workspaceId = workspaceId;$/d' "$file"
    
    # Remove workspaceId from destructuring when it's already declared from requireWorkspace
    # This is more complex and may need manual review
    echo "Fixed $file - please review"
  fi
done
