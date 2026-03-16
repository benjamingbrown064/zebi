-- ============================================================
-- COMPLETE RLS POLICIES FOR ZEBI
-- Applied: [DATE_TO_BE_FILLED]
-- ============================================================
-- This file includes RLS policies for ALL tables in the schema
-- Missing tables from original: Mission, Company, Objective, 
-- Document, AIMemory, AIInsight, File, RepeatingTask, AIWorkQueue
-- ============================================================

-- ==================== WORKSPACE ====================

ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_select_own" ON "Workspace";
CREATE POLICY "workspace_select_own" ON "Workspace"
  FOR SELECT
  USING (auth.uid()::text = "ownerId"::text);

DROP POLICY IF EXISTS "workspace_insert_own" ON "Workspace";
CREATE POLICY "workspace_insert_own" ON "Workspace"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "ownerId"::text);

DROP POLICY IF EXISTS "workspace_update_own" ON "Workspace";
CREATE POLICY "workspace_update_own" ON "Workspace"
  FOR UPDATE
  USING (auth.uid()::text = "ownerId"::text);

DROP POLICY IF EXISTS "workspace_delete_own" ON "Workspace";
CREATE POLICY "workspace_delete_own" ON "Workspace"
  FOR DELETE
  USING (auth.uid()::text = "ownerId"::text);

-- ==================== WORKSPACE MEMBER ====================

ALTER TABLE "WorkspaceMember" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_select" ON "WorkspaceMember";
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

DROP POLICY IF EXISTS "member_insert" ON "WorkspaceMember";
CREATE POLICY "member_insert" ON "WorkspaceMember"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "member_delete" ON "WorkspaceMember";
CREATE POLICY "member_delete" ON "WorkspaceMember"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== MISSION (NEW) ====================

ALTER TABLE "Mission" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mission_select_workspace" ON "Mission";
CREATE POLICY "mission_select_workspace" ON "Mission"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "Mission"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "mission_insert_workspace" ON "Mission";
CREATE POLICY "mission_insert_workspace" ON "Mission"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "mission_update_workspace" ON "Mission";
CREATE POLICY "mission_update_workspace" ON "Mission"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "mission_delete_workspace" ON "Mission";
CREATE POLICY "mission_delete_workspace" ON "Mission"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== COMPANY (NEW) ====================

ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_select_workspace" ON "Company";
CREATE POLICY "company_select_workspace" ON "Company"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "Company"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "company_insert_workspace" ON "Company";
CREATE POLICY "company_insert_workspace" ON "Company"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "company_update_workspace" ON "Company";
CREATE POLICY "company_update_workspace" ON "Company"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "company_delete_workspace" ON "Company";
CREATE POLICY "company_delete_workspace" ON "Company"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== OBJECTIVE (NEW) ====================

ALTER TABLE "Objective" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "objective_select_workspace" ON "Objective";
CREATE POLICY "objective_select_workspace" ON "Objective"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "Objective"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "objective_insert_workspace" ON "Objective";
CREATE POLICY "objective_insert_workspace" ON "Objective"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "objective_update_workspace" ON "Objective";
CREATE POLICY "objective_update_workspace" ON "Objective"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "objective_delete_workspace" ON "Objective";
CREATE POLICY "objective_delete_workspace" ON "Objective"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== OBJECTIVE MILESTONE (NEW) ====================

ALTER TABLE "ObjectiveMilestone" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "milestone_select_workspace" ON "ObjectiveMilestone";
CREATE POLICY "milestone_select_workspace" ON "ObjectiveMilestone"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Objective" o
      JOIN "Workspace" w ON w.id = o."workspaceId"
      WHERE o.id = "ObjectiveMilestone"."objectiveId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "milestone_insert_workspace" ON "ObjectiveMilestone";
CREATE POLICY "milestone_insert_workspace" ON "ObjectiveMilestone"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Objective" o
      JOIN "Workspace" w ON w.id = o."workspaceId"
      WHERE o.id = "ObjectiveMilestone"."objectiveId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "milestone_update_workspace" ON "ObjectiveMilestone";
