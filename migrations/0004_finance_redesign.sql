-- ============================================================
-- Migration 0004: Financeiro em centavos, categorias, orçamento e recorrência
-- Reaproveita a tabela transactions existente e complementa sem duplicar dados.
-- ============================================================

CREATE TABLE IF NOT EXISTS financial_categories (
  id                  TEXT NOT NULL PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon                TEXT NOT NULL DEFAULT 'wallet',
  color               TEXT NOT NULL DEFAULT '#a78bfa',
  monthly_limit_cents INTEGER,
  archived_at         INTEGER,
  created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at          INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, name, type)
);

CREATE INDEX IF NOT EXISTS financial_categories_user_type_idx ON financial_categories (user_id, type, archived_at);

CREATE TABLE IF NOT EXISTS financial_recurrences (
  id               TEXT NOT NULL PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  category_id      TEXT REFERENCES financial_categories(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer')),
  amount_cents     INTEGER NOT NULL CHECK (amount_cents > 0),
  frequency        TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'annual')),
  due_day          INTEGER,
  start_date       TEXT NOT NULL,
  end_date         TEXT,
  repeat_count     INTEGER,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at       INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS financial_recurrences_user_status_idx ON financial_recurrences (user_id, status);

CREATE TABLE IF NOT EXISTS monthly_budgets (
  id                      TEXT NOT NULL PRIMARY KEY,
  user_id                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  month                   TEXT NOT NULL,
  expected_income_cents   INTEGER NOT NULL DEFAULT 0,
  fixed_expenses_cents    INTEGER NOT NULL DEFAULT 0,
  reserve_goal_cents      INTEGER NOT NULL DEFAULT 0,
  created_at              INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at              INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, month)
);

CREATE TABLE IF NOT EXISTS monthly_category_budgets (
  id           TEXT NOT NULL PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  month        TEXT NOT NULL,
  category_id  TEXT NOT NULL REFERENCES financial_categories(id) ON DELETE CASCADE,
  limit_cents  INTEGER NOT NULL CHECK (limit_cents >= 0),
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, month, category_id)
);

CREATE INDEX IF NOT EXISTS monthly_category_budgets_user_month_idx ON monthly_category_budgets (user_id, month);

ALTER TABLE transactions ADD COLUMN daily_entry_id TEXT REFERENCES daily_entries(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN category_id TEXT REFERENCES financial_categories(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN transaction_type TEXT NOT NULL DEFAULT 'expense' CHECK (transaction_type IN ('income', 'expense', 'transfer'));
ALTER TABLE transactions ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN description TEXT;
ALTER TABLE transactions ADD COLUMN transaction_date TEXT;
ALTER TABLE transactions ADD COLUMN due_date TEXT;
ALTER TABLE transactions ADD COLUMN paid_at INTEGER;
ALTER TABLE transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'overdue', 'cancelled'));
ALTER TABLE transactions ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'daily', 'recurring', 'imported'));
ALTER TABLE transactions ADD COLUMN recurrence_id TEXT REFERENCES financial_recurrences(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN payment_method TEXT;
ALTER TABLE transactions ADD COLUMN account_name TEXT;
ALTER TABLE transactions ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch());
ALTER TABLE transactions ADD COLUMN deleted_at INTEGER;
ALTER TABLE transactions ADD COLUMN dedupe_key TEXT;

UPDATE transactions
SET
  amount_cents = CASE WHEN amount_cents = 0 THEN CAST(ROUND(amount * 100) AS INTEGER) ELSE amount_cents END,
  transaction_type = CASE WHEN type IN ('income', 'expense') THEN type ELSE transaction_type END,
  transaction_date = COALESCE(transaction_date, date),
  description = COALESCE(description, title),
  status = COALESCE(status, 'paid')
WHERE amount IS NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_user_transaction_date_idx ON transactions (user_id, transaction_date DESC, deleted_at);
CREATE INDEX IF NOT EXISTS transactions_user_category_date_idx ON transactions (user_id, category_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS transactions_user_status_due_idx ON transactions (user_id, status, due_date);
CREATE INDEX IF NOT EXISTS transactions_user_source_idx ON transactions (user_id, source);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_dedupe_idx ON transactions (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
