-- enable uuid generation (Postgres 13+)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL,
  site_id text NOT NULL,
  site_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_account_links_tg_site
  ON account_links (telegram_user_id, site_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_account_links_site_user
  ON account_links (site_id, site_user_id);
