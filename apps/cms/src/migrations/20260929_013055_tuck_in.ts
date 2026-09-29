import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_audience_audience" AS ENUM('owners', 'guests');
  CREATE TYPE "public"."enum_pages_template" AS ENUM('blank', 'tuckIn');
  CREATE TYPE "public"."enum__pages_v_blocks_audience_audience" AS ENUM('owners', 'guests');
  CREATE TYPE "public"."enum__pages_v_version_template" AS ENUM('blank', 'tuckIn');
  CREATE TABLE "pages_blocks_announcement" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"headline" varchar,
  	"subheading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_audience_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" jsonb
  );
  
  CREATE TABLE "pages_blocks_audience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"audience" "enum_pages_blocks_audience_audience" DEFAULT 'guests',
  	"intro" jsonb,
  	"closing" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_contact" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"phone" varchar DEFAULT '{phone}',
  	"email" varchar DEFAULT '{email}',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_announcement" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"headline" varchar,
  	"subheading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_audience_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_audience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"audience" "enum__pages_v_blocks_audience_audience" DEFAULT 'guests',
  	"intro" jsonb,
  	"closing" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_contact" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"phone" varchar DEFAULT '{phone}',
  	"email" varchar DEFAULT '{email}',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "sites_custom_variables" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"value" varchar
  );
  
  ALTER TABLE "sites_forwarding_destinations" ALTER COLUMN "kind" DROP NOT NULL;
  ALTER TABLE "sites_forwarding_destinations" ALTER COLUMN "type" DROP NOT NULL;
  ALTER TABLE "pages" ADD COLUMN "template" "enum_pages_template" DEFAULT 'blank';
  ALTER TABLE "_pages_v" ADD COLUMN "version_template" "enum__pages_v_version_template" DEFAULT 'blank';
  ALTER TABLE "sites" ADD COLUMN "client_name" varchar;
  ALTER TABLE "sites" ADD COLUMN "client_website" varchar;
  ALTER TABLE "sites" ADD COLUMN "sections_properties" boolean DEFAULT true;
  ALTER TABLE "sites" ADD COLUMN "sections_inbox" boolean DEFAULT true;
  ALTER TABLE "sites" ADD COLUMN "sections_guides" boolean DEFAULT true;
  ALTER TABLE "sites" ADD COLUMN "sections_curated_lists" boolean DEFAULT true;
  ALTER TABLE "pages_blocks_announcement" ADD CONSTRAINT "pages_blocks_announcement_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_audience_points" ADD CONSTRAINT "pages_blocks_audience_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_audience"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_audience" ADD CONSTRAINT "pages_blocks_audience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact" ADD CONSTRAINT "pages_blocks_contact_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_announcement" ADD CONSTRAINT "_pages_v_blocks_announcement_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_audience_points" ADD CONSTRAINT "_pages_v_blocks_audience_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_audience"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_audience" ADD CONSTRAINT "_pages_v_blocks_audience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact" ADD CONSTRAINT "_pages_v_blocks_contact_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sites_custom_variables" ADD CONSTRAINT "sites_custom_variables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_announcement_order_idx" ON "pages_blocks_announcement" USING btree ("_order");
  CREATE INDEX "pages_blocks_announcement_parent_id_idx" ON "pages_blocks_announcement" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_announcement_path_idx" ON "pages_blocks_announcement" USING btree ("_path");
  CREATE INDEX "pages_blocks_audience_points_order_idx" ON "pages_blocks_audience_points" USING btree ("_order");
  CREATE INDEX "pages_blocks_audience_points_parent_id_idx" ON "pages_blocks_audience_points" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_audience_order_idx" ON "pages_blocks_audience" USING btree ("_order");
  CREATE INDEX "pages_blocks_audience_parent_id_idx" ON "pages_blocks_audience" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_audience_path_idx" ON "pages_blocks_audience" USING btree ("_path");
  CREATE INDEX "pages_blocks_contact_order_idx" ON "pages_blocks_contact" USING btree ("_order");
  CREATE INDEX "pages_blocks_contact_parent_id_idx" ON "pages_blocks_contact" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_contact_path_idx" ON "pages_blocks_contact" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_announcement_order_idx" ON "_pages_v_blocks_announcement" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_announcement_parent_id_idx" ON "_pages_v_blocks_announcement" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_announcement_path_idx" ON "_pages_v_blocks_announcement" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_audience_points_order_idx" ON "_pages_v_blocks_audience_points" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_audience_points_parent_id_idx" ON "_pages_v_blocks_audience_points" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_audience_order_idx" ON "_pages_v_blocks_audience" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_audience_parent_id_idx" ON "_pages_v_blocks_audience" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_audience_path_idx" ON "_pages_v_blocks_audience" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_contact_order_idx" ON "_pages_v_blocks_contact" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_contact_parent_id_idx" ON "_pages_v_blocks_contact" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_path_idx" ON "_pages_v_blocks_contact" USING btree ("_path");
  CREATE INDEX "sites_custom_variables_order_idx" ON "sites_custom_variables" USING btree ("_order");
  CREATE INDEX "sites_custom_variables_parent_id_idx" ON "sites_custom_variables" USING btree ("_parent_id");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_announcement" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_audience_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_audience" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_contact" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_announcement" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_audience_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_audience" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_contact" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sites_custom_variables" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_announcement" CASCADE;
  DROP TABLE "pages_blocks_audience_points" CASCADE;
  DROP TABLE "pages_blocks_audience" CASCADE;
  DROP TABLE "pages_blocks_contact" CASCADE;
  DROP TABLE "_pages_v_blocks_announcement" CASCADE;
  DROP TABLE "_pages_v_blocks_audience_points" CASCADE;
  DROP TABLE "_pages_v_blocks_audience" CASCADE;
  DROP TABLE "_pages_v_blocks_contact" CASCADE;
  DROP TABLE "sites_custom_variables" CASCADE;
  ALTER TABLE "sites_forwarding_destinations" ALTER COLUMN "kind" SET NOT NULL;
  ALTER TABLE "sites_forwarding_destinations" ALTER COLUMN "type" SET NOT NULL;
  ALTER TABLE "pages" DROP COLUMN "template";
  ALTER TABLE "_pages_v" DROP COLUMN "version_template";
  ALTER TABLE "sites" DROP COLUMN "client_name";
  ALTER TABLE "sites" DROP COLUMN "client_website";
  ALTER TABLE "sites" DROP COLUMN "sections_properties";
  ALTER TABLE "sites" DROP COLUMN "sections_inbox";
  ALTER TABLE "sites" DROP COLUMN "sections_guides";
  ALTER TABLE "sites" DROP COLUMN "sections_curated_lists";
  DROP TYPE "public"."enum_pages_blocks_audience_audience";
  DROP TYPE "public"."enum_pages_template";
  DROP TYPE "public"."enum__pages_v_blocks_audience_audience";
  DROP TYPE "public"."enum__pages_v_version_template";`)
}
