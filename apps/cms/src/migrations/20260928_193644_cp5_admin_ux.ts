import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "site_slug_idx";
  DROP INDEX "site_slug_1_idx";
  DROP INDEX "site_slug_2_idx";
  DROP INDEX "site_slug_3_idx";
  DROP INDEX "site_slug_4_idx";
  ALTER TABLE "properties" ADD COLUMN "admin_title" varchar;
  ALTER TABLE "locations" ADD COLUMN "admin_title" varchar;
  ALTER TABLE "specials" ADD COLUMN "admin_title" varchar;
  ALTER TABLE "reviews" ADD COLUMN "admin_title" varchar;
  ALTER TABLE "_guides_v" ADD COLUMN "autosave" boolean;
  CREATE UNIQUE INDEX "site_slug_2_idx" ON "properties" USING btree ("site_id","slug");
  CREATE UNIQUE INDEX "site_slug_3_idx" ON "locations" USING btree ("site_id","slug");
  CREATE UNIQUE INDEX "site_slug_4_idx" ON "specials" USING btree ("site_id","slug");
  CREATE UNIQUE INDEX "site_slug_idx" ON "guides" USING btree ("site_id","slug");
  CREATE INDEX "_guides_v_autosave_idx" ON "_guides_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "site_slug_1_idx" ON "curated_lists" USING btree ("site_id","slug");`)

  // Backfill adminTitle for existing rows, as the beforeChange hooks would set it.
  await db.execute(sql`
  UPDATE "properties" SET "admin_title" = coalesce(nullif(trim("headline"), ''), nullif(trim("feed_name"), ''));
  UPDATE "specials" SET "admin_title" = coalesce(nullif(trim("title"), ''), nullif(trim("code"), ''), nullif(trim("feed_id"), ''));
  UPDATE "locations" l SET "admin_title" = (
    SELECT CASE WHEN lvl IS NOT NULL THEN path || ' (' || lvl || ')' ELSE nullif(path, '') END
    FROM (SELECT
      concat_ws(' › ', coalesce(nullif(trim(p."display_name"), ''), nullif(trim(p."name"), '')),
                       coalesce(nullif(trim(l."display_name"), ''), nullif(trim(l."name"), ''))) AS path,
      CASE l."level"::text WHEN 'destination' THEN 'Destination' WHEN 'area' THEN 'Area' WHEN 'complex' THEN 'Complex' END AS lvl
      FROM (SELECT 1) one LEFT JOIN "locations" p ON p."id" = l."parent_id") parts
  );
  UPDATE "reviews" r SET "admin_title" = coalesce(
    nullif(concat_ws(' — ',
      '★' || trim_scale(r."rating")::text,
      nullif(trim(r."guest_name"), ''),
      (SELECT coalesce(nullif(trim(p."headline"), ''), nullif(trim(p."feed_name"), '')) FROM "properties" p WHERE p."id" = r."property_id")
    ), ''),
    nullif(trim(r."title"), ''),
    nullif(trim(r."feed_id"), ''));`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "site_slug_idx";
  DROP INDEX "_guides_v_autosave_idx";
  DROP INDEX "site_slug_1_idx";
  DROP INDEX "site_slug_2_idx";
  DROP INDEX "site_slug_3_idx";
  DROP INDEX "site_slug_4_idx";
  CREATE UNIQUE INDEX "site_slug_3_idx" ON "guides" USING btree ("site_id","slug");
  CREATE UNIQUE INDEX "site_slug_4_idx" ON "curated_lists" USING btree ("site_id","slug");
  CREATE UNIQUE INDEX "site_slug_idx" ON "properties" USING btree ("site_id","slug");
  CREATE UNIQUE INDEX "site_slug_1_idx" ON "locations" USING btree ("site_id","slug");
  CREATE UNIQUE INDEX "site_slug_2_idx" ON "specials" USING btree ("site_id","slug");
  ALTER TABLE "_guides_v" DROP COLUMN "autosave";
  ALTER TABLE "properties" DROP COLUMN "admin_title";
  ALTER TABLE "locations" DROP COLUMN "admin_title";
  ALTER TABLE "specials" DROP COLUMN "admin_title";
  ALTER TABLE "reviews" DROP COLUMN "admin_title";`)
}
