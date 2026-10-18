-- WhatsApp Follow-up dashboard (Cloudflare D1)

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,          -- WhatsApp message id (wamid)
  wa_id      TEXT NOT NULL,             -- customer phone, digits only
  direction  TEXT NOT NULL,             -- 'in' (customer) | 'out' (us)
  source     TEXT NOT NULL,             -- 'customer' | 'human' (phone app) | 'bot' (API, e.g. Peach)
  type       TEXT,
  text       TEXT,
  ts         INTEGER NOT NULL           -- unix seconds
);
CREATE INDEX IF NOT EXISTS idx_messages_wa_ts ON messages (wa_id, ts);

CREATE TABLE IF NOT EXISTS conversations (
  wa_id            TEXT PRIMARY KEY,
  name             TEXT,
  last_in_at       INTEGER,             -- last customer message
  last_in_text     TEXT,
  last_human_at    INTEGER,             -- last reply sent by you from the phone app
  last_human_text  TEXT,
  last_bot_at      INTEGER,             -- last message sent through the API (Peach AI)
  last_msg_at      INTEGER,
  needs_ai         INTEGER DEFAULT 0,   -- 1 = new messages since last AI analysis
  ai_status        TEXT,                -- urgent | follow_up | waiting_on_me | waiting_on_customer | closed
  ai_heat          TEXT,                -- hot | warm | cold
  ai_summary       TEXT,
  ai_next_action   TEXT,
  ai_follow_up     TEXT,                -- YYYY-MM-DD or ''
  ai_draft         TEXT,
  ai_at            INTEGER,
  done_at          INTEGER,             -- marked handled; reopens on next customer message
  snooze_until     INTEGER
);
