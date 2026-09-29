import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

/**
 * Preview drawn by the CMS (ADR-0018): preview SiteReaders go (their keys
 * stop working), then their `purpose`. Curated Lists get autosave.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DELETE FROM "site_readers" WHERE "purpose" = 'preview';
  DROP INDEX "site_purpose_idx";
  ALTER TABLE "_curated_lists_v" ADD COLUMN "autosave" boolean;
  CREATE INDEX "_curated_lists_v_autosave_idx" ON "_curated_lists_v" USING btree ("autosave");
  ALTER TABLE "site_readers" DROP COLUMN "purpose";
  DROP TYPE "public"."enum_site_readers_purpose";`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_readers_purpose" AS ENUM('published', 'preview');
  DROP INDEX "_curated_lists_v_autosave_idx";
  ALTER TABLE "site_readers" ADD COLUMN "purpose" "enum_site_readers_purpose" DEFAULT 'published';
  CREATE UNIQUE INDEX "site_purpose_idx" ON "site_readers" USING btree ("site_id","purpose");
  ALTER TABLE "_curated_lists_v" DROP COLUMN "autosave";`)
}
