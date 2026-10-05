import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { REGISTRY_DDL } from '../registry/schema'
import { setSiteSchema } from '../setSiteSchema'

/**
 * The shared Registry (apps/site ADR-0015). Creates the `registry` schema's
 * tables if this is the first Site to migrate, registers this Site, and moves
 * this Site's Users onto Registry Users: each keeps their Entra link and gets
 * Site Access to this Site, so nobody who could sign in before is locked out.
 * The seed's own User (Entra id "seed") is no one in the Registry: id 0.
 *
 * down() puts this Site's `users` back as they were and leaves the Registry
 * alone: other Sites use it.
 */
type LocalUser = { id: number; email: string; name: string | null; entra_oid: string }

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql.raw(REGISTRY_DDL))

  const schema = (payload.db as { schemaName?: string }).schemaName || 'public'
  const siteUrl = process.env.SITE_URL?.trim().replace(/\/+$/, '') || null
  const site = await db.execute(sql`
    INSERT INTO registry.sites (schema, url) VALUES (${schema}, ${siteUrl})
    ON CONFLICT (schema) DO UPDATE SET url = COALESCE(registry.sites.url, EXCLUDED.url)
    RETURNING id`)
  const siteId = (site.rows[0] as { id: number }).id

  await db.execute(sql`ALTER TABLE "users" ADD COLUMN "registry_user_id" numeric`)

  const users = await db.execute(sql`SELECT id, email, name, entra_oid FROM "users"`)
  for (const user of users.rows as LocalUser[]) {
    let registryUserId = 0
    if (user.entra_oid !== 'seed') {
      const email = user.email.trim().toLowerCase()
      const found = await db.execute(sql`
        SELECT id FROM registry.users WHERE entra_oid = ${user.entra_oid}
        UNION ALL
        SELECT id FROM registry.users WHERE email = ${email}
        LIMIT 1`)
      if (found.rows[0]) {
        registryUserId = (found.rows[0] as { id: number }).id
        await db.execute(sql`
          UPDATE registry.users SET
            entra_oid = COALESCE(entra_oid, ${user.entra_oid}),
            name = COALESCE(name, ${user.name})
          WHERE id = ${registryUserId}
            AND NOT EXISTS (SELECT 1 FROM registry.users WHERE entra_oid = ${user.entra_oid})`)
      } else {
        const created = await db.execute(sql`
          INSERT INTO registry.users (email, name, entra_oid)
          VALUES (${email}, ${user.name}, ${user.entra_oid}) RETURNING id`)
        registryUserId = (created.rows[0] as { id: number }).id
      }
      await db.execute(sql`
        INSERT INTO registry.site_access (user_id, site_id)
        VALUES (${registryUserId}, ${siteId}) ON CONFLICT DO NOTHING`)
    }
    await db.execute(sql`
      UPDATE "users" SET "registry_user_id" = ${registryUserId} WHERE id = ${user.id}`)
  }

  await db.execute(sql`
  ALTER TABLE "users" ALTER COLUMN "registry_user_id" SET NOT NULL;
  DROP INDEX "users_entra_oid_idx";
  CREATE UNIQUE INDEX "users_registry_user_id_idx" ON "users" USING btree ("registry_user_id");
  ALTER TABLE "users" DROP COLUMN "entra_oid";`)
}

export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
  ALTER TABLE "users" ADD COLUMN "entra_oid" varchar;
  UPDATE "users" u SET "entra_oid" = CASE
    WHEN u."registry_user_id" = 0 THEN 'seed'
    ELSE COALESCE(
      (SELECT r.entra_oid FROM registry.users r WHERE r.id = u."registry_user_id"),
      'registry-' || u."registry_user_id")
    END;
  ALTER TABLE "users" ALTER COLUMN "entra_oid" SET NOT NULL;
  DROP INDEX "users_registry_user_id_idx";
  CREATE UNIQUE INDEX "users_entra_oid_idx" ON "users" USING btree ("entra_oid");
  ALTER TABLE "users" DROP COLUMN "registry_user_id";`)
}
