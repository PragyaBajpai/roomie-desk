// Database schema. Idempotent: safe to run on every cold start.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS flatmates (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  gender          TEXT NOT NULL CHECK (gender IN ('female','male','non-binary')),
  preferred_gender TEXT NOT NULL DEFAULT 'any' CHECK (preferred_gender IN ('female','male','any')),
  occupation      TEXT NOT NULL DEFAULT '',
  city            TEXT NOT NULL,
  locality        TEXT NOT NULL,
  budget_min      INTEGER NOT NULL CHECK (budget_min >= 0),
  budget_max      INTEGER NOT NULL CHECK (budget_max >= budget_min),
  move_in_date    DATE NOT NULL,
  food            TEXT NOT NULL DEFAULT 'any',
  smoking         TEXT NOT NULL DEFAULT 'non-smoker',
  drinking        TEXT NOT NULL DEFAULT 'never',
  work_schedule   TEXT NOT NULL DEFAULT 'day',
  lifestyle       TEXT[] NOT NULL DEFAULT '{}',
  intro           TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','matched','inactive')),
  is_demo         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enquiries (
  id                 SERIAL PRIMARY KEY,
  customer_name      TEXT NOT NULL,
  customer_phone     TEXT NOT NULL DEFAULT '',
  gender             TEXT CHECK (gender IN ('female','male','non-binary')),
  preferred_flatmate_gender TEXT NOT NULL DEFAULT 'any' CHECK (preferred_flatmate_gender IN ('female','male','any')),
  occupation         TEXT NOT NULL DEFAULT '',
  city               TEXT,
  locality           TEXT,
  budget_min         INTEGER,
  budget_max         INTEGER,
  move_in_by         DATE,
  food               TEXT,
  smoking            TEXT,
  drinking           TEXT,
  lifestyle          TEXT[] NOT NULL DEFAULT '{}',
  notes              TEXT NOT NULL DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','matching','shortlisted','contacted','matched','closed')),
  is_demo            BOOLEAN NOT NULL DEFAULT FALSE,
  source             TEXT NOT NULL DEFAULT 'web',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shortlists (
  id           SERIAL PRIMARY KEY,
  enquiry_id   INTEGER NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  flatmate_id  INTEGER NOT NULL REFERENCES flatmates(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL,
  reason       TEXT NOT NULL DEFAULT '',
  note         TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'shortlisted' CHECK (status IN ('shortlisted','contacted','accepted','declined')),
  source       TEXT NOT NULL DEFAULT 'web',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enquiry_id, flatmate_id)
);

CREATE TABLE IF NOT EXISTS activities (
  id          SERIAL PRIMARY KEY,
  message     TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'web',
  enquiry_id  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

-- v2: customer private links + who made each decision
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS access_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_enquiries_token ON enquiries (access_token);
ALTER TABLE shortlists ADD COLUMN IF NOT EXISTS decided_by TEXT CHECK (decided_by IN ('customer','agency'));
ALTER TABLE shortlists ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities (created_at DESC);
`;
