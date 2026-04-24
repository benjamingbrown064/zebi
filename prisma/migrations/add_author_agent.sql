-- Migration: add authorAgent + authorType fields to narrative/audit write models
-- Task: fd6275ad — Add authorAgent and authorType to TaskComment, Note, AIMemory, ProgressEntry
-- Date: 2026-04-24
--
-- NOTE: This migration was applied automatically via `prisma db push` during Vercel deploy.
-- The SQL is documented here for audit purposes.
-- Columns already exist in production; this file is idempotent (uses IF NOT EXISTS / DO NOTHING).

-- ── TaskComment ───────────────────────────────────────────────────────────────
ALTER TABLE "TaskComment"
  ADD COLUMN IF NOT EXISTS "authorAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "authorType"  TEXT NOT NULL DEFAULT 'user';

-- ── Note ─────────────────────────────────────────────────────────────────────
ALTER TABLE "Note"
  ADD COLUMN IF NOT EXISTS "authorAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "authorType"  TEXT NOT NULL DEFAULT 'user';

-- ── AIMemory ─────────────────────────────────────────────────────────────────
-- authorAgent was already present; authorType may be new
ALTER TABLE "AIMemory"
  ADD COLUMN IF NOT EXISTS "authorAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "authorType"  TEXT NOT NULL DEFAULT 'user';

-- ── GoalProgressEntry ────────────────────────────────────────────────────────
ALTER TABLE "GoalProgressEntry"
  ADD COLUMN IF NOT EXISTS "authorAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "authorType"  TEXT NOT NULL DEFAULT 'user';

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "TaskComment_authorAgent_idx" ON "TaskComment" ("authorAgent");
CREATE INDEX IF NOT EXISTS "Note_authorAgent_idx"        ON "Note"        ("authorAgent");
CREATE INDEX IF NOT EXISTS "AIMemory_authorAgent_idx"    ON "AIMemory"    ("authorAgent");

-- ── Backfill: known bot user IDs → authorAgent/authorType ─────────────────────
-- Bot user IDs in the One Beyond workspace:
--   doug:   bdd884e9-03bd-44f2-909c-68ab0ab1bfc4
--   harvey: (set at bot setup)
--   theo:   (set at bot setup)
--   casper: (set at bot setup)
--
-- Rows created by Doug's user UUID → set authorAgent='doug', authorType='agent'
UPDATE "TaskComment"
   SET "authorAgent" = 'doug', "authorType" = 'agent'
 WHERE "createdBy" = 'bdd884e9-03bd-44f2-909c-68ab0ab1bfc4'
   AND "authorAgent" IS NULL;

UPDATE "Note"
   SET "authorAgent" = 'doug', "authorType" = 'agent'
 WHERE "createdBy" = 'bdd884e9-03bd-44f2-909c-68ab0ab1bfc4'
   AND "authorAgent" IS NULL;

UPDATE "AIMemory"
   SET "authorAgent" = 'doug', "authorType" = 'agent'
 WHERE "createdBy" = 'bdd884e9-03bd-44f2-909c-68ab0ab1bfc4'
   AND "authorAgent" IS NULL;

-- Rows where authorType is still NULL → set to 'user' (defensive; DEFAULT should cover this)
UPDATE "TaskComment"   SET "authorType" = 'user' WHERE "authorType" IS NULL;
UPDATE "Note"          SET "authorType" = 'user' WHERE "authorType" IS NULL;
UPDATE "AIMemory"      SET "authorType" = 'user' WHERE "authorType" IS NULL;
UPDATE "GoalProgressEntry" SET "authorType" = 'user' WHERE "authorType" IS NULL;
