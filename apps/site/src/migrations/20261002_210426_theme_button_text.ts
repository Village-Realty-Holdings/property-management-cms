import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

import { setSiteSchema } from "../setSiteSchema"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_theme_button_text" AS ENUM('auto', 'white', 'dark');
  CREATE TYPE "enum__theme_v_version_button_text" AS ENUM('auto', 'white', 'dark');
  ALTER TABLE "theme" ADD COLUMN "button_text" "enum_theme_button_text" DEFAULT 'auto' NOT NULL;
  ALTER TABLE "_theme_v" ADD COLUMN "version_button_text" "enum__theme_v_version_button_text" DEFAULT 'auto' NOT NULL;`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   ALTER TABLE "theme" DROP COLUMN "button_text";
  ALTER TABLE "_theme_v" DROP COLUMN "version_button_text";
  DROP TYPE "enum_theme_button_text";
  DROP TYPE "enum__theme_v_version_button_text";`)
}
