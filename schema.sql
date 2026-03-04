-- TalentMatch — Schéma base de données
-- Commande : npm run db:init (local) ou npm run db:init:remote (prod)

CREATE TABLE IF NOT EXISTS jobs (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  company     TEXT DEFAULT '',
  location    TEXT DEFAULT '',
  contract    TEXT DEFAULT '',
  description TEXT NOT NULL,
  skills      TEXT DEFAULT '[]',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cvs (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT DEFAULT '',
  summary     TEXT NOT NULL,
  skills      TEXT DEFAULT '[]',
  experience  TEXT DEFAULT '',
  education   TEXT DEFAULT '',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cvs_created  ON cvs(created_at DESC);
