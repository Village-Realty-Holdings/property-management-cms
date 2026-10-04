import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

import { setSiteSchema } from "../setSiteSchema"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_pages_blocks_container_3_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "enum_pages_blocks_container_3_gap" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum_pages_blocks_container_3_align" AS ENUM('top', 'centre', 'stretch');
  CREATE TYPE "enum_pages_blocks_container_3_width" AS ENUM('page', 'reading');
  CREATE TYPE "enum_pages_blocks_container_3_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_container_2_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "enum_pages_blocks_container_2_gap" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum_pages_blocks_container_2_align" AS ENUM('top', 'centre', 'stretch');
  CREATE TYPE "enum_pages_blocks_container_2_width" AS ENUM('page', 'reading');
  CREATE TYPE "enum_pages_blocks_container_2_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_container_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "enum_pages_blocks_container_gap" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum_pages_blocks_container_align" AS ENUM('top', 'centre', 'stretch');
  CREATE TYPE "enum_pages_blocks_container_width" AS ENUM('page', 'reading');
  CREATE TYPE "enum_pages_blocks_container_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_container_3_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "enum__pages_v_blocks_container_3_gap" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum__pages_v_blocks_container_3_align" AS ENUM('top', 'centre', 'stretch');
  CREATE TYPE "enum__pages_v_blocks_container_3_width" AS ENUM('page', 'reading');
  CREATE TYPE "enum__pages_v_blocks_container_3_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_container_2_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "enum__pages_v_blocks_container_2_gap" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum__pages_v_blocks_container_2_align" AS ENUM('top', 'centre', 'stretch');
  CREATE TYPE "enum__pages_v_blocks_container_2_width" AS ENUM('page', 'reading');
  CREATE TYPE "enum__pages_v_blocks_container_2_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_container_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "enum__pages_v_blocks_container_gap" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum__pages_v_blocks_container_align" AS ENUM('top', 'centre', 'stretch');
  CREATE TYPE "enum__pages_v_blocks_container_width" AS ENUM('page', 'reading');
  CREATE TYPE "enum__pages_v_blocks_container_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TABLE "pages_blocks_container_3" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"columns" "enum_pages_blocks_container_3_columns" DEFAULT '1',
  	"gap" "enum_pages_blocks_container_3_gap" DEFAULT 'medium',
  	"align" "enum_pages_blocks_container_3_align" DEFAULT 'top',
  	"width" "enum_pages_blocks_container_3_width" DEFAULT 'page',
  	"background" "enum_pages_blocks_container_3_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_container_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"columns" "enum_pages_blocks_container_2_columns" DEFAULT '1',
  	"gap" "enum_pages_blocks_container_2_gap" DEFAULT 'medium',
  	"align" "enum_pages_blocks_container_2_align" DEFAULT 'top',
  	"width" "enum_pages_blocks_container_2_width" DEFAULT 'page',
  	"background" "enum_pages_blocks_container_2_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_container" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"columns" "enum_pages_blocks_container_columns" DEFAULT '1',
  	"gap" "enum_pages_blocks_container_gap" DEFAULT 'medium',
  	"align" "enum_pages_blocks_container_align" DEFAULT 'top',
  	"width" "enum_pages_blocks_container_width" DEFAULT 'page',
  	"background" "enum_pages_blocks_container_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_container_3" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"columns" "enum__pages_v_blocks_container_3_columns" DEFAULT '1',
  	"gap" "enum__pages_v_blocks_container_3_gap" DEFAULT 'medium',
  	"align" "enum__pages_v_blocks_container_3_align" DEFAULT 'top',
  	"width" "enum__pages_v_blocks_container_3_width" DEFAULT 'page',
  	"background" "enum__pages_v_blocks_container_3_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_container_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"columns" "enum__pages_v_blocks_container_2_columns" DEFAULT '1',
  	"gap" "enum__pages_v_blocks_container_2_gap" DEFAULT 'medium',
  	"align" "enum__pages_v_blocks_container_2_align" DEFAULT 'top',
  	"width" "enum__pages_v_blocks_container_2_width" DEFAULT 'page',
  	"background" "enum__pages_v_blocks_container_2_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_container" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"columns" "enum__pages_v_blocks_container_columns" DEFAULT '1',
  	"gap" "enum__pages_v_blocks_container_gap" DEFAULT 'medium',
  	"align" "enum__pages_v_blocks_container_align" DEFAULT 'top',
  	"width" "enum__pages_v_blocks_container_width" DEFAULT 'page',
  	"background" "enum__pages_v_blocks_container_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_container_3" ADD CONSTRAINT "pages_blocks_container_3_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_container_2" ADD CONSTRAINT "pages_blocks_container_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_container" ADD CONSTRAINT "pages_blocks_container_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_container_3" ADD CONSTRAINT "_pages_v_blocks_container_3_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_container_2" ADD CONSTRAINT "_pages_v_blocks_container_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_container" ADD CONSTRAINT "_pages_v_blocks_container_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_container_3_order_idx" ON "pages_blocks_container_3" USING btree ("_order");
  CREATE INDEX "pages_blocks_container_3_parent_id_idx" ON "pages_blocks_container_3" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_container_3_path_idx" ON "pages_blocks_container_3" USING btree ("_path");
  CREATE INDEX "pages_blocks_container_2_order_idx" ON "pages_blocks_container_2" USING btree ("_order");
  CREATE INDEX "pages_blocks_container_2_parent_id_idx" ON "pages_blocks_container_2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_container_2_path_idx" ON "pages_blocks_container_2" USING btree ("_path");
  CREATE INDEX "pages_blocks_container_order_idx" ON "pages_blocks_container" USING btree ("_order");
  CREATE INDEX "pages_blocks_container_parent_id_idx" ON "pages_blocks_container" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_container_path_idx" ON "pages_blocks_container" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_container_3_order_idx" ON "_pages_v_blocks_container_3" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_container_3_parent_id_idx" ON "_pages_v_blocks_container_3" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_container_3_path_idx" ON "_pages_v_blocks_container_3" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_container_2_order_idx" ON "_pages_v_blocks_container_2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_container_2_parent_id_idx" ON "_pages_v_blocks_container_2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_container_2_path_idx" ON "_pages_v_blocks_container_2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_container_order_idx" ON "_pages_v_blocks_container" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_container_parent_id_idx" ON "_pages_v_blocks_container" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_container_path_idx" ON "_pages_v_blocks_container" USING btree ("_path");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   DROP TABLE "pages_blocks_container_3" CASCADE;
  DROP TABLE "pages_blocks_container_2" CASCADE;
  DROP TABLE "pages_blocks_container" CASCADE;
  DROP TABLE "_pages_v_blocks_container_3" CASCADE;
  DROP TABLE "_pages_v_blocks_container_2" CASCADE;
  DROP TABLE "_pages_v_blocks_container" CASCADE;
  DROP TYPE "enum_pages_blocks_container_3_columns";
  DROP TYPE "enum_pages_blocks_container_3_gap";
  DROP TYPE "enum_pages_blocks_container_3_align";
  DROP TYPE "enum_pages_blocks_container_3_width";
  DROP TYPE "enum_pages_blocks_container_3_background";
  DROP TYPE "enum_pages_blocks_container_2_columns";
  DROP TYPE "enum_pages_blocks_container_2_gap";
  DROP TYPE "enum_pages_blocks_container_2_align";
  DROP TYPE "enum_pages_blocks_container_2_width";
  DROP TYPE "enum_pages_blocks_container_2_background";
  DROP TYPE "enum_pages_blocks_container_columns";
  DROP TYPE "enum_pages_blocks_container_gap";
  DROP TYPE "enum_pages_blocks_container_align";
  DROP TYPE "enum_pages_blocks_container_width";
  DROP TYPE "enum_pages_blocks_container_background";
  DROP TYPE "enum__pages_v_blocks_container_3_columns";
  DROP TYPE "enum__pages_v_blocks_container_3_gap";
  DROP TYPE "enum__pages_v_blocks_container_3_align";
  DROP TYPE "enum__pages_v_blocks_container_3_width";
  DROP TYPE "enum__pages_v_blocks_container_3_background";
  DROP TYPE "enum__pages_v_blocks_container_2_columns";
  DROP TYPE "enum__pages_v_blocks_container_2_gap";
  DROP TYPE "enum__pages_v_blocks_container_2_align";
  DROP TYPE "enum__pages_v_blocks_container_2_width";
  DROP TYPE "enum__pages_v_blocks_container_2_background";
  DROP TYPE "enum__pages_v_blocks_container_columns";
  DROP TYPE "enum__pages_v_blocks_container_gap";
  DROP TYPE "enum__pages_v_blocks_container_align";
  DROP TYPE "enum__pages_v_blocks_container_width";
  DROP TYPE "enum__pages_v_blocks_container_background";`)
}
