-- AI Assistant RLS Policies (Week 1 Day 1-2)
-- These policies ensure users can only access AI data from their own workspaces

-- AI Conversations RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
ON ai_conversations FOR SELECT
USING (workspace_id IN (
  SELECT id FROM "Workspace" WHERE id = workspace_id
));

CREATE POLICY "Users can create own conversations"
ON ai_conversations FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT id FROM "Workspace" WHERE id = workspace_id
));

CREATE POLICY "Users can update own conversations"
ON ai_conversations FOR UPDATE
USING (workspace_id IN (
  SELECT id FROM "Workspace" WHERE id = workspace_id
));

-- AI Messages RLS
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from own conversations"
ON ai_messages FOR SELECT
USING (conversation_id IN (
  SELECT id FROM ai_conversations WHERE workspace_id IN (
    SELECT id FROM "Workspace" WHERE id = workspace_id
  )
));

CREATE POLICY "Users can create messages in own conversations"
ON ai_messages FOR INSERT
WITH CHECK (conversation_id IN (
  SELECT id FROM ai_conversations WHERE workspace_id IN (
    SELECT id FROM "Workspace" WHERE id = workspace_id
  )
));

-- AI Suggestions RLS
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suggestions"
ON ai_suggestions FOR SELECT
USING (workspace_id IN (
  SELECT id FROM "Workspace" WHERE id = workspace_id
));

CREATE POLICY "Users can create own suggestions"
ON ai_suggestions FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT id FROM "Workspace" WHERE id = workspace_id
));

CREATE POLICY "Users can update own suggestions"
ON ai_suggestions FOR UPDATE
USING (workspace_id IN (
  SELECT id FROM "Workspace" WHERE id = workspace_id
));

-- AI Memory RLS
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory"
ON ai_memory FOR SELECT
USING (workspace_id IN (
  SELECT id FROM "Workspace" WHERE id = workspace_id
));

CREATE POLICY "Users can manage own memory"
ON ai_memory FOR ALL
USING (workspace_id IN (
  SELECT id FROM "Workspace" WHERE id = workspace_id
));
