import type pg from "pg"

/**
 * The Registry's tables (apps/site ADR-0015), in their own `registry` schema
 * of the database every Site shares. Not `public`: a Site with no
 * DATABASE_SCHEMA (tests, plain `pnpm dev`) keeps Payload's own `users` there.
 *
 * Every statement is idempotent, so each Site's migration can run it and the
 * first one to migrate creates the tables for all. A later change to these
 * tables is another idempotent statement appended here and run from a new
 * migration.
 */
export const REGISTRY_SCHEMA = "registry"

export const REGISTRY_DDL = `
CREATE SCHEMA IF NOT EXISTS registry;

CREATE TABLE IF NOT EXISTS registry.users (
  id serial PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  name text,
  password_hash text,
  entra_oid text UNIQUE,
  is_super_admin boolean NOT NULL DEFAULT false,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registry.sites (
  id serial PRIMARY KEY,
  schema text NOT NULL UNIQUE,
  name text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registry.site_access (
  user_id integer NOT NULL REFERENCES registry.users (id) ON DELETE CASCADE,
  site_id integer NOT NULL REFERENCES registry.sites (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, site_id)
);

CREATE TABLE IF NOT EXISTS registry.handoffs (
  token_hash text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES registry.users (id) ON DELETE CASCADE,
  site_id integer NOT NULL REFERENCES registry.sites (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS handoffs_expires_at_idx ON registry.handoffs (expires_at);
`

/** Creates the Registry's tables if they're missing. */
export async function ensureRegistry(db: Pick<pg.Pool, "query">) {
  await db.query(REGISTRY_DDL)
}
