import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_sites_branding_social_platform" AS ENUM('facebook', 'instagram', 'x', 'youtube', 'tiktok');
  CREATE TYPE "public"."enum_sites_branding_font_pairing" AS ENUM('classic', 'modern', 'rustic');
  CREATE TABLE "sites_branding_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_sites_branding_social_platform" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  ALTER TABLE "sites" ADD COLUMN "branding_logo_id" integer;
  ALTER TABLE "sites" ADD COLUMN "branding_primary_color" varchar;
  ALTER TABLE "sites" ADD COLUMN "branding_accent_color" varchar;
  ALTER TABLE "sites" ADD COLUMN "branding_font_pairing" "enum_sites_branding_font_pairing" DEFAULT 'classic';
  ALTER TABLE "sites" ADD COLUMN "branding_tagline" varchar;
  ALTER TABLE "sites" ADD COLUMN "branding_phone" varchar;
  ALTER TABLE "sites" ADD COLUMN "branding_email" varchar;
  ALTER TABLE "sites" ADD COLUMN "branding_address" varchar;
  ALTER TABLE "sites_branding_social" ADD CONSTRAINT "sites_branding_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "sites_branding_social_order_idx" ON "sites_branding_social" USING btree ("_order");
  CREATE INDEX "sites_branding_social_parent_id_idx" ON "sites_branding_social" USING btree ("_parent_id");
  ALTER TABLE "sites" ADD CONSTRAINT "sites_branding_logo_id_media_id_fk" FOREIGN KEY ("branding_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "sites_branding_branding_logo_idx" ON "sites" USING btree ("branding_logo_id");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sites_branding_social" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "sites_branding_social" CASCADE;
  ALTER TABLE "sites" DROP CONSTRAINT "sites_branding_logo_id_media_id_fk";
  
  DROP INDEX "sites_branding_branding_logo_idx";
  ALTER TABLE "sites" DROP COLUMN "branding_logo_id";
  ALTER TABLE "sites" DROP COLUMN "branding_primary_color";
  ALTER TABLE "sites" DROP COLUMN "branding_accent_color";
  ALTER TABLE "sites" DROP COLUMN "branding_font_pairing";
  ALTER TABLE "sites" DROP COLUMN "branding_tagline";
  ALTER TABLE "sites" DROP COLUMN "branding_phone";
  ALTER TABLE "sites" DROP COLUMN "branding_email";
  ALTER TABLE "sites" DROP COLUMN "branding_address";
  DROP TYPE "public"."enum_sites_branding_social_platform";
  DROP TYPE "public"."enum_sites_branding_font_pairing";`)
}
