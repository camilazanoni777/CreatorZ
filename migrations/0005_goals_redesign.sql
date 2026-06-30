-- ============================================================
-- Migration 0005: Goals redesign — campos estendidos e etapas
-- Seguro para aplicar em banco com dados existentes.
-- ============================================================

-- Campo JSON para armazenar: category real, emoji, priority,
-- goal_type, motivation, steps[] e completed_at (ISO string).
ALTER TABLE goals ADD COLUMN metadata TEXT;

-- Timestamp de conclusão para filtros por período.
ALTER TABLE goals ADD COLUMN completed_at INTEGER;

-- ──────────────────────────────────────────────────────────
-- GOAL_STEPS (etapas de uma meta)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goal_steps (
  id           TEXT NOT NULL PRIMARY KEY,
  goal_id      TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  completed    INTEGER NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS goal_steps_goal_idx ON goal_steps (goal_id);
CREATE INDEX IF NOT EXISTS goal_steps_user_idx ON goal_steps (user_id);
