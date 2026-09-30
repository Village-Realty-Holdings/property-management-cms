import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { setSiteSchema } from '../setSiteSchema'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_pages_blocks_rich_text_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_call_to_action_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_rich_text_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_call_to_action_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_layouts_blocks_call_to_action_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__layouts_v_blocks_call_to_action_background" AS ENUM('default', 'muted', 'primary', 'dark');
  ALTER TABLE "pages_blocks_rich_text" ADD COLUMN "background" "enum_pages_blocks_rich_text_background" DEFAULT 'default';
  ALTER TABLE "pages_blocks_call_to_action" ADD COLUMN "background" "enum_pages_blocks_call_to_action_background" DEFAULT 'default';
  ALTER TABLE "_pages_v_blocks_rich_text" ADD COLUMN "background" "enum__pages_v_blocks_rich_text_background" DEFAULT 'default';
  ALTER TABLE "_pages_v_blocks_call_to_action" ADD COLUMN "background" "enum__pages_v_blocks_call_to_action_background" DEFAULT 'default';
  ALTER TABLE "layouts_blocks_call_to_action" ADD COLUMN "background" "enum_layouts_blocks_call_to_action_background" DEFAULT 'default';
  ALTER TABLE "_layouts_v_blocks_call_to_action" ADD COLUMN "background" "enum__layouts_v_blocks_call_to_action_background" DEFAULT 'default';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   ALTER TABLE "pages_blocks_rich_text" DROP COLUMN "background";
  ALTER TABLE "pages_blocks_call_to_action" DROP COLUMN "background";
  ALTER TABLE "_pages_v_blocks_rich_text" DROP COLUMN "background";
  ALTER TABLE "_pages_v_blocks_call_to_action" DROP COLUMN "background";
  ALTER TABLE "layouts_blocks_call_to_action" DROP COLUMN "background";
  ALTER TABLE "_layouts_v_blocks_call_to_action" DROP COLUMN "background";
  DROP TYPE "enum_pages_blocks_rich_text_background";
  DROP TYPE "enum_pages_blocks_call_to_action_background";
  DROP TYPE "enum__pages_v_blocks_rich_text_background";
  DROP TYPE "enum__pages_v_blocks_call_to_action_background";
  DROP TYPE "enum_layouts_blocks_call_to_action_background";
  DROP TYPE "enum__layouts_v_blocks_call_to_action_background";`)
}
