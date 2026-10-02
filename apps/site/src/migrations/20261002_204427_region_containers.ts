import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

import { setSiteSchema } from "../setSiteSchema"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_pages_blocks_container_3_justify" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum_pages_blocks_container_2_justify" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum_pages_blocks_container_justify" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum__pages_v_blocks_container_3_justify" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum__pages_v_blocks_container_2_justify" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum__pages_v_blocks_container_justify" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum_layouts_blocks_container_3_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "enum_layouts_blocks_container_3_gap" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum_layouts_blocks_container_3_align" AS ENUM('top', 'centre', 'stretch');
  CREATE TYPE "enum_layouts_blocks_container_3_justify" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum_layouts_blocks_container_3_width" AS ENUM('page', 'reading');
  CREATE TYPE "enum_layouts_blocks_container_3_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_layouts_blocks_container_2_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "enum_layouts_blocks_container_2_gap" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum_layouts_blocks_container_2_align" AS ENUM('top', 'centre', 'stretch');
  CREATE TYPE "enum_layouts_blocks_container_2_justify" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum_layouts_blocks_container_2_width" AS ENUM('page', 'reading');
  CREATE TYPE "enum_layouts_blocks_container_2_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_layouts_blocks_container_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "enum_layouts_blocks_container_gap" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum_layouts_blocks_container_align" AS ENUM('top', 'centre', 'stretch');
  CREATE TYPE "enum_layouts_blocks_container_justify" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum_layouts_blocks_container_width" AS ENUM('page', 'reading');
  CREATE TYPE "enum_layouts_blocks_container_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__layouts_v_blocks_container_3_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "enum__layouts_v_blocks_container_3_gap" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum__layouts_v_blocks_container_3_align" AS ENUM('top', 'centre', 'stretch');
  CREATE TYPE "enum__layouts_v_blocks_container_3_justify" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum__layouts_v_blocks_container_3_width" AS ENUM('page', 'reading');
  CREATE TYPE "enum__layouts_v_blocks_container_3_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__layouts_v_blocks_container_2_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "enum__layouts_v_blocks_container_2_gap" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum__layouts_v_blocks_container_2_align" AS ENUM('top', 'centre', 'stretch');
  CREATE TYPE "enum__layouts_v_blocks_container_2_justify" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum__layouts_v_blocks_container_2_width" AS ENUM('page', 'reading');
  CREATE TYPE "enum__layouts_v_blocks_container_2_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__layouts_v_blocks_container_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "enum__layouts_v_blocks_container_gap" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum__layouts_v_blocks_container_align" AS ENUM('top', 'centre', 'stretch');
  CREATE TYPE "enum__layouts_v_blocks_container_justify" AS ENUM('start', 'centre', 'end');
  CREATE TYPE "enum__layouts_v_blocks_container_width" AS ENUM('page', 'reading');
  CREATE TYPE "enum__layouts_v_blocks_container_background" AS ENUM('default', 'muted', 'primary', 'dark');
  ALTER TYPE "enum_layouts_blocks_logo_size" ADD VALUE 'xlarge';
  ALTER TYPE "enum__layouts_v_blocks_logo_size" ADD VALUE 'xlarge';
  CREATE TABLE "layouts_blocks_container_3" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"columns" "enum_layouts_blocks_container_3_columns" DEFAULT '1' NOT NULL,
  	"gap" "enum_layouts_blocks_container_3_gap" DEFAULT 'medium' NOT NULL,
  	"align" "enum_layouts_blocks_container_3_align" DEFAULT 'top' NOT NULL,
  	"justify" "enum_layouts_blocks_container_3_justify" DEFAULT 'start',
  	"width" "enum_layouts_blocks_container_3_width" DEFAULT 'page' NOT NULL,
  	"background" "enum_layouts_blocks_container_3_background" DEFAULT 'default',
  	"rule" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "layouts_blocks_container_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"columns" "enum_layouts_blocks_container_2_columns" DEFAULT '1' NOT NULL,
  	"gap" "enum_layouts_blocks_container_2_gap" DEFAULT 'medium' NOT NULL,
  	"align" "enum_layouts_blocks_container_2_align" DEFAULT 'top' NOT NULL,
  	"justify" "enum_layouts_blocks_container_2_justify" DEFAULT 'start',
  	"width" "enum_layouts_blocks_container_2_width" DEFAULT 'page' NOT NULL,
  	"background" "enum_layouts_blocks_container_2_background" DEFAULT 'default',
  	"rule" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "layouts_blocks_container" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"columns" "enum_layouts_blocks_container_columns" DEFAULT '1' NOT NULL,
  	"gap" "enum_layouts_blocks_container_gap" DEFAULT 'medium' NOT NULL,
  	"align" "enum_layouts_blocks_container_align" DEFAULT 'top' NOT NULL,
  	"justify" "enum_layouts_blocks_container_justify" DEFAULT 'start',
  	"width" "enum_layouts_blocks_container_width" DEFAULT 'page' NOT NULL,
  	"background" "enum_layouts_blocks_container_background" DEFAULT 'default',
  	"rule" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_container_3" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"columns" "enum__layouts_v_blocks_container_3_columns" DEFAULT '1' NOT NULL,
  	"gap" "enum__layouts_v_blocks_container_3_gap" DEFAULT 'medium' NOT NULL,
  	"align" "enum__layouts_v_blocks_container_3_align" DEFAULT 'top' NOT NULL,
  	"justify" "enum__layouts_v_blocks_container_3_justify" DEFAULT 'start',
  	"width" "enum__layouts_v_blocks_container_3_width" DEFAULT 'page' NOT NULL,
  	"background" "enum__layouts_v_blocks_container_3_background" DEFAULT 'default',
  	"rule" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_container_2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"columns" "enum__layouts_v_blocks_container_2_columns" DEFAULT '1' NOT NULL,
  	"gap" "enum__layouts_v_blocks_container_2_gap" DEFAULT 'medium' NOT NULL,
  	"align" "enum__layouts_v_blocks_container_2_align" DEFAULT 'top' NOT NULL,
  	"justify" "enum__layouts_v_blocks_container_2_justify" DEFAULT 'start',
  	"width" "enum__layouts_v_blocks_container_2_width" DEFAULT 'page' NOT NULL,
  	"background" "enum__layouts_v_blocks_container_2_background" DEFAULT 'default',
  	"rule" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_container" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"columns" "enum__layouts_v_blocks_container_columns" DEFAULT '1' NOT NULL,
  	"gap" "enum__layouts_v_blocks_container_gap" DEFAULT 'medium' NOT NULL,
  	"align" "enum__layouts_v_blocks_container_align" DEFAULT 'top' NOT NULL,
  	"justify" "enum__layouts_v_blocks_container_justify" DEFAULT 'start',
  	"width" "enum__layouts_v_blocks_container_width" DEFAULT 'page' NOT NULL,
  	"background" "enum__layouts_v_blocks_container_background" DEFAULT 'default',
  	"rule" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "layouts_blocks_utility_strip" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "_layouts_v_blocks_utility_strip" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "pages_blocks_container_3" ADD COLUMN "justify" "enum_pages_blocks_container_3_justify" DEFAULT 'start';
  ALTER TABLE "pages_blocks_container_2" ADD COLUMN "justify" "enum_pages_blocks_container_2_justify" DEFAULT 'start';
  ALTER TABLE "pages_blocks_container" ADD COLUMN "justify" "enum_pages_blocks_container_justify" DEFAULT 'start';
  ALTER TABLE "_pages_v_blocks_container_3" ADD COLUMN "justify" "enum__pages_v_blocks_container_3_justify" DEFAULT 'start';
  ALTER TABLE "_pages_v_blocks_container_2" ADD COLUMN "justify" "enum__pages_v_blocks_container_2_justify" DEFAULT 'start';
  ALTER TABLE "_pages_v_blocks_container" ADD COLUMN "justify" "enum__pages_v_blocks_container_justify" DEFAULT 'start';
  ALTER TABLE "layouts_blocks_utility_strip" ADD COLUMN "show_phone" boolean DEFAULT false;
  ALTER TABLE "_layouts_v_blocks_utility_strip" ADD COLUMN "show_phone" boolean DEFAULT false;
  ALTER TABLE "brand" ADD COLUMN "logo_light_id" integer;
  ALTER TABLE "layouts_blocks_container_3" ADD CONSTRAINT "layouts_blocks_container_3_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_container_2" ADD CONSTRAINT "layouts_blocks_container_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_container" ADD CONSTRAINT "layouts_blocks_container_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_container_3" ADD CONSTRAINT "_layouts_v_blocks_container_3_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_container_2" ADD CONSTRAINT "_layouts_v_blocks_container_2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_container" ADD CONSTRAINT "_layouts_v_blocks_container_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "layouts_blocks_container_3_order_idx" ON "layouts_blocks_container_3" USING btree ("_order");
  CREATE INDEX "layouts_blocks_container_3_parent_id_idx" ON "layouts_blocks_container_3" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_container_3_path_idx" ON "layouts_blocks_container_3" USING btree ("_path");
  CREATE INDEX "layouts_blocks_container_2_order_idx" ON "layouts_blocks_container_2" USING btree ("_order");
  CREATE INDEX "layouts_blocks_container_2_parent_id_idx" ON "layouts_blocks_container_2" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_container_2_path_idx" ON "layouts_blocks_container_2" USING btree ("_path");
  CREATE INDEX "layouts_blocks_container_order_idx" ON "layouts_blocks_container" USING btree ("_order");
  CREATE INDEX "layouts_blocks_container_parent_id_idx" ON "layouts_blocks_container" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_container_path_idx" ON "layouts_blocks_container" USING btree ("_path");
  CREATE INDEX "_layouts_v_blocks_container_3_order_idx" ON "_layouts_v_blocks_container_3" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_container_3_parent_id_idx" ON "_layouts_v_blocks_container_3" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_container_3_path_idx" ON "_layouts_v_blocks_container_3" USING btree ("_path");
  CREATE INDEX "_layouts_v_blocks_container_2_order_idx" ON "_layouts_v_blocks_container_2" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_container_2_parent_id_idx" ON "_layouts_v_blocks_container_2" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_container_2_path_idx" ON "_layouts_v_blocks_container_2" USING btree ("_path");
  CREATE INDEX "_layouts_v_blocks_container_order_idx" ON "_layouts_v_blocks_container" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_container_parent_id_idx" ON "_layouts_v_blocks_container" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_container_path_idx" ON "_layouts_v_blocks_container" USING btree ("_path");
  ALTER TABLE "brand" ADD CONSTRAINT "brand_logo_light_id_media_id_fk" FOREIGN KEY ("logo_light_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "brand_logo_light_idx" ON "brand" USING btree ("logo_light_id");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   ALTER TABLE "layouts_blocks_container_3" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_container_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_container" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_container_3" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_container_2" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_container" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "layouts_blocks_container_3" CASCADE;
  DROP TABLE "layouts_blocks_container_2" CASCADE;
  DROP TABLE "layouts_blocks_container" CASCADE;
  DROP TABLE "_layouts_v_blocks_container_3" CASCADE;
  DROP TABLE "_layouts_v_blocks_container_2" CASCADE;
  DROP TABLE "_layouts_v_blocks_container" CASCADE;
  ALTER TABLE "brand" DROP CONSTRAINT "brand_logo_light_id_media_id_fk";
  
  ALTER TABLE "layouts_blocks_logo" ALTER COLUMN "size" SET DATA TYPE text;
  ALTER TABLE "layouts_blocks_logo" ALTER COLUMN "size" SET DEFAULT 'medium'::text;
  DROP TYPE "enum_layouts_blocks_logo_size";
  CREATE TYPE "enum_layouts_blocks_logo_size" AS ENUM('small', 'medium', 'large');
  ALTER TABLE "layouts_blocks_logo" ALTER COLUMN "size" SET DEFAULT 'medium'::"enum_layouts_blocks_logo_size";
  ALTER TABLE "layouts_blocks_logo" ALTER COLUMN "size" SET DATA TYPE "enum_layouts_blocks_logo_size" USING "size"::"enum_layouts_blocks_logo_size";
  ALTER TABLE "_layouts_v_blocks_logo" ALTER COLUMN "size" SET DATA TYPE text;
  ALTER TABLE "_layouts_v_blocks_logo" ALTER COLUMN "size" SET DEFAULT 'medium'::text;
  DROP TYPE "enum__layouts_v_blocks_logo_size";
  CREATE TYPE "enum__layouts_v_blocks_logo_size" AS ENUM('small', 'medium', 'large');
  ALTER TABLE "_layouts_v_blocks_logo" ALTER COLUMN "size" SET DEFAULT 'medium'::"enum__layouts_v_blocks_logo_size";
  ALTER TABLE "_layouts_v_blocks_logo" ALTER COLUMN "size" SET DATA TYPE "enum__layouts_v_blocks_logo_size" USING "size"::"enum__layouts_v_blocks_logo_size";
  DROP INDEX "brand_logo_light_idx";
  ALTER TABLE "layouts_blocks_utility_strip" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "_layouts_v_blocks_utility_strip" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "pages_blocks_container_3" DROP COLUMN "justify";
  ALTER TABLE "pages_blocks_container_2" DROP COLUMN "justify";
  ALTER TABLE "pages_blocks_container" DROP COLUMN "justify";
  ALTER TABLE "_pages_v_blocks_container_3" DROP COLUMN "justify";
  ALTER TABLE "_pages_v_blocks_container_2" DROP COLUMN "justify";
  ALTER TABLE "_pages_v_blocks_container" DROP COLUMN "justify";
  ALTER TABLE "layouts_blocks_utility_strip" DROP COLUMN "show_phone";
  ALTER TABLE "_layouts_v_blocks_utility_strip" DROP COLUMN "show_phone";
  ALTER TABLE "brand" DROP COLUMN "logo_light_id";
  DROP TYPE "enum_pages_blocks_container_3_justify";
  DROP TYPE "enum_pages_blocks_container_2_justify";
  DROP TYPE "enum_pages_blocks_container_justify";
  DROP TYPE "enum__pages_v_blocks_container_3_justify";
  DROP TYPE "enum__pages_v_blocks_container_2_justify";
  DROP TYPE "enum__pages_v_blocks_container_justify";
  DROP TYPE "enum_layouts_blocks_container_3_columns";
  DROP TYPE "enum_layouts_blocks_container_3_gap";
  DROP TYPE "enum_layouts_blocks_container_3_align";
  DROP TYPE "enum_layouts_blocks_container_3_justify";
  DROP TYPE "enum_layouts_blocks_container_3_width";
  DROP TYPE "enum_layouts_blocks_container_3_background";
  DROP TYPE "enum_layouts_blocks_container_2_columns";
  DROP TYPE "enum_layouts_blocks_container_2_gap";
  DROP TYPE "enum_layouts_blocks_container_2_align";
  DROP TYPE "enum_layouts_blocks_container_2_justify";
  DROP TYPE "enum_layouts_blocks_container_2_width";
  DROP TYPE "enum_layouts_blocks_container_2_background";
  DROP TYPE "enum_layouts_blocks_container_columns";
  DROP TYPE "enum_layouts_blocks_container_gap";
  DROP TYPE "enum_layouts_blocks_container_align";
  DROP TYPE "enum_layouts_blocks_container_justify";
  DROP TYPE "enum_layouts_blocks_container_width";
  DROP TYPE "enum_layouts_blocks_container_background";
  DROP TYPE "enum__layouts_v_blocks_container_3_columns";
  DROP TYPE "enum__layouts_v_blocks_container_3_gap";
  DROP TYPE "enum__layouts_v_blocks_container_3_align";
  DROP TYPE "enum__layouts_v_blocks_container_3_justify";
  DROP TYPE "enum__layouts_v_blocks_container_3_width";
  DROP TYPE "enum__layouts_v_blocks_container_3_background";
  DROP TYPE "enum__layouts_v_blocks_container_2_columns";
  DROP TYPE "enum__layouts_v_blocks_container_2_gap";
  DROP TYPE "enum__layouts_v_blocks_container_2_align";
  DROP TYPE "enum__layouts_v_blocks_container_2_justify";
  DROP TYPE "enum__layouts_v_blocks_container_2_width";
  DROP TYPE "enum__layouts_v_blocks_container_2_background";
  DROP TYPE "enum__layouts_v_blocks_container_columns";
  DROP TYPE "enum__layouts_v_blocks_container_gap";
  DROP TYPE "enum__layouts_v_blocks_container_align";
  DROP TYPE "enum__layouts_v_blocks_container_justify";
  DROP TYPE "enum__layouts_v_blocks_container_width";
  DROP TYPE "enum__layouts_v_blocks_container_background";`)
}
