-- ============================================================
-- Migration 0003: Daily redesenhada
-- Mantem uma entrada por usuario/data e salva a rotina como blocos JSON.
-- ============================================================

ALTER TABLE daily_entries ADD COLUMN mood_label TEXT;
ALTER TABLE daily_entries ADD COLUMN arrival_message TEXT;
ALTER TABLE daily_entries ADD COLUMN good_day TEXT;
ALTER TABLE daily_entries ADD COLUMN day_mode TEXT;
ALTER TABLE daily_entries ADD COLUMN day_closed_at INTEGER;
ALTER TABLE daily_entries ADD COLUMN day_score INTEGER CHECK (day_score IS NULL OR day_score BETWEEN 1 AND 10);
ALTER TABLE daily_entries ADD COLUMN water_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE daily_entries ADD COLUMN movement_note TEXT;
ALTER TABLE daily_entries ADD COLUMN worry_note TEXT;
ALTER TABLE daily_entries ADD COLUMN priorities TEXT NOT NULL DEFAULT '[]';
ALTER TABLE daily_entries ADD COLUMN rhythm_blocks TEXT NOT NULL DEFAULT '[]';
ALTER TABLE daily_entries ADD COLUMN habits_state TEXT NOT NULL DEFAULT '[]';
ALTER TABLE daily_entries ADD COLUMN extra_tasks TEXT NOT NULL DEFAULT '[]';
ALTER TABLE daily_entries ADD COLUMN finance_logs TEXT NOT NULL DEFAULT '[]';
ALTER TABLE daily_entries ADD COLUMN pause_actions TEXT NOT NULL DEFAULT '[]';
ALTER TABLE daily_entries ADD COLUMN night_checks TEXT NOT NULL DEFAULT '[]';
ALTER TABLE daily_entries ADD COLUMN reflections TEXT NOT NULL DEFAULT '{}';
ALTER TABLE daily_entries ADD COLUMN weekly_summary TEXT NOT NULL DEFAULT '{}';
