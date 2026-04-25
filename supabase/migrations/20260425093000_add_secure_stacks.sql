-- Migration: add_secure_stacks
-- Task: d725ec0b — Stack #1 — Design and ship the Stack / StackResource / StackSecret schema
-- Date: 2026-04-25
--
-- Adds three tables to Zebi:
--   stack          — root entity linking a set of infrastructure resources to a workspace/space/project
--   stack_resource — non-secret key/value config (project refs, env var names, URLs, identifiers)
--   stack_secret   — encrypted secret references (vault_secret_id points to Supabase Vault; plaintext never stored here)
--
-- RLS summary:
--   stack:          workspace members SELECT/INSERT/UPDATE their own workspace's stacks
--   stack_resource: same, via parent stack membership check
--   stack_secret:   workspace members SELECT (metadata only) and INSERT/UPDATE;
--                   secret *resolution* is service-role only (enforced in Task #2 RPCs)

-- ============================================================
-- TABLE: stack
-- ============================================================

CREATE TABLE IF NOT EXISTS stack (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        TEXT        NOT NULL REFERENCES "Workspace"(id) ON DELETE CASCADE,
  company_id          TEXT        REFERENCES "Company"(id) ON DELETE SET NULL,   -- null = workspace-level stack
  project_id          TEXT        REFERENCES "Project"(id) ON DELETE SET NULL,   -- null = space-level or workspace-level
  name                TEXT        NOT NULL,
  provider            TEXT        NOT NULL CHECK (provider IN ('supabase','vercel','railway','github','other')),
  description         TEXT,
  created_by          TEXT        NOT NULL,   -- agent id or user id
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS stack_workspace_id_idx  ON stack (workspace_id);
CREATE INDEX IF NOT EXISTS stack_company_id_idx    ON stack (company_id);
CREATE INDEX IF NOT EXISTS stack_project_id_idx    ON stack (project_id);
CREATE INDEX IF NOT EXISTS stack_archived_at_idx   ON stack (archived_at);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION stack_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER stack_updated_at
  BEFORE UPDATE ON stack
  FOR EACH ROW EXECUTE FUNCTION stack_set_updated_at();

-- RLS
ALTER TABLE stack ENABLE ROW LEVEL SECURITY;

-- Workspace members can read their own stacks
CREATE POLICY stack_select ON stack
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT "workspaceId" FROM "WorkspaceMember"
      WHERE "userId" = auth.uid()
    )
  );

-- Workspace members can insert into their own workspace
CREATE POLICY stack_insert ON stack
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT "workspaceId" FROM "WorkspaceMember"
      WHERE "userId" = auth.uid()
    )
  );

-- Workspace members can update stacks in their workspace
CREATE POLICY stack_update ON stack
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT "workspaceId" FROM "WorkspaceMember"
      WHERE "userId" = auth.uid()
    )
  );

-- Service role bypasses RLS by default (no explicit policy needed)


-- ============================================================
-- TABLE: stack_resource
-- ============================================================

