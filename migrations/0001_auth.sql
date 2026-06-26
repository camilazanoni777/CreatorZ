-- ============================================================
-- Migration 0001: Better Auth tables (SQLite/D1)
-- Aplicar: wrangler d1 migrations apply creatorz --local
-- ============================================================

-- Tabela de usuários (Better Auth)
CREATE TABLE IF NOT EXISTS "user" (
  id                TEXT NOT NULL PRIMARY KEY,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  emailVerified     INTEGER NOT NULL DEFAULT 0,
  image             TEXT,
  createdAt         INTEGER NOT NULL,
  updatedAt         INTEGER NOT NULL
);

-- Tabela de sessões (Better Auth)
CREATE TABLE IF NOT EXISTS "session" (
  id            TEXT NOT NULL PRIMARY KEY,
  expiresAt     INTEGER NOT NULL,
  token         TEXT NOT NULL UNIQUE,
  createdAt     INTEGER NOT NULL,
  updatedAt     INTEGER NOT NULL,
  ipAddress     TEXT,
  userAgent     TEXT,
  userId        TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

-- Tabela de contas OAuth/senha (Better Auth)
CREATE TABLE IF NOT EXISTS "account" (
  id                      TEXT NOT NULL PRIMARY KEY,
  accountId               TEXT NOT NULL,
  providerId              TEXT NOT NULL,
  userId                  TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accessToken             TEXT,
  refreshToken            TEXT,
  idToken                 TEXT,
  accessTokenExpiresAt    INTEGER,
  refreshTokenExpiresAt   INTEGER,
  scope                   TEXT,
  password                TEXT,
  createdAt               INTEGER NOT NULL,
  updatedAt               INTEGER NOT NULL
);

-- Tabela de verificações de e-mail (Better Auth)
CREATE TABLE IF NOT EXISTS "verification" (
  id          TEXT NOT NULL PRIMARY KEY,
  identifier  TEXT NOT NULL,
  value       TEXT NOT NULL,
  expiresAt   INTEGER NOT NULL,
  createdAt   INTEGER,
  updatedAt   INTEGER
);

-- Índices de performance para auth
CREATE INDEX IF NOT EXISTS session_userId_idx ON "session" (userId);
CREATE INDEX IF NOT EXISTS session_token_idx ON "session" (token);
CREATE INDEX IF NOT EXISTS account_userId_idx ON "account" (userId);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification" (identifier);
