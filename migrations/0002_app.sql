-- ============================================================
-- Migration 0002: Tabelas do CreatorZ
-- Toda tabela com dados pessoais tem user_id
-- Autorização por user_id é feita na camada de backend (Route Handlers)
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PROFILES (extensão do user do Better Auth)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT NOT NULL PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  timezone    TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ──────────────────────────────────────────────────────────
-- TASKS (tarefas)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT NOT NULL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date    TEXT,
  tags        TEXT NOT NULL DEFAULT '[]',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS tasks_user_status_idx ON tasks (user_id, status);
CREATE INDEX IF NOT EXISTS tasks_user_created_idx ON tasks (user_id, created_at DESC);

-- ──────────────────────────────────────────────────────────
-- HABITS (hábitos)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id          TEXT NOT NULL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  frequency   TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  color       TEXT NOT NULL DEFAULT '#7c3aed',
  icon        TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS habits_user_idx ON habits (user_id);

-- ──────────────────────────────────────────────────────────
-- HABIT_LOGS (registros diários de hábitos)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habit_logs (
  id          TEXT NOT NULL PRIMARY KEY,
  habit_id    TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (habit_id, date)
);

CREATE INDEX IF NOT EXISTS habit_logs_user_date_idx ON habit_logs (user_id, date);

-- ──────────────────────────────────────────────────────────
-- CHECK_INS (dados emocionais — sensíveis)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS check_ins (
  id          TEXT NOT NULL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  mood        INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
  energy      INTEGER NOT NULL CHECK (energy BETWEEN 1 AND 5),
  note        TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS check_ins_user_date_idx ON check_ins (user_id, date DESC);

-- ──────────────────────────────────────────────────────────
-- DIARY_ENTRIES (dados do diário — sensíveis)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diary_entries (
  id          TEXT NOT NULL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  content     TEXT NOT NULL,
  mood        INTEGER CHECK (mood BETWEEN 1 AND 5),
  tags        TEXT NOT NULL DEFAULT '[]',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS diary_user_date_idx ON diary_entries (user_id, date DESC);

-- ──────────────────────────────────────────────────────────
-- GOALS (metas)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id          TEXT NOT NULL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL CHECK (category IN ('pessoal', 'profissional', 'saude', 'financeiro', 'estudo')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  progress    REAL NOT NULL DEFAULT 0,
  target      REAL NOT NULL,
  unit        TEXT,
  deadline    TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS goals_user_status_idx ON goals (user_id, status);

-- ──────────────────────────────────────────────────────────
-- TRANSACTIONS (dados financeiros — sensíveis)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT NOT NULL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  amount      REAL NOT NULL CHECK (amount > 0),
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category    TEXT NOT NULL,
  date        TEXT NOT NULL DEFAULT (date('now')),
  notes       TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions (user_id, date DESC);

-- ──────────────────────────────────────────────────────────
-- CALENDAR_EVENTS (agenda)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id          TEXT NOT NULL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  start_date  TEXT NOT NULL,
  end_date    TEXT,
  all_day     INTEGER NOT NULL DEFAULT 0,
  color       TEXT DEFAULT '#7c3aed',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS events_user_start_idx ON calendar_events (user_id, start_date);

-- ──────────────────────────────────────────────────────────
-- DAILY_ENTRIES (rotina diária)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_entries (
  id                  TEXT NOT NULL PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  date                TEXT NOT NULL,
  morning_checks      TEXT NOT NULL DEFAULT '[]',
  evening_checks      TEXT NOT NULL DEFAULT '[]',
  intention           TEXT,
  gratitude           TEXT,
  created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at          INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS daily_user_date_idx ON daily_entries (user_id, date DESC);