CREATE TABLE IF NOT EXISTS stack_resource (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id    UUID        NOT NULL REFERENCES stack(id) ON DELETE CASCADE,
  key         TEXT        NOT NULL,    -- e.g. 'project_ref', 'project_id', 'base_url'
  value       TEXT        NOT NULL,
  kind        TEXT        NOT NULL CHECK (kind IN ('url','id','env_name','identifier','other')),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stack_resource_stack_id_idx ON stack_resource (stack_id);
CREATE UNIQUE INDEX IF NOT EXISTS stack_resource_stack_key_idx ON stack_resource (stack_id, key);

CREATE TRIGGER stack_resource_updated_at
  BEFORE UPDATE ON stack_resource
  FOR EACH ROW EXECUTE FUNCTION stack_set_updated_at();

-- RLS
ALTER TABLE stack_resource ENABLE ROW LEVEL SECURITY;

-- Access permitted when parent stack is in user's workspace
CREATE POLICY stack_resource_select ON stack_resource
  FOR SELECT
  USING (
    stack_id IN (
      SELECT s.id FROM stack s
      JOIN "WorkspaceMember" wm ON wm."workspaceId" = s.workspace_id
      WHERE wm."userId" = auth.uid()
    )
  );

CREATE POLICY stack_resource_insert ON stack_resource
  FOR INSERT
  WITH CHECK (
    stack_id IN (
      SELECT s.id FROM stack s
      JOIN "WorkspaceMember" wm ON wm."workspaceId" = s.workspace_id
      WHERE wm."userId" = auth.uid()
    )
  );

CREATE POLICY stack_resource_update ON stack_resource
  FOR UPDATE
  USING (
    stack_id IN (
      SELECT s.id FROM stack s
      JOIN "WorkspaceMember" wm ON wm."workspaceId" = s.workspace_id
      WHERE wm."userId" = auth.uid()
    )
  );


-- ============================================================
-- TABLE: stack_secret
-- ============================================================
-- NOTE: The actual ciphertext lives in Supabase Vault.
-- vault_secret_id is an opaque reference — it is the UUID of the
-- Vault secret entry. No plaintext is ever stored in this table.
-- Secret resolution is only performed by service-role RPCs (Task #2).

CREATE TABLE IF NOT EXISTS stack_secret (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id                UUID        NOT NULL REFERENCES stack(id) ON DELETE CASCADE,
  key                     TEXT        NOT NULL,    -- e.g. 'service_role_key', 'deploy_token'
  vault_secret_id         UUID        NOT NULL,    -- references vault.secrets(id) — ciphertext in Vault
  description             TEXT,
  last_rotated_at         TIMESTAMPTZ,
  rotation_interval_days  INT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stack_secret_stack_id_idx ON stack_secret (stack_id);
CREATE UNIQUE INDEX IF NOT EXISTS stack_secret_stack_key_idx ON stack_secret (stack_id, key);

CREATE TRIGGER stack_secret_updated_at
  BEFORE UPDATE ON stack_secret
  FOR EACH ROW EXECUTE FUNCTION stack_set_updated_at();

-- RLS
ALTER TABLE stack_secret ENABLE ROW LEVEL SECURITY;

-- Workspace members can SELECT metadata (vault_secret_id is opaque — no plaintext exposed)
CREATE POLICY stack_secret_select ON stack_secret
  FOR SELECT
  USING (
    stack_id IN (
      SELECT s.id FROM stack s
      JOIN "WorkspaceMember" wm ON wm."workspaceId" = s.workspace_id
      WHERE wm."userId" = auth.uid()
    )
  );

-- Workspace members can INSERT new secret references
CREATE POLICY stack_secret_insert ON stack_secret
  FOR INSERT
  WITH CHECK (
    stack_id IN (
      SELECT s.id FROM stack s
      JOIN "WorkspaceMember" wm ON wm."workspaceId" = s.workspace_id
      WHERE wm."userId" = auth.uid()
    )
  );

-- Workspace members can UPDATE secret metadata (key, description, rotation fields)
-- vault_secret_id updates are also allowed here; the RPC in Task #2 handles re-encryption
CREATE POLICY stack_secret_update ON stack_secret
  FOR UPDATE
  USING (
    stack_id IN (
      SELECT s.id FROM stack s
      JOIN "WorkspaceMember" wm ON wm."workspaceId" = s.workspace_id
      WHERE wm."userId" = auth.uid()
    )
  );


-- ============================================================
-- GRANTS
-- service_role bypasses RLS by default but still needs schema USAGE + table grants.
-- authenticated users can access their own workspace stacks (RLS enforces this).
-- anon has no access — not granted schema USAGE for these tables.
-- ============================================================

GRANT USAGE ON SCHEMA public TO service_role, authenticated;

GRANT ALL ON TABLE stack TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stack TO authenticated;

GRANT ALL ON TABLE stack_resource TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stack_resource TO authenticated;

GRANT ALL ON TABLE stack_secret TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stack_secret TO authenticated;


-- ============================================================
-- SEED DATA: Zebi production stack
-- ============================================================
-- One example Stack for the Zebi platform itself so Tasks #3-5 have real data to test against.
-- workspace_id = dfd6d384-9e2f-4145-b4f3-254aa82c0237 (One Beyond workspace)

INSERT INTO stack (workspace_id, name, provider, description, created_by)
VALUES (
  'dfd6d384-9e2f-4145-b4f3-254aa82c0237',
  'Zebi production',
  'vercel',
  'Zebi app — Vercel deployment + Supabase backend',
  'doug'
)
ON CONFLICT DO NOTHING;

-- Insert the Vercel project_id resource onto that seed stack
INSERT INTO stack_resource (stack_id, key, value, kind, description)
SELECT
  s.id,
  'project_id',
  'prj_zebi_production',
  'id',
  'Vercel project ID for the Zebi production deployment'
FROM stack s
WHERE s.name = 'Zebi production'
  AND s.workspace_id = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
  AND s.provider = 'vercel'
ON CONFLICT DO NOTHING;
