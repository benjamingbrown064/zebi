-- Row Level Security (RLS) Policies for Focus App
-- Run this in Supabase SQL Editor to enable data isolation between users
-- 
-- NOTE: These policies rely on auth.uid() which requires Supabase Auth.
-- For now, workspace isolation is enforced at the application level (server actions).
-- When Supabase Auth is integrated, run this script to enable database-level security.

-- ==================== WORKSPACE ====================

-- Enable RLS on Workspace table
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;

-- Users can only see workspaces they own
CREATE POLICY "workspace_select_own" ON "Workspace"
  FOR SELECT
  USING (auth.uid()::text = "ownerId"::text);

-- Users can only insert workspaces as owner
CREATE POLICY "workspace_insert_own" ON "Workspace"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "ownerId"::text);

-- Users can only update their own workspaces
CREATE POLICY "workspace_update_own" ON "Workspace"
  FOR UPDATE
  USING (auth.uid()::text = "ownerId"::text);

-- Users can only delete their own workspaces
CREATE POLICY "workspace_delete_own" ON "Workspace"
  FOR DELETE
  USING (auth.uid()::text = "ownerId"::text);

-- ==================== WORKSPACE MEMBER ====================

ALTER TABLE "WorkspaceMember" ENABLE ROW LEVEL SECURITY;

-- Users can see memberships for workspaces they belong to
CREATE POLICY "member_select" ON "WorkspaceMember"
  FOR SELECT
  USING (
    auth.uid()::text = "userId"::text 
    OR EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== TASK ====================

ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;

-- Users can only see tasks in their workspaces
CREATE POLICY "task_select_workspace" ON "Task"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "Task"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

-- Users can only insert tasks in their workspaces
CREATE POLICY "task_insert_workspace" ON "Task"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "Task"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

-- Users can only update tasks in their workspaces
CREATE POLICY "task_update_workspace" ON "Task"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "Task"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

-- Users can only delete tasks in their workspaces
CREATE POLICY "task_delete_workspace" ON "Task"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "Task"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

-- ==================== SAVED FILTER ====================

ALTER TABLE "SavedFilter" ENABLE ROW LEVEL SECURITY;

-- Users can only see filters in their workspaces
CREATE POLICY "filter_select_workspace" ON "SavedFilter"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

CREATE POLICY "filter_insert_workspace" ON "SavedFilter"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

CREATE POLICY "filter_update_workspace" ON "SavedFilter"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

CREATE POLICY "filter_delete_workspace" ON "SavedFilter"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== STATUS ====================

ALTER TABLE "Status" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_select_workspace" ON "Status"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== TAG ====================

ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tag_select_workspace" ON "Tag"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

CREATE POLICY "tag_insert_workspace" ON "Tag"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== GOAL ====================

ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_select_workspace" ON "Goal"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

CREATE POLICY "goal_insert_workspace" ON "Goal"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

CREATE POLICY "goal_update_workspace" ON "Goal"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== ACTIVITY LOG ====================

ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_select_workspace" ON "ActivityLog"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

CREATE POLICY "activity_insert_workspace" ON "ActivityLog"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== SERVICE ROLE BYPASS ====================
-- The service role (used by server-side Prisma) bypasses RLS by default.
-- This is correct because server actions already validate workspace access.
-- Only enable these if you want even server actions to be RLS-restricted:
--
-- ALTER TABLE "Task" FORCE ROW LEVEL SECURITY;
-- ALTER TABLE "SavedFilter" FORCE ROW LEVEL SECURITY;
-- etc.

-- ==================== NOTES ====================
-- 
-- Current Status:
-- - Application-level security is enforced in server actions (tasks.ts, filters.ts)
-- - All queries filter by workspaceId
-- - Update/delete operations verify workspace ownership before proceeding
--
-- When to apply these policies:
-- 1. When Supabase Auth is integrated with the app
-- 2. When using Supabase client directly (not just Prisma)
-- 3. For defense-in-depth security
--
-- Testing after applying:
-- 1. Create two users with separate workspaces
-- 2. Try to access each other's data via API - should be blocked
-- 3. Check Supabase logs for any policy violations
