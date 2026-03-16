#!/bin/bash

# Systematically fix all API routes to use workspace from auth
# This script fixes the most critical security issue: API data exposure

set -e

echo "🔐 Fixing API routes for workspace isolation..."
echo ""

# Get all API route files that have DEFAULT_WORKSPACE_ID
FILES=$(find app/api -name "route.ts" -exec grep -l "DEFAULT_WORKSPACE_ID" {} \;)

FIXED=0
SKIPPED=0

for file in $FILES; do
  echo "📝 Processing: $file"
  
  # Skip Doug API routes for now - they use DOUG_API_TOKEN auth
  if [[ $file == *"/doug/"* ]]; then
    echo "   ⏭️  Skipped (Doug API - uses token auth)"
    ((SKIPPED++))
    continue
  fi
  
  # Skip cron routes - they don't have user sessions
  if [[ $file == *"/cron/"* ]]; then
    echo "   ⏭️  Skipped (Cron job - no user session)"
    ((SKIPPED++))
    continue
  fi
  
  # Create backup
  cp "$file" "$file.bak"
  
  # Check if already has requireWorkspace import
  if grep -q "import.*requireWorkspace" "$file"; then
    echo "   ✓ Already has requireWorkspace import"
  else
    # Add import after the last import statement
    # Find the last line that starts with 'import'
    LAST_IMPORT_LINE=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
    
    if [ -n "$LAST_IMPORT_LINE" ]; then
      sed -i '' "${LAST_IMPORT_LINE}a\\
import { requireWorkspace } from '@/lib/workspace'
" "$file"
      echo "   ✓ Added requireWorkspace import"
    else
      echo "   ⚠️  Could not find import section"
      continue
    fi
  fi
  
  # Remove DEFAULT_WORKSPACE_ID constant declaration
  sed -i '' '/const DEFAULT_WORKSPACE_ID = /d' "$file"
  echo "   ✓ Removed DEFAULT_WORKSPACE_ID constant"
  
  # For GET handlers
  if grep -q "export async function GET" "$file"; then
    # Check if already has workspace retrieval
    if ! grep -A 5 "export async function GET" "$file" | grep -q "requireWorkspace"; then
      # Add workspace retrieval after try {
      sed -i '' '/export async function GET.*{/,/try {/{
        s/try {/try {\
    const workspaceId = await requireWorkspace()/
      }' "$file"
      echo "   ✓ Added workspace retrieval to GET handler"
    fi
  fi
  
  # For POST handlers
  if grep -q "export async function POST" "$file"; then
    # Check if already has workspace retrieval
    if ! grep -A 5 "export async function POST" "$file" | grep -q "requireWorkspace"; then
      sed -i '' '/export async function POST.*{/,/try {/{
        s/try {/try {\
    const workspaceId = await requireWorkspace()/
      }' "$file"
      echo "   ✓ Added workspace retrieval to POST handler"
    fi
  fi
  
  # For PATCH handlers
  if grep -q "export async function PATCH" "$file"; then
    if ! grep -A 5 "export async function PATCH" "$file" | grep -q "requireWorkspace"; then
      sed -i '' '/export async function PATCH.*{/,/try {/{
        s/try {/try {\
    const workspaceId = await requireWorkspace()/
      }' "$file"
      echo "   ✓ Added workspace retrieval to PATCH handler"
    fi
  fi
  
  # For DELETE handlers
  if grep -q "export async function DELETE" "$file"; then
    if ! grep -A 5 "export async function DELETE" "$file" | grep -q "requireWorkspace"; then
      sed -i '' '/export async function DELETE.*{/,/try {/{
        s/try {/try {\
    const workspaceId = await requireWorkspace()/
      }' "$file"
      echo "   ✓ Added workspace retrieval to DELETE handler"
    fi
  fi
  
  # Replace workspaceId query param usage with the retrieved workspace
  # This is aggressive - manual review may be needed
  sed -i '' "s/searchParams\.get('workspaceId') || DEFAULT_WORKSPACE_ID/workspaceId/g" "$file"
  sed -i '' "s/searchParams\.get('workspaceId')/workspaceId/g" "$file"
  
  echo "   ✅ Fixed: $file"
  ((FIXED++))
  echo ""
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Fixed: $FIXED files"
echo "⏭️  Skipped: $SKIPPED files (require manual handling)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Review changes before committing!"
echo "   - Backups saved as *.bak files"
echo "   - Some routes may need custom workspace handling"
echo "   - Test all endpoints after changes"
echo ""
echo "Remaining DEFAULT_WORKSPACE_ID references:"
find app/api -name "route.ts" -exec grep -l "DEFAULT_WORKSPACE_ID" {} \; | wc -l
