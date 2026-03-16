#!/bin/bash

# Script to systematically fix workspace isolation issues
# Replaces DEFAULT_WORKSPACE_ID with proper workspace retrieval

echo "🔧 Fixing workspace isolation issues..."

# Get list of all files that still have DEFAULT_WORKSPACE_ID
FILES=$(grep -rl "DEFAULT_WORKSPACE_ID" --include="*.ts" --include="*.tsx" app/ lib/ components/ 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "✅ No more DEFAULT_WORKSPACE_ID references found!"
  exit 0
fi

echo "Found files with DEFAULT_WORKSPACE_ID:"
echo "$FILES"
echo ""

# Fix API routes (server-side)
echo "📝 Fixing API routes..."
for file in $FILES; do
  if [[ $file == app/api/* && $file == *.ts ]]; then
    echo "  - $file"
    
    # Add imports if not already present
    if ! grep -q "import.*requireWorkspace.*from '@/lib/workspace'" "$file"; then
      # Add after other imports
      sed -i '' '/^import/a\
import { requireWorkspace } from '\''@/lib/workspace'\''
' "$file" 2>/dev/null || true
    fi
    
    # Remove DEFAULT_WORKSPACE_ID constant
    sed -i '' '/const DEFAULT_WORKSPACE_ID/d' "$file"
    
    # Add workspace retrieval at start of handler
    if grep -q "export async function GET" "$file"; then
      sed -i '' '/export async function GET/,/try {/s/try {/try {\
    const workspaceId = await requireWorkspace()/' "$file" 2>/dev/null || true
    fi
    
    if grep -q "export async function POST" "$file"; then
      sed -i '' '/export async function POST/,/try {/s/try {/try {\
    const workspaceId = await requireWorkspace()/' "$file" 2>/dev/null || true
    fi
  fi
done

# Fix client components
echo "📝 Fixing client components..."
for file in $FILES; do
  if grep -q "'use client'" "$file" || grep -q '"use client"' "$file"; then
    echo "  - $file"
    
    # Add useWorkspace hook import if not present
    if ! grep -q "import.*useWorkspace.*from '@/lib/use-workspace'" "$file"; then
      sed -i '' '/^import/a\
import { useWorkspace } from '\''@/lib/use-workspace'\''
' "$file" 2>/dev/null || true
    fi
    
    # Remove DEFAULT_WORKSPACE_ID constant
    sed -i '' '/const DEFAULT_WORKSPACE_ID/d' "$file"
    
    # Note: Adding the hook usage requires manual intervention per component
    echo "    ⚠️  Manual step needed: Add 'const { workspaceId } = useWorkspace()' to component"
  fi
done

# Fix server components
echo "📝 Fixing server components..."
for file in $FILES; do
  if [[ $file == app/* && $file == *.tsx ]] && ! grep -q "'use client'" "$file" && ! grep -q '"use client"' "$file"; then
    echo "  - $file"
    
    # Add import if not present
    if ! grep -q "import.*requireWorkspace.*from '@/lib/workspace'" "$file"; then
      sed -i '' '/^import/a\
import { requireWorkspace } from '\''@/lib/workspace'\''
' "$file" 2>/dev/null || true
    fi
    
    # Remove DEFAULT_WORKSPACE_ID constant
    sed -i '' '/const DEFAULT_WORKSPACE_ID/d' "$file"
  fi
done

echo ""
echo "✅ Automatic fixes applied!"
echo ""
echo "⚠️  Manual steps required:"
echo "1. In client components, add: const { workspaceId } = useWorkspace()"
echo "2. In server components, add: const workspaceId = await requireWorkspace()"
echo "3. Replace all DEFAULT_WORKSPACE_ID with workspaceId"
echo "4. Add workspace guards: if (!workspaceId) return"
echo ""
echo "📊 Remaining files to fix:"
grep -rl "DEFAULT_WORKSPACE_ID" --include="*.ts" --include="*.tsx" app/ lib/ components/ 2>/dev/null | wc -l
