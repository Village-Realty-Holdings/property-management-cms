import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { setSiteSchema } from '../setSiteSchema'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_pages_blocks_button_style" AS ENUM('primary', 'accent', 'outline');
  CREATE TYPE "enum_pages_blocks_button_align" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum_pages_blocks_image_aspect" AS ENUM('original', '16x9', '4x3', '1x1');
  CREATE TYPE "enum__pages_v_blocks_button_style" AS ENUM('primary', 'accent', 'outline');
  CREATE TYPE "enum__pages_v_blocks_button_align" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum__pages_v_blocks_image_aspect" AS ENUM('original', '16x9', '4x3', '1x1');
  CREATE TABLE "pages_blocks_button" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_label" varchar,
  	"link_href" varchar,
  	"style" "enum_pages_blocks_button_style" DEFAULT 'primary',
  	"align" "enum_pages_blocks_button_align" DEFAULT 'start',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"aspect" "enum_pages_blocks_image_aspect" DEFAULT 'original',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_button" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_label" varchar,
  	"link_href" varchar,
  	"style" "enum__pages_v_blocks_button_style" DEFAULT 'primary',
  	"align" "enum__pages_v_blocks_button_align" DEFAULT 'start',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"aspect" "enum__pages_v_blocks_image_aspect" DEFAULT 'original',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_button" ADD CONSTRAINT "pages_blocks_button_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image" ADD CONSTRAINT "pages_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_image" ADD CONSTRAINT "pages_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_button" ADD CONSTRAINT "_pages_v_blocks_button_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image" ADD CONSTRAINT "_pages_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image" ADD CONSTRAINT "_pages_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_button_order_idx" ON "pages_blocks_button" USING btree ("_order");
  CREATE INDEX "pages_blocks_button_parent_id_idx" ON "pages_blocks_button" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_button_path_idx" ON "pages_blocks_button" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_order_idx" ON "pages_blocks_image" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_parent_id_idx" ON "pages_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_path_idx" ON "pages_blocks_image" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_image_idx" ON "pages_blocks_image" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_button_order_idx" ON "_pages_v_blocks_button" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_button_parent_id_idx" ON "_pages_v_blocks_button" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_button_path_idx" ON "_pages_v_blocks_button" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_order_idx" ON "_pages_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_image_parent_id_idx" ON "_pages_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_image_path_idx" ON "_pages_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_image_idx" ON "_pages_v_blocks_image" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   DROP TABLE "pages_blocks_button" CASCADE;
  DROP TABLE "pages_blocks_image" CASCADE;
  DROP TABLE "_pages_v_blocks_button" CASCADE;
  DROP TABLE "_pages_v_blocks_image" CASCADE;
  DROP TYPE "enum_pages_blocks_button_style";
  DROP TYPE "enum_pages_blocks_button_align";
  DROP TYPE "enum_pages_blocks_image_aspect";
  DROP TYPE "enum__pages_v_blocks_button_style";
  DROP TYPE "enum__pages_v_blocks_button_align";
  DROP TYPE "enum__pages_v_blocks_image_aspect";`)
}
