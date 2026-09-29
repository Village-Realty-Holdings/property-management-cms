import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_form_kind" AS ENUM('inquiry', 'ownerLead', 'contact');
  CREATE TYPE "public"."enum__pages_v_blocks_form_kind" AS ENUM('inquiry', 'ownerLead', 'contact');
  CREATE TYPE "public"."enum_sites_legacy_urls_property_pattern" AS ENUM('none', 'cabin-rentals', 'property-details', 'rentals', 'root');
  CREATE TYPE "public"."enum_site_readers_purpose" AS ENUM('published', 'preview');
  CREATE TABLE "pages_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"kind" "enum_pages_blocks_form_kind" DEFAULT 'contact',
  	"submit_label" varchar,
  	"success_message" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"kind" "enum__pages_v_blocks_form_kind" DEFAULT 'contact',
  	"submit_label" varchar,
  	"success_message" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "sites_legacy_urls_redirects" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to" varchar NOT NULL
  );
  
  DROP INDEX "site_readers_site_idx";
  ALTER TABLE "sites" ADD COLUMN "legacy_urls_property_pattern" "enum_sites_legacy_urls_property_pattern" DEFAULT 'none';
  ALTER TABLE "site_readers" ADD COLUMN "purpose" "enum_site_readers_purpose" DEFAULT 'published';
  ALTER TABLE "pages_blocks_form" ADD CONSTRAINT "pages_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_form" ADD CONSTRAINT "_pages_v_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sites_legacy_urls_redirects" ADD CONSTRAINT "sites_legacy_urls_redirects_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_form_order_idx" ON "pages_blocks_form" USING btree ("_order");
  CREATE INDEX "pages_blocks_form_parent_id_idx" ON "pages_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_form_path_idx" ON "pages_blocks_form" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_form_order_idx" ON "_pages_v_blocks_form" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_form_parent_id_idx" ON "_pages_v_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_form_path_idx" ON "_pages_v_blocks_form" USING btree ("_path");
  CREATE INDEX "sites_legacy_urls_redirects_order_idx" ON "sites_legacy_urls_redirects" USING btree ("_order");
  CREATE INDEX "sites_legacy_urls_redirects_parent_id_idx" ON "sites_legacy_urls_redirects" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_purpose_idx" ON "site_readers" USING btree ("site_id","purpose");
  CREATE INDEX "site_readers_site_idx" ON "site_readers" USING btree ("site_id");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sites_legacy_urls_redirects" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_form" CASCADE;
  DROP TABLE "_pages_v_blocks_form" CASCADE;
  DROP TABLE "sites_legacy_urls_redirects" CASCADE;
  DROP INDEX "site_purpose_idx";
  DROP INDEX "site_readers_site_idx";
  CREATE UNIQUE INDEX "site_readers_site_idx" ON "site_readers" USING btree ("site_id");
  ALTER TABLE "sites" DROP COLUMN "legacy_urls_property_pattern";
  ALTER TABLE "site_readers" DROP COLUMN "purpose";
  DROP TYPE "public"."enum_pages_blocks_form_kind";
  DROP TYPE "public"."enum__pages_v_blocks_form_kind";
  DROP TYPE "public"."enum_sites_legacy_urls_property_pattern";
  DROP TYPE "public"."enum_site_readers_purpose";`)
}