CREATE POLICY "milestone_update_workspace" ON "ObjectiveMilestone"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Objective" o
      JOIN "Workspace" w ON w.id = o."workspaceId"
      WHERE o.id = "ObjectiveMilestone"."objectiveId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "milestone_delete_workspace" ON "ObjectiveMilestone";
CREATE POLICY "milestone_delete_workspace" ON "ObjectiveMilestone"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Objective" o
      JOIN "Workspace" w ON w.id = o."workspaceId"
      WHERE o.id = "ObjectiveMilestone"."objectiveId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== OBJECTIVE PROGRESS (NEW) ====================

ALTER TABLE "ObjectiveProgress" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_select_workspace" ON "ObjectiveProgress";
CREATE POLICY "progress_select_workspace" ON "ObjectiveProgress"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Objective" o
      JOIN "Workspace" w ON w.id = o."workspaceId"
      WHERE o.id = "ObjectiveProgress"."objectiveId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "progress_insert_workspace" ON "ObjectiveProgress";
CREATE POLICY "progress_insert_workspace" ON "ObjectiveProgress"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Objective" o
      JOIN "Workspace" w ON w.id = o."workspaceId"
      WHERE o.id = "ObjectiveProgress"."objectiveId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== OBJECTIVE BLOCKER (NEW) ====================

ALTER TABLE "ObjectiveBlocker" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocker_select_workspace" ON "ObjectiveBlocker";
CREATE POLICY "blocker_select_workspace" ON "ObjectiveBlocker"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Objective" o
      JOIN "Workspace" w ON w.id = o."workspaceId"
      WHERE o.id = "ObjectiveBlocker"."objectiveId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "blocker_insert_workspace" ON "ObjectiveBlocker";
CREATE POLICY "blocker_insert_workspace" ON "ObjectiveBlocker"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Objective" o
      JOIN "Workspace" w ON w.id = o."workspaceId"
      WHERE o.id = "ObjectiveBlocker"."objectiveId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "blocker_update_workspace" ON "ObjectiveBlocker";
CREATE POLICY "blocker_update_workspace" ON "ObjectiveBlocker"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Objective" o
      JOIN "Workspace" w ON w.id = o."workspaceId"
      WHERE o.id = "ObjectiveBlocker"."objectiveId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== STATUS ====================

ALTER TABLE "Status" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "status_select_workspace" ON "Status";
CREATE POLICY "status_select_workspace" ON "Status"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "Status"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "status_insert_workspace" ON "Status";
CREATE POLICY "status_insert_workspace" ON "Status"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "status_update_workspace" ON "Status";
CREATE POLICY "status_update_workspace" ON "Status"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== TASK ====================

ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_select_workspace" ON "Task";
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

DROP POLICY IF EXISTS "task_insert_workspace" ON "Task";
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

DROP POLICY IF EXISTS "task_update_workspace" ON "Task";
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

DROP POLICY IF EXISTS "task_delete_workspace" ON "Task";
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

-- ==================== TAG ====================

ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tag_select_workspace" ON "Tag";
CREATE POLICY "tag_select_workspace" ON "Tag"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "Tag"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "tag_insert_workspace" ON "Tag";
CREATE POLICY "tag_insert_workspace" ON "Tag"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "tag_update_workspace" ON "Tag";
CREATE POLICY "tag_update_workspace" ON "Tag"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== TASK TAG ====================

ALTER TABLE "TaskTag" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasktag_select_workspace" ON "TaskTag";
CREATE POLICY "tasktag_select_workspace" ON "TaskTag"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Task" t
      JOIN "Workspace" w ON w.id = t."workspaceId"
      WHERE t.id = "TaskTag"."taskId"
      AND (
        w."ownerId"::text = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM "WorkspaceMember" wm 
          WHERE wm."workspaceId" = w.id 
          AND wm."userId"::text = auth.uid()::text
        )
      )
    )
  );

DROP POLICY IF EXISTS "tasktag_insert_workspace" ON "TaskTag";
CREATE POLICY "tasktag_insert_workspace" ON "TaskTag"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Task" t
      JOIN "Workspace" w ON w.id = t."workspaceId"
      WHERE t.id = "TaskTag"."taskId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "tasktag_delete_workspace" ON "TaskTag";
