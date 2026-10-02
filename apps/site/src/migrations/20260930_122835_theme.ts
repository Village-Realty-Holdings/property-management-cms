import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

import { setSiteSchema } from "../setSiteSchema"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_theme_neutral_tint" AS ENUM('neutral', 'warm', 'cool', 'brand');
  CREATE TYPE "enum_theme_heading_weight" AS ENUM('regular', 'medium', 'bold', 'black');
  CREATE TYPE "enum_theme_heading_case" AS ENUM('normal', 'uppercase');
  CREATE TYPE "enum_theme_button_corners" AS ENUM('square', 'soft', 'rounded', 'pill');
  CREATE TYPE "enum_theme_card_corners" AS ENUM('square', 'soft', 'rounded');
  CREATE TYPE "enum_theme_spacing" AS ENUM('compact', 'comfortable', 'spacious');
  CREATE TYPE "enum_theme_shadows" AS ENUM('none', 'subtle', 'lifted');
  CREATE TYPE "enum_theme_button_style" AS ENUM('solid', 'outline');
  CREATE TYPE "enum_theme_button_letters" AS ENUM('normal', 'uppercase', 'title');
  CREATE TYPE "enum_theme_button_weight" AS ENUM('regular', 'medium', 'bold');
  CREATE TYPE "enum_theme_motion" AS ENUM('none', 'subtle', 'lively');
  CREATE TYPE "enum__theme_v_version_neutral_tint" AS ENUM('neutral', 'warm', 'cool', 'brand');
  CREATE TYPE "enum__theme_v_version_heading_weight" AS ENUM('regular', 'medium', 'bold', 'black');
  CREATE TYPE "enum__theme_v_version_heading_case" AS ENUM('normal', 'uppercase');
  CREATE TYPE "enum__theme_v_version_button_corners" AS ENUM('square', 'soft', 'rounded', 'pill');
  CREATE TYPE "enum__theme_v_version_card_corners" AS ENUM('square', 'soft', 'rounded');
  CREATE TYPE "enum__theme_v_version_spacing" AS ENUM('compact', 'comfortable', 'spacious');
  CREATE TYPE "enum__theme_v_version_shadows" AS ENUM('none', 'subtle', 'lifted');
  CREATE TYPE "enum__theme_v_version_button_style" AS ENUM('solid', 'outline');
  CREATE TYPE "enum__theme_v_version_button_letters" AS ENUM('normal', 'uppercase', 'title');
  CREATE TYPE "enum__theme_v_version_button_weight" AS ENUM('regular', 'medium', 'bold');
  CREATE TYPE "enum__theme_v_version_motion" AS ENUM('none', 'subtle', 'lively');
  CREATE TABLE "theme" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"primary" varchar DEFAULT '#283d6b' NOT NULL,
  	"accent" varchar DEFAULT '#f2a65a' NOT NULL,
  	"third" varchar,
  	"text" varchar DEFAULT '#1d2433' NOT NULL,
  	"dark_surface" varchar,
  	"neutral_tint" "enum_theme_neutral_tint" DEFAULT 'brand' NOT NULL,
  	"heading_font" varchar DEFAULT 'built-in:Newsreader' NOT NULL,
  	"body_font" varchar DEFAULT 'built-in:Public Sans' NOT NULL,
  	"heading_weight" "enum_theme_heading_weight" DEFAULT 'medium' NOT NULL,
  	"heading_case" "enum_theme_heading_case" DEFAULT 'normal' NOT NULL,
  	"button_corners" "enum_theme_button_corners" DEFAULT 'pill' NOT NULL,
  	"card_corners" "enum_theme_card_corners" DEFAULT 'soft' NOT NULL,
  	"spacing" "enum_theme_spacing" DEFAULT 'comfortable' NOT NULL,
  	"shadows" "enum_theme_shadows" DEFAULT 'none' NOT NULL,
  	"button_style" "enum_theme_button_style" DEFAULT 'solid' NOT NULL,
  	"button_letters" "enum_theme_button_letters" DEFAULT 'normal' NOT NULL,
  	"button_weight" "enum_theme_button_weight" DEFAULT 'medium' NOT NULL,
  	"motion" "enum_theme_motion" DEFAULT 'lively' NOT NULL,
  	"note" varchar,
  	"change_summary" varchar,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_theme_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_primary" varchar DEFAULT '#283d6b' NOT NULL,
  	"version_accent" varchar DEFAULT '#f2a65a' NOT NULL,
  	"version_third" varchar,
  	"version_text" varchar DEFAULT '#1d2433' NOT NULL,
  	"version_dark_surface" varchar,
  	"version_neutral_tint" "enum__theme_v_version_neutral_tint" DEFAULT 'brand' NOT NULL,
  	"version_heading_font" varchar DEFAULT 'built-in:Newsreader' NOT NULL,
  	"version_body_font" varchar DEFAULT 'built-in:Public Sans' NOT NULL,
  	"version_heading_weight" "enum__theme_v_version_heading_weight" DEFAULT 'medium' NOT NULL,
  	"version_heading_case" "enum__theme_v_version_heading_case" DEFAULT 'normal' NOT NULL,
  	"version_button_corners" "enum__theme_v_version_button_corners" DEFAULT 'pill' NOT NULL,
  	"version_card_corners" "enum__theme_v_version_card_corners" DEFAULT 'soft' NOT NULL,
  	"version_spacing" "enum__theme_v_version_spacing" DEFAULT 'comfortable' NOT NULL,
  	"version_shadows" "enum__theme_v_version_shadows" DEFAULT 'none' NOT NULL,
  	"version_button_style" "enum__theme_v_version_button_style" DEFAULT 'solid' NOT NULL,
  	"version_button_letters" "enum__theme_v_version_button_letters" DEFAULT 'normal' NOT NULL,
  	"version_button_weight" "enum__theme_v_version_button_weight" DEFAULT 'medium' NOT NULL,
  	"version_motion" "enum__theme_v_version_motion" DEFAULT 'lively' NOT NULL,
  	"version_note" varchar,
  	"version_change_summary" varchar,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "theme" ADD CONSTRAINT "theme_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_theme_v" ADD CONSTRAINT "_theme_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "theme_updated_by_idx" ON "theme" USING btree ("updated_by_id");
  CREATE INDEX "_theme_v_version_version_updated_by_idx" ON "_theme_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_theme_v_created_at_idx" ON "_theme_v" USING btree ("created_at");
  CREATE INDEX "_theme_v_updated_at_idx" ON "_theme_v" USING btree ("updated_at");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   DROP TABLE "theme" CASCADE;
  DROP TABLE "_theme_v" CASCADE;
  DROP TYPE "enum_theme_neutral_tint";
  DROP TYPE "enum_theme_heading_weight";
  DROP TYPE "enum_theme_heading_case";
  DROP TYPE "enum_theme_button_corners";
  DROP TYPE "enum_theme_card_corners";
  DROP TYPE "enum_theme_spacing";
  DROP TYPE "enum_theme_shadows";
  DROP TYPE "enum_theme_button_style";
  DROP TYPE "enum_theme_button_letters";
  DROP TYPE "enum_theme_button_weight";
  DROP TYPE "enum_theme_motion";
  DROP TYPE "enum__theme_v_version_neutral_tint";
  DROP TYPE "enum__theme_v_version_heading_weight";
  DROP TYPE "enum__theme_v_version_heading_case";
  DROP TYPE "enum__theme_v_version_button_corners";
  DROP TYPE "enum__theme_v_version_card_corners";
  DROP TYPE "enum__theme_v_version_spacing";
  DROP TYPE "enum__theme_v_version_shadows";
  DROP TYPE "enum__theme_v_version_button_style";
  DROP TYPE "enum__theme_v_version_button_letters";
  DROP TYPE "enum__theme_v_version_button_weight";
  DROP TYPE "enum__theme_v_version_motion";`)
}
