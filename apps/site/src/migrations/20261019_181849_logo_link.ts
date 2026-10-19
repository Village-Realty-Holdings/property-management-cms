import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { setSiteSchema } from '../setSiteSchema'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_layouts_blocks_logo_link_type" AS ENUM('page', 'url');
  CREATE TYPE "enum__layouts_v_blocks_logo_link_type" AS ENUM('page', 'url');
  ALTER TABLE "layouts_blocks_logo" ADD COLUMN "link_type" "enum_layouts_blocks_logo_link_type" DEFAULT 'page';
  ALTER TABLE "layouts_blocks_logo" ADD COLUMN "link_page_id" integer;
  ALTER TABLE "layouts_blocks_logo" ADD COLUMN "link_url" varchar;
  ALTER TABLE "_layouts_v_blocks_logo" ADD COLUMN "link_type" "enum__layouts_v_blocks_logo_link_type" DEFAULT 'page';
  ALTER TABLE "_layouts_v_blocks_logo" ADD COLUMN "link_page_id" integer;
  ALTER TABLE "_layouts_v_blocks_logo" ADD COLUMN "link_url" varchar;
  ALTER TABLE "layouts_blocks_logo" ADD CONSTRAINT "layouts_blocks_logo_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_logo" ADD CONSTRAINT "_layouts_v_blocks_logo_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "pages"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "layouts_blocks_logo_link_link_page_idx" ON "layouts_blocks_logo" USING btree ("link_page_id");
  CREATE INDEX "_layouts_v_blocks_logo_link_link_page_idx" ON "_layouts_v_blocks_logo" USING btree ("link_page_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   ALTER TABLE "layouts_blocks_logo" DROP CONSTRAINT "layouts_blocks_logo_link_page_id_pages_id_fk";
  
  ALTER TABLE "_layouts_v_blocks_logo" DROP CONSTRAINT "_layouts_v_blocks_logo_link_page_id_pages_id_fk";
  
  DROP INDEX "layouts_blocks_logo_link_link_page_idx";
  DROP INDEX "_layouts_v_blocks_logo_link_link_page_idx";
  ALTER TABLE "layouts_blocks_logo" DROP COLUMN "link_type";
  ALTER TABLE "layouts_blocks_logo" DROP COLUMN "link_page_id";
  ALTER TABLE "layouts_blocks_logo" DROP COLUMN "link_url";
  ALTER TABLE "_layouts_v_blocks_logo" DROP COLUMN "link_type";
  ALTER TABLE "_layouts_v_blocks_logo" DROP COLUMN "link_page_id";
  ALTER TABLE "_layouts_v_blocks_logo" DROP COLUMN "link_url";
  DROP TYPE "enum_layouts_blocks_logo_link_type";
  DROP TYPE "enum__layouts_v_blocks_logo_link_type";`)
}
