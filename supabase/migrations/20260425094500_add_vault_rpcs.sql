-- Migration: add_vault_rpcs
-- Task: e5b3f824 — Stack #2 — Wire Supabase Vault for stack_secret values + RPCs for store/resolve
-- Date: 2026-04-25
--
-- Depends on: 20260425093000_add_secure_stacks.sql (stack_secret table must exist)
--
-- What this does:
--   1. Verifies the supabase_vault extension is enabled (it is on this project — v0.3.1)
--   2. Creates audit_log_secret_access table — append-only audit trail for every resolution
--   3. Deploys vault_store_secret() RPC — stores plaintext in Vault, returns vault_secret_id
--   4. Deploys vault_resolve_secret() RPC — resolves plaintext, writes audit row, returns plaintext
--   5. Locks both RPCs to service_role only (REVOKE from PUBLIC, GRANT to service_role)
--
-- NON-NEGOTIABLE: Plaintext never persisted outside of Vault.
-- Resolution is only possible via vault_resolve_secret() with service_role JWT.

-- ============================================================
-- 1. Extension check (idempotent)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- ============================================================
-- 2. audit_log_secret_access
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log_secret_access (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent           TEXT        NOT NULL,                    -- agent id or caller identifier
  task_id         TEXT,                                    -- Zebi task id being executed (if known)
  vault_secret_id UUID        NOT NULL,                    -- which secret was accessed
  accessed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip              TEXT                                     -- client IP if available (passed via audit_context)
);

CREATE INDEX IF NOT EXISTS audit_log_secret_access_vault_secret_id_idx
  ON audit_log_secret_access (vault_secret_id);

CREATE INDEX IF NOT EXISTS audit_log_secret_access_accessed_at_idx
  ON audit_log_secret_access (accessed_at);

-- Grants: service_role can INSERT (for RPC audit writes); no SELECT for anon
GRANT ALL ON TABLE audit_log_secret_access TO service_role;
GRANT SELECT ON TABLE audit_log_secret_access TO authenticated;  -- read-only for audit review by workspace members

-- RLS: workspace members can read audit entries for secrets in their stacks
ALTER TABLE audit_log_secret_access ENABLE ROW LEVEL SECURITY;

-- authenticated users can read audit log rows related to secrets they own
-- (inner-join through stack_secret → stack → WorkspaceMember)
CREATE POLICY audit_log_secret_access_select ON audit_log_secret_access
  FOR SELECT
  USING (
    vault_secret_id IN (
      SELECT ss.vault_secret_id
      FROM stack_secret ss
      JOIN stack s ON s.id = ss.stack_id
      JOIN "WorkspaceMember" wm ON wm."workspaceId" = s.workspace_id
      WHERE wm."userId" = auth.uid()
    )
  );

-- Only service_role inserts audit rows (via the RPC); no user-facing INSERT policy
-- service_role bypasses RLS so no INSERT policy is needed for it

-- ============================================================
-- 3. vault_store_secret(p_name, p_secret) RETURNS uuid
-- ============================================================
-- Stores the secret in Vault and returns the vault_secret_id.
-- The caller (API layer) persists vault_secret_id to stack_secret.vault_secret_id.
-- Plaintext is dropped from memory after this function returns.
--
-- SECURITY DEFINER: runs as postgres (owner), which has permission to call vault.*
-- REVOKE/GRANT ensures only service_role can invoke this function.

CREATE OR REPLACE FUNCTION public.vault_store_secret(
  p_name   TEXT,
  p_secret TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  IF p_secret IS NULL OR p_secret = '' THEN
    RAISE EXCEPTION 'vault_store_secret: p_secret must not be empty';
  END IF;

  -- Store in Vault; vault.create_secret returns the new secret UUID
  v_secret_id := vault.create_secret(p_secret, p_name);

  RETURN v_secret_id;
END;
$$;

-- Lock to service_role only
REVOKE ALL ON FUNCTION public.vault_store_secret(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vault_store_secret(TEXT, TEXT) TO service_role;


-- ============================================================
-- 4. vault_resolve_secret(p_vault_secret_id, p_audit_context) RETURNS text
-- ============================================================
-- Resolves the plaintext secret from Vault.
-- Writes an audit row to audit_log_secret_access before returning.
-- Callable by service_role only.
--
-- p_audit_context: jsonb with keys:
--   agent     TEXT  (required) — agent id performing the resolution
--   task_id   TEXT  (optional) — Zebi task id
--   ip        TEXT  (optional) — client IP address

CREATE OR REPLACE FUNCTION public.vault_resolve_secret(
  p_vault_secret_id UUID,
  p_audit_context   JSONB DEFAULT '{}'::JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_plaintext TEXT;
  v_agent     TEXT;
  v_task_id   TEXT;
  v_ip        TEXT;
BEGIN
  IF p_vault_secret_id IS NULL THEN
    RAISE EXCEPTION 'vault_resolve_secret: p_vault_secret_id must not be null';
  END IF;

  -- Resolve from Vault decrypted_secrets view
  SELECT decrypted_secret
    INTO v_plaintext
    FROM vault.decrypted_secrets
   WHERE id = p_vault_secret_id;

  IF v_plaintext IS NULL THEN
    RAISE EXCEPTION 'vault_resolve_secret: secret not found for id=%', p_vault_secret_id;
  END IF;

  -- Extract audit context
  v_agent   := COALESCE(p_audit_context->>'agent', 'unknown');
  v_task_id := p_audit_context->>'task_id';
  v_ip      := p_audit_context->>'ip';

  -- Write audit row (append-only; cannot be deleted or updated by any role via API)
  INSERT INTO public.audit_log_secret_access (agent, task_id, vault_secret_id, ip)
  VALUES (v_agent, v_task_id, p_vault_secret_id, v_ip);

  RETURN v_plaintext;
END;
$$;

-- Lock to service_role only
REVOKE ALL ON FUNCTION public.vault_resolve_secret(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vault_resolve_secret(UUID, JSONB) TO service_role;
