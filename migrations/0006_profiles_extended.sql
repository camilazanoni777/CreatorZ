-- ============================================================
-- Migration 0006: Perfil estendido
-- Adiciona campos de personalização e preferências ao perfil.
-- Seguro para aplicar em banco com dados existentes (ALTER TABLE).
-- ============================================================

-- Campos de dados pessoais
ALTER TABLE profiles ADD COLUMN display_name TEXT;
ALTER TABLE profiles ADD COLUMN bio TEXT;
ALTER TABLE profiles ADD COLUMN city TEXT;
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;

-- Preferências do app
ALTER TABLE profiles ADD COLUMN theme_preference TEXT NOT NULL DEFAULT 'system';
ALTER TABLE profiles ADD COLUMN notifications_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN daily_reminder_time TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE profiles ADD COLUMN financial_values_visible INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN week_start TEXT NOT NULL DEFAULT 'monday';
ALTER TABLE profiles ADD COLUMN language TEXT NOT NULL DEFAULT 'pt-BR';