CREATE POLICY "tasktag_delete_workspace" ON "TaskTag"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Task" t
      JOIN "Workspace" w ON w.id = t."workspaceId"
      WHERE t.id = "TaskTag"."taskId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== PROJECT ====================

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_select_workspace" ON "Project";
CREATE POLICY "project_select_workspace" ON "Project"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "Project"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "project_insert_workspace" ON "Project";
CREATE POLICY "project_insert_workspace" ON "Project"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "project_update_workspace" ON "Project";
CREATE POLICY "project_update_workspace" ON "Project"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "project_delete_workspace" ON "Project";
CREATE POLICY "project_delete_workspace" ON "Project"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== GOAL ====================

ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goal_select_workspace" ON "Goal";
CREATE POLICY "goal_select_workspace" ON "Goal"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "Goal"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "goal_insert_workspace" ON "Goal";
CREATE POLICY "goal_insert_workspace" ON "Goal"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "goal_update_workspace" ON "Goal";
CREATE POLICY "goal_update_workspace" ON "Goal"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "goal_delete_workspace" ON "Goal";
CREATE POLICY "goal_delete_workspace" ON "Goal"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== GOAL PROGRESS ENTRY (NEW) ====================

ALTER TABLE "GoalProgressEntry" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goalentry_select_workspace" ON "GoalProgressEntry";
CREATE POLICY "goalentry_select_workspace" ON "GoalProgressEntry"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Goal" g
      JOIN "Workspace" w ON w.id = g."workspaceId"
      WHERE g.id = "GoalProgressEntry"."goalId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "goalentry_insert_workspace" ON "GoalProgressEntry";
CREATE POLICY "goalentry_insert_workspace" ON "GoalProgressEntry"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Goal" g
      JOIN "Workspace" w ON w.id = g."workspaceId"
      WHERE g.id = "GoalProgressEntry"."goalId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== DOCUMENT (NEW) ====================

ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_select_workspace" ON "Document";
CREATE POLICY "document_select_workspace" ON "Document"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "Document"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "document_insert_workspace" ON "Document";
CREATE POLICY "document_insert_workspace" ON "Document"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "document_update_workspace" ON "Document";
CREATE POLICY "document_update_workspace" ON "Document"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "document_delete_workspace" ON "Document";
CREATE POLICY "document_delete_workspace" ON "Document"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== DOCUMENT VERSION (NEW) ====================

ALTER TABLE "DocumentVersion" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "docversion_select_workspace" ON "DocumentVersion";
CREATE POLICY "docversion_select_workspace" ON "DocumentVersion"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Document" d
      JOIN "Workspace" w ON w.id = d."workspaceId"
      WHERE d.id = "DocumentVersion"."documentId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "docversion_insert_workspace" ON "DocumentVersion";
CREATE POLICY "docversion_insert_workspace" ON "DocumentVersion"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Document" d
      JOIN "Workspace" w ON w.id = d."workspaceId"
      WHERE d.id = "DocumentVersion"."documentId"
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== AI MEMORY (NEW) ====================

ALTER TABLE "AIMemory" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aimemory_select_workspace" ON "AIMemory";
CREATE POLICY "aimemory_select_workspace" ON "AIMemory"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "aimemory_insert_workspace" ON "AIMemory";
CREATE POLICY "aimemory_insert_workspace" ON "AIMemory"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "aimemory_update_workspace" ON "AIMemory";
CREATE POLICY "aimemory_update_workspace" ON "AIMemory"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== AI INSIGHT (NEW) ====================

ALTER TABLE "AIInsight" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aiinsight_select_workspace" ON "AIInsight";
CREATE POLICY "aiinsight_select_workspace" ON "AIInsight"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "aiinsight_insert_workspace" ON "AIInsight";
CREATE POLICY "aiinsight_insert_workspace" ON "AIInsight"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "aiinsight_update_workspace" ON "AIInsight";
CREATE POLICY "aiinsight_update_workspace" ON "AIInsight"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== FILE (NEW) ====================

ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "file_select_workspace" ON "File";
CREATE POLICY "file_select_workspace" ON "File"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "File"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "file_insert_workspace" ON "File";
CREATE POLICY "file_insert_workspace" ON "File"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "file_delete_workspace" ON "File";
CREATE POLICY "file_delete_workspace" ON "File"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== REPEATING TASK (NEW) ====================

