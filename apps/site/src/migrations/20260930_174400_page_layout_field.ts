import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

import { setSiteSchema } from "../setSiteSchema"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_pages_layout_mode" AS ENUM('route', 'specific', 'none');
  CREATE TYPE "enum__pages_v_version_layout_mode" AS ENUM('route', 'specific', 'none');
  ALTER TABLE "pages" ADD COLUMN "layout_mode" "enum_pages_layout_mode" DEFAULT 'route';
  ALTER TABLE "pages" ADD COLUMN "layout_layout_id" integer;
  ALTER TABLE "_pages_v" ADD COLUMN "version_layout_mode" "enum__pages_v_version_layout_mode" DEFAULT 'route';
  ALTER TABLE "_pages_v" ADD COLUMN "version_layout_layout_id" integer;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_layout_layout_id_layouts_id_fk" FOREIGN KEY ("layout_layout_id") REFERENCES "layouts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_layout_layout_id_layouts_id_fk" FOREIGN KEY ("version_layout_layout_id") REFERENCES "layouts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_layout_layout_layout_idx" ON "pages" USING btree ("layout_layout_id");
  CREATE INDEX "_pages_v_version_layout_version_layout_layout_idx" ON "_pages_v" USING btree ("version_layout_layout_id");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   ALTER TABLE "pages" DROP CONSTRAINT "pages_layout_layout_id_layouts_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT "_pages_v_version_layout_layout_id_layouts_id_fk";
  
  DROP INDEX "pages_layout_layout_layout_idx";
  DROP INDEX "_pages_v_version_layout_version_layout_layout_idx";
  ALTER TABLE "pages" DROP COLUMN "layout_mode";
  ALTER TABLE "pages" DROP COLUMN "layout_layout_id";
  ALTER TABLE "_pages_v" DROP COLUMN "version_layout_mode";
  ALTER TABLE "_pages_v" DROP COLUMN "version_layout_layout_id";
  DROP TYPE "enum_pages_layout_mode";
  DROP TYPE "enum__pages_v_version_layout_mode";`)
}
