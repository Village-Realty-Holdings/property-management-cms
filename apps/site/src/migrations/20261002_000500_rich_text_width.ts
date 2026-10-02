import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

import { setSiteSchema } from "../setSiteSchema"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_pages_blocks_rich_text_width" AS ENUM('reading', 'wide');
  CREATE TYPE "enum__pages_v_blocks_rich_text_width" AS ENUM('reading', 'wide');
  ALTER TABLE "pages_blocks_rich_text" ADD COLUMN "width" "enum_pages_blocks_rich_text_width" DEFAULT 'reading';
  ALTER TABLE "_pages_v_blocks_rich_text" ADD COLUMN "width" "enum__pages_v_blocks_rich_text_width" DEFAULT 'reading';`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   ALTER TABLE "pages_blocks_rich_text" DROP COLUMN "width";
  ALTER TABLE "_pages_v_blocks_rich_text" DROP COLUMN "width";
  DROP TYPE "enum_pages_blocks_rich_text_width";
  DROP TYPE "enum__pages_v_blocks_rich_text_width";`)
}