ALTER TABLE "RepeatingTask" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repeating_select_workspace" ON "RepeatingTask";
CREATE POLICY "repeating_select_workspace" ON "RepeatingTask"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "repeating_insert_workspace" ON "RepeatingTask";
CREATE POLICY "repeating_insert_workspace" ON "RepeatingTask"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "repeating_update_workspace" ON "RepeatingTask";
CREATE POLICY "repeating_update_workspace" ON "RepeatingTask"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "repeating_delete_workspace" ON "RepeatingTask";
CREATE POLICY "repeating_delete_workspace" ON "RepeatingTask"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== AI WORK QUEUE (NEW) ====================

ALTER TABLE "AIWorkQueue" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aiqueue_select_workspace" ON "AIWorkQueue";
CREATE POLICY "aiqueue_select_workspace" ON "AIWorkQueue"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "aiqueue_insert_workspace" ON "AIWorkQueue";
CREATE POLICY "aiqueue_insert_workspace" ON "AIWorkQueue"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "aiqueue_update_workspace" ON "AIWorkQueue";
CREATE POLICY "aiqueue_update_workspace" ON "AIWorkQueue"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== TASK COMMENT ====================

ALTER TABLE "TaskComment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_select_workspace" ON "TaskComment";
CREATE POLICY "comment_select_workspace" ON "TaskComment"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "TaskComment"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "comment_insert_workspace" ON "TaskComment";
CREATE POLICY "comment_insert_workspace" ON "TaskComment"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "TaskComment"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "comment_update_workspace" ON "TaskComment";
CREATE POLICY "comment_update_workspace" ON "TaskComment"
  FOR UPDATE
  USING (auth.uid()::text = "createdBy"::text);

DROP POLICY IF EXISTS "comment_delete_workspace" ON "TaskComment";
CREATE POLICY "comment_delete_workspace" ON "TaskComment"
  FOR DELETE
  USING (auth.uid()::text = "createdBy"::text);

-- ==================== TASK ATTACHMENT ====================

ALTER TABLE "TaskAttachment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attachment_select_workspace" ON "TaskAttachment";
CREATE POLICY "attachment_select_workspace" ON "TaskAttachment"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm 
      WHERE wm."workspaceId" = "TaskAttachment"."workspaceId" 
      AND wm."userId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "attachment_insert_workspace" ON "TaskAttachment";
CREATE POLICY "attachment_insert_workspace" ON "TaskAttachment"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "attachment_delete_workspace" ON "TaskAttachment";
CREATE POLICY "attachment_delete_workspace" ON "TaskAttachment"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== SHARE LINK ====================

ALTER TABLE "ShareLink" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_select_workspace" ON "ShareLink";
CREATE POLICY "share_select_workspace" ON "ShareLink"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "share_insert_workspace" ON "ShareLink";
CREATE POLICY "share_insert_workspace" ON "ShareLink"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "share_update_workspace" ON "ShareLink";
CREATE POLICY "share_update_workspace" ON "ShareLink"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== SAVED FILTER ====================

ALTER TABLE "SavedFilter" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "filter_select_workspace" ON "SavedFilter";
CREATE POLICY "filter_select_workspace" ON "SavedFilter"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "filter_insert_workspace" ON "SavedFilter";
CREATE POLICY "filter_insert_workspace" ON "SavedFilter"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "filter_update_workspace" ON "SavedFilter";
CREATE POLICY "filter_update_workspace" ON "SavedFilter"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "filter_delete_workspace" ON "SavedFilter";
CREATE POLICY "filter_delete_workspace" ON "SavedFilter"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ==================== ACTIVITY LOG ====================

ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_select_workspace" ON "ActivityLog";
CREATE POLICY "activity_select_workspace" ON "ActivityLog"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "activity_insert_workspace" ON "ActivityLog";
CREATE POLICY "activity_insert_workspace" ON "ActivityLog"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w 
      WHERE w.id = "workspaceId" 
      AND w."ownerId"::text = auth.uid()::text
    )
  );

-- ============================================================
-- VERIFICATION QUERY
-- Run this after applying to verify all tables have RLS enabled:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;
-- ============================================================
