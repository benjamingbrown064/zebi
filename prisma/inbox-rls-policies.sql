-- RLS policies for InboxItem table
-- Run this after the migration completes

ALTER TABLE "InboxItem" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see inbox items in their workspaces
CREATE POLICY "Users can view inbox items in their workspace"
ON "InboxItem"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "InboxItem"."workspaceId"
    AND wm."userId" = auth.uid()
  )
);

-- Policy: Users can insert inbox items in their workspaces
CREATE POLICY "Users can insert inbox items in their workspace"
ON "InboxItem"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "InboxItem"."workspaceId"
    AND wm."userId" = auth.uid()
  )
);

-- Policy: Users can update their own inbox items
CREATE POLICY "Users can update their own inbox items"
ON "InboxItem"
FOR UPDATE
USING (
  "createdBy" = auth.uid()
  OR EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "InboxItem"."workspaceId"
    AND wm."userId" = auth.uid()
    AND wm."role" IN ('owner', 'admin')
  )
);

-- Policy: Users can delete their own inbox items
CREATE POLICY "Users can delete their own inbox items"
ON "InboxItem"
FOR DELETE
USING (
  "createdBy" = auth.uid()
  OR EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "InboxItem"."workspaceId"
    AND wm."userId" = auth.uid()
    AND wm."role" IN ('owner', 'admin')
  )
);
