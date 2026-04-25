-- Migration: add_vault_upsert
-- Date: 2026-04-25
-- Purpose: Add vault_upsert_secret() — creates or updates a Vault secret by name.
--          vault_store_secret() always calls vault.create_secret() which fails on
--          duplicate names. This function handles rotation correctly.

CREATE OR REPLACE FUNCTION public.vault_upsert_secret(
    p_name        TEXT,
    p_secret      TEXT,
    p_description TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_existing_id UUID;
    v_new_id      UUID;
BEGIN
    IF p_secret IS NULL OR trim(p_secret) = '' THEN
        RAISE EXCEPTION 'vault_upsert_secret: p_secret must not be empty';
    END IF;

    -- Look for an existing secret with this name
    SELECT id INTO v_existing_id
      FROM vault.secrets
     WHERE name = p_name
     LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Rotate: update the existing secret in-place
        PERFORM vault.update_secret(
            v_existing_id,
            p_secret,
            p_name,
            COALESCE(p_description, p_name)
        );
        RETURN v_existing_id;
    ELSE
        -- Create new
        SELECT vault.create_secret(p_secret, p_name, COALESCE(p_description, p_name))
          INTO v_new_id;
        RETURN v_new_id;
    END IF;
END;
$$;

-- Lock down permissions — service_role only
REVOKE ALL ON FUNCTION public.vault_upsert_secret(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vault_upsert_secret(TEXT, TEXT, TEXT) TO service_role;
