# One Site per deployment, each in its own Postgres schema

The Site Builder still serves one Site, but we now run several Sites (Warren Beach, Avada Properties, Beachside Vacations). Each runs as its own deployment of apps/site. The `DATABASE_SCHEMA` env var names the Postgres schema that deployment uses, and Payload's `schemaName` points every table, enum and migration record there. Sites can share one database. Media is split the same way: locally in `media/<schema>/`, and in R2 under the prefix `<schema>`. We chose this because it keeps the app free of tenancy (ADR-0001) while letting several Sites live side by side cheaply. A test with three schemas in one database found no clashes and no data crossing between Sites (research on branch `research/per-site-schema`).

## Considered Options

- **One database per Site.** This was the fallback. It isolates Sites just as well, but it adds a database to provision for each Site, and the schema test made it unnecessary.
- **Bring back multi-site tenancy (apps/cms).** Rejected, for the same reasons as in ADR-0001.

## Consequences

- `schemaName` is marked experimental in Payload 3.90. The test passed, but upgrades must re-check it.
- Migrations are generated once without `DATABASE_SCHEMA` set, and then genericized: the hardcoded `"public".` is removed, and the migration itself creates the schema. One migration file serves every Site. A check must stop `"public".` from reaching `src/migrations`.
- The public Site never names a Site. Each deployment reads only its own schema.
- Tests run without `DATABASE_SCHEMA` set.
