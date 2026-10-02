import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

import { setSiteSchema } from "../setSiteSchema"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "attribution_author" varchar;
  ALTER TABLE "media" ADD COLUMN "attribution_source_url" varchar;
  ALTER TABLE "media" ADD COLUMN "attribution_licence" varchar;`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   ALTER TABLE "media" DROP COLUMN "attribution_author";
  ALTER TABLE "media" DROP COLUMN "attribution_source_url";
  ALTER TABLE "media" DROP COLUMN "attribution_licence";`)
}
