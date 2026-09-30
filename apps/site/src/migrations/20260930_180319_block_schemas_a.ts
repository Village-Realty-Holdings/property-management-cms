import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { setSiteSchema } from '../setSiteSchema'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_pages_blocks_steps_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_features_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_amenities_variant" AS ENUM('mosaic', 'icons');
  CREATE TYPE "enum_pages_blocks_amenities_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_stats_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_image_text_image_side" AS ENUM('left', 'right');
  CREATE TYPE "enum_pages_blocks_image_text_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_trust_strip_variant" AS ENUM('items', 'logos');
  CREATE TYPE "enum_pages_blocks_trust_strip_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_steps_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_features_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_amenities_variant" AS ENUM('mosaic', 'icons');
  CREATE TYPE "enum__pages_v_blocks_amenities_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_stats_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_image_text_image_side" AS ENUM('left', 'right');
  CREATE TYPE "enum__pages_v_blocks_image_text_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_trust_strip_variant" AS ENUM('items', 'logos');
  CREATE TYPE "enum__pages_v_blocks_trust_strip_background" AS ENUM('default', 'muted', 'primary', 'dark');
  ALTER TYPE "enum_pages_blocks_call_to_action_style" ADD VALUE 'dark';
  ALTER TYPE "enum__pages_v_blocks_call_to_action_style" ADD VALUE 'dark';
  ALTER TYPE "enum_layouts_blocks_call_to_action_style" ADD VALUE 'dark';
  ALTER TYPE "enum__layouts_v_blocks_call_to_action_style" ADD VALUE 'dark';
  CREATE TABLE "pages_blocks_hero_trust_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"stat" varchar,
  	"text" varchar,
  	"icon" varchar
  );
  
  CREATE TABLE "pages_blocks_search_hero_locations" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar
  );
  
  CREATE TABLE "pages_blocks_search_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"accent_word" varchar,
  	"subheading" varchar,
  	"image_id" integer,
  	"search_label" varchar DEFAULT 'Search',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_steps_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"background" "enum_pages_blocks_steps_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_features_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"background" "enum_pages_blocks_features_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_amenities_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"image_id" integer,
  	"icon" varchar
  );
  
  CREATE TABLE "pages_blocks_amenities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"variant" "enum_pages_blocks_amenities_variant" DEFAULT 'icons',
  	"background" "enum_pages_blocks_amenities_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_stats_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "pages_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"background" "enum_pages_blocks_stats_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_image_text_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"caption" varchar,
  	"image_side" "enum_pages_blocks_image_text_image_side" DEFAULT 'left',
  	"background" "enum_pages_blocks_image_text_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_trust_strip_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"stat" varchar,
  	"text" varchar,
  	"icon" varchar
  );
  
  CREATE TABLE "pages_blocks_trust_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "pages_blocks_trust_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"variant" "enum_pages_blocks_trust_strip_variant" DEFAULT 'items',
  	"background" "enum_pages_blocks_trust_strip_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_trust_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"stat" varchar,
  	"text" varchar,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_search_hero_locations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_search_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"accent_word" varchar,
  	"subheading" varchar,
  	"image_id" integer,
  	"search_label" varchar DEFAULT 'Search',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_steps_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"background" "enum__pages_v_blocks_steps_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_features_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"background" "enum__pages_v_blocks_features_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_amenities_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"image_id" integer,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_amenities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"variant" "enum__pages_v_blocks_amenities_variant" DEFAULT 'icons',
  	"background" "enum__pages_v_blocks_amenities_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_stats_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"background" "enum__pages_v_blocks_stats_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_image_text_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"caption" varchar,
  	"image_side" "enum__pages_v_blocks_image_text_image_side" DEFAULT 'left',
  	"background" "enum__pages_v_blocks_image_text_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_trust_strip_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"stat" varchar,
  	"text" varchar,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_trust_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_trust_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"variant" "enum__pages_v_blocks_trust_strip_variant" DEFAULT 'items',
  	"background" "enum__pages_v_blocks_trust_strip_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "accent_word" varchar;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "accent_word" varchar;
  ALTER TABLE "pages_blocks_hero_trust_strip" ADD CONSTRAINT "pages_blocks_hero_trust_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_search_hero_locations" ADD CONSTRAINT "pages_blocks_search_hero_locations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_search_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_search_hero" ADD CONSTRAINT "pages_blocks_search_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_search_hero" ADD CONSTRAINT "pages_blocks_search_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_steps_steps" ADD CONSTRAINT "pages_blocks_steps_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_steps" ADD CONSTRAINT "pages_blocks_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_features_features" ADD CONSTRAINT "pages_blocks_features_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_features" ADD CONSTRAINT "pages_blocks_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_amenities_items" ADD CONSTRAINT "pages_blocks_amenities_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_amenities_items" ADD CONSTRAINT "pages_blocks_amenities_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_amenities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_amenities" ADD CONSTRAINT "pages_blocks_amenities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats_stats" ADD CONSTRAINT "pages_blocks_stats_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats" ADD CONSTRAINT "pages_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text_points" ADD CONSTRAINT "pages_blocks_image_text_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_image_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text" ADD CONSTRAINT "pages_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text" ADD CONSTRAINT "pages_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_trust_strip_items" ADD CONSTRAINT "pages_blocks_trust_strip_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_trust_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_trust_strip_logos" ADD CONSTRAINT "pages_blocks_trust_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_trust_strip_logos" ADD CONSTRAINT "pages_blocks_trust_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_trust_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_trust_strip" ADD CONSTRAINT "pages_blocks_trust_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_trust_strip" ADD CONSTRAINT "_pages_v_blocks_hero_trust_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_search_hero_locations" ADD CONSTRAINT "_pages_v_blocks_search_hero_locations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_search_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_search_hero" ADD CONSTRAINT "_pages_v_blocks_search_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_search_hero" ADD CONSTRAINT "_pages_v_blocks_search_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_steps_steps" ADD CONSTRAINT "_pages_v_blocks_steps_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_steps" ADD CONSTRAINT "_pages_v_blocks_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_features_features" ADD CONSTRAINT "_pages_v_blocks_features_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_features" ADD CONSTRAINT "_pages_v_blocks_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_amenities_items" ADD CONSTRAINT "_pages_v_blocks_amenities_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_amenities_items" ADD CONSTRAINT "_pages_v_blocks_amenities_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_amenities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_amenities" ADD CONSTRAINT "_pages_v_blocks_amenities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats_stats" ADD CONSTRAINT "_pages_v_blocks_stats_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats" ADD CONSTRAINT "_pages_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text_points" ADD CONSTRAINT "_pages_v_blocks_image_text_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_image_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text" ADD CONSTRAINT "_pages_v_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text" ADD CONSTRAINT "_pages_v_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_trust_strip_items" ADD CONSTRAINT "_pages_v_blocks_trust_strip_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_trust_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_trust_strip_logos" ADD CONSTRAINT "_pages_v_blocks_trust_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_trust_strip_logos" ADD CONSTRAINT "_pages_v_blocks_trust_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_trust_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_trust_strip" ADD CONSTRAINT "_pages_v_blocks_trust_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_trust_strip_order_idx" ON "pages_blocks_hero_trust_strip" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_trust_strip_parent_id_idx" ON "pages_blocks_hero_trust_strip" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_search_hero_locations_order_idx" ON "pages_blocks_search_hero_locations" USING btree ("_order");
  CREATE INDEX "pages_blocks_search_hero_locations_parent_id_idx" ON "pages_blocks_search_hero_locations" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_search_hero_order_idx" ON "pages_blocks_search_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_search_hero_parent_id_idx" ON "pages_blocks_search_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_search_hero_path_idx" ON "pages_blocks_search_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_search_hero_image_idx" ON "pages_blocks_search_hero" USING btree ("image_id");
  CREATE INDEX "pages_blocks_steps_steps_order_idx" ON "pages_blocks_steps_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_steps_steps_parent_id_idx" ON "pages_blocks_steps_steps" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_steps_order_idx" ON "pages_blocks_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_steps_parent_id_idx" ON "pages_blocks_steps" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_steps_path_idx" ON "pages_blocks_steps" USING btree ("_path");
  CREATE INDEX "pages_blocks_features_features_order_idx" ON "pages_blocks_features_features" USING btree ("_order");
  CREATE INDEX "pages_blocks_features_features_parent_id_idx" ON "pages_blocks_features_features" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_features_order_idx" ON "pages_blocks_features" USING btree ("_order");
  CREATE INDEX "pages_blocks_features_parent_id_idx" ON "pages_blocks_features" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_features_path_idx" ON "pages_blocks_features" USING btree ("_path");
  CREATE INDEX "pages_blocks_amenities_items_order_idx" ON "pages_blocks_amenities_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_amenities_items_parent_id_idx" ON "pages_blocks_amenities_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_amenities_items_image_idx" ON "pages_blocks_amenities_items" USING btree ("image_id");
  CREATE INDEX "pages_blocks_amenities_order_idx" ON "pages_blocks_amenities" USING btree ("_order");
  CREATE INDEX "pages_blocks_amenities_parent_id_idx" ON "pages_blocks_amenities" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_amenities_path_idx" ON "pages_blocks_amenities" USING btree ("_path");
  CREATE INDEX "pages_blocks_stats_stats_order_idx" ON "pages_blocks_stats_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_stats_parent_id_idx" ON "pages_blocks_stats_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_order_idx" ON "pages_blocks_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_parent_id_idx" ON "pages_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_path_idx" ON "pages_blocks_stats" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_text_points_order_idx" ON "pages_blocks_image_text_points" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_text_points_parent_id_idx" ON "pages_blocks_image_text_points" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_text_order_idx" ON "pages_blocks_image_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_text_parent_id_idx" ON "pages_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_text_path_idx" ON "pages_blocks_image_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_text_image_idx" ON "pages_blocks_image_text" USING btree ("image_id");
  CREATE INDEX "pages_blocks_trust_strip_items_order_idx" ON "pages_blocks_trust_strip_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_trust_strip_items_parent_id_idx" ON "pages_blocks_trust_strip_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_trust_strip_logos_order_idx" ON "pages_blocks_trust_strip_logos" USING btree ("_order");
  CREATE INDEX "pages_blocks_trust_strip_logos_parent_id_idx" ON "pages_blocks_trust_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_trust_strip_logos_image_idx" ON "pages_blocks_trust_strip_logos" USING btree ("image_id");
  CREATE INDEX "pages_blocks_trust_strip_order_idx" ON "pages_blocks_trust_strip" USING btree ("_order");
  CREATE INDEX "pages_blocks_trust_strip_parent_id_idx" ON "pages_blocks_trust_strip" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_trust_strip_path_idx" ON "pages_blocks_trust_strip" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_trust_strip_order_idx" ON "_pages_v_blocks_hero_trust_strip" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_trust_strip_parent_id_idx" ON "_pages_v_blocks_hero_trust_strip" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_search_hero_locations_order_idx" ON "_pages_v_blocks_search_hero_locations" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_search_hero_locations_parent_id_idx" ON "_pages_v_blocks_search_hero_locations" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_search_hero_order_idx" ON "_pages_v_blocks_search_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_search_hero_parent_id_idx" ON "_pages_v_blocks_search_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_search_hero_path_idx" ON "_pages_v_blocks_search_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_search_hero_image_idx" ON "_pages_v_blocks_search_hero" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_steps_steps_order_idx" ON "_pages_v_blocks_steps_steps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_steps_steps_parent_id_idx" ON "_pages_v_blocks_steps_steps" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_steps_order_idx" ON "_pages_v_blocks_steps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_steps_parent_id_idx" ON "_pages_v_blocks_steps" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_steps_path_idx" ON "_pages_v_blocks_steps" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_features_features_order_idx" ON "_pages_v_blocks_features_features" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_features_features_parent_id_idx" ON "_pages_v_blocks_features_features" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_features_order_idx" ON "_pages_v_blocks_features" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_features_parent_id_idx" ON "_pages_v_blocks_features" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_features_path_idx" ON "_pages_v_blocks_features" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_amenities_items_order_idx" ON "_pages_v_blocks_amenities_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_amenities_items_parent_id_idx" ON "_pages_v_blocks_amenities_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_amenities_items_image_idx" ON "_pages_v_blocks_amenities_items" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_amenities_order_idx" ON "_pages_v_blocks_amenities" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_amenities_parent_id_idx" ON "_pages_v_blocks_amenities" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_amenities_path_idx" ON "_pages_v_blocks_amenities" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_stats_stats_order_idx" ON "_pages_v_blocks_stats_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_stats_parent_id_idx" ON "_pages_v_blocks_stats_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_order_idx" ON "_pages_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_parent_id_idx" ON "_pages_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_path_idx" ON "_pages_v_blocks_stats" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_text_points_order_idx" ON "_pages_v_blocks_image_text_points" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_image_text_points_parent_id_idx" ON "_pages_v_blocks_image_text_points" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_image_text_order_idx" ON "_pages_v_blocks_image_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_image_text_parent_id_idx" ON "_pages_v_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_image_text_path_idx" ON "_pages_v_blocks_image_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_text_image_idx" ON "_pages_v_blocks_image_text" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_trust_strip_items_order_idx" ON "_pages_v_blocks_trust_strip_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_trust_strip_items_parent_id_idx" ON "_pages_v_blocks_trust_strip_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_trust_strip_logos_order_idx" ON "_pages_v_blocks_trust_strip_logos" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_trust_strip_logos_parent_id_idx" ON "_pages_v_blocks_trust_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_trust_strip_logos_image_idx" ON "_pages_v_blocks_trust_strip_logos" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_trust_strip_order_idx" ON "_pages_v_blocks_trust_strip" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_trust_strip_parent_id_idx" ON "_pages_v_blocks_trust_strip" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_trust_strip_path_idx" ON "_pages_v_blocks_trust_strip" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   DROP TABLE "pages_blocks_hero_trust_strip" CASCADE;
  DROP TABLE "pages_blocks_search_hero_locations" CASCADE;
  DROP TABLE "pages_blocks_search_hero" CASCADE;
  DROP TABLE "pages_blocks_steps_steps" CASCADE;
  DROP TABLE "pages_blocks_steps" CASCADE;
  DROP TABLE "pages_blocks_features_features" CASCADE;
  DROP TABLE "pages_blocks_features" CASCADE;
  DROP TABLE "pages_blocks_amenities_items" CASCADE;
  DROP TABLE "pages_blocks_amenities" CASCADE;
  DROP TABLE "pages_blocks_stats_stats" CASCADE;
  DROP TABLE "pages_blocks_stats" CASCADE;
  DROP TABLE "pages_blocks_image_text_points" CASCADE;
  DROP TABLE "pages_blocks_image_text" CASCADE;
  DROP TABLE "pages_blocks_trust_strip_items" CASCADE;
  DROP TABLE "pages_blocks_trust_strip_logos" CASCADE;
  DROP TABLE "pages_blocks_trust_strip" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_trust_strip" CASCADE;
  DROP TABLE "_pages_v_blocks_search_hero_locations" CASCADE;
  DROP TABLE "_pages_v_blocks_search_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_steps_steps" CASCADE;
  DROP TABLE "_pages_v_blocks_steps" CASCADE;
  DROP TABLE "_pages_v_blocks_features_features" CASCADE;
  DROP TABLE "_pages_v_blocks_features" CASCADE;
  DROP TABLE "_pages_v_blocks_amenities_items" CASCADE;
  DROP TABLE "_pages_v_blocks_amenities" CASCADE;
  DROP TABLE "_pages_v_blocks_stats_stats" CASCADE;
  DROP TABLE "_pages_v_blocks_stats" CASCADE;
  DROP TABLE "_pages_v_blocks_image_text_points" CASCADE;
  DROP TABLE "_pages_v_blocks_image_text" CASCADE;
  DROP TABLE "_pages_v_blocks_trust_strip_items" CASCADE;
  DROP TABLE "_pages_v_blocks_trust_strip_logos" CASCADE;
  DROP TABLE "_pages_v_blocks_trust_strip" CASCADE;
  ALTER TABLE "pages_blocks_call_to_action" ALTER COLUMN "style" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_call_to_action" ALTER COLUMN "style" SET DEFAULT 'primary'::text;
  DROP TYPE "enum_pages_blocks_call_to_action_style";
  CREATE TYPE "enum_pages_blocks_call_to_action_style" AS ENUM('primary', 'secondary', 'inverted');
  ALTER TABLE "pages_blocks_call_to_action" ALTER COLUMN "style" SET DEFAULT 'primary'::"enum_pages_blocks_call_to_action_style";
  ALTER TABLE "pages_blocks_call_to_action" ALTER COLUMN "style" SET DATA TYPE "enum_pages_blocks_call_to_action_style" USING "style"::"enum_pages_blocks_call_to_action_style";
  ALTER TABLE "_pages_v_blocks_call_to_action" ALTER COLUMN "style" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_call_to_action" ALTER COLUMN "style" SET DEFAULT 'primary'::text;
  DROP TYPE "enum__pages_v_blocks_call_to_action_style";
  CREATE TYPE "enum__pages_v_blocks_call_to_action_style" AS ENUM('primary', 'secondary', 'inverted');
  ALTER TABLE "_pages_v_blocks_call_to_action" ALTER COLUMN "style" SET DEFAULT 'primary'::"enum__pages_v_blocks_call_to_action_style";
  ALTER TABLE "_pages_v_blocks_call_to_action" ALTER COLUMN "style" SET DATA TYPE "enum__pages_v_blocks_call_to_action_style" USING "style"::"enum__pages_v_blocks_call_to_action_style";
  ALTER TABLE "layouts_blocks_call_to_action" ALTER COLUMN "style" SET DATA TYPE text;
  ALTER TABLE "layouts_blocks_call_to_action" ALTER COLUMN "style" SET DEFAULT 'primary'::text;
  DROP TYPE "enum_layouts_blocks_call_to_action_style";
  CREATE TYPE "enum_layouts_blocks_call_to_action_style" AS ENUM('primary', 'secondary', 'inverted');
  ALTER TABLE "layouts_blocks_call_to_action" ALTER COLUMN "style" SET DEFAULT 'primary'::"enum_layouts_blocks_call_to_action_style";
  ALTER TABLE "layouts_blocks_call_to_action" ALTER COLUMN "style" SET DATA TYPE "enum_layouts_blocks_call_to_action_style" USING "style"::"enum_layouts_blocks_call_to_action_style";
  ALTER TABLE "_layouts_v_blocks_call_to_action" ALTER COLUMN "style" SET DATA TYPE text;
  ALTER TABLE "_layouts_v_blocks_call_to_action" ALTER COLUMN "style" SET DEFAULT 'primary'::text;
  DROP TYPE "enum__layouts_v_blocks_call_to_action_style";
  CREATE TYPE "enum__layouts_v_blocks_call_to_action_style" AS ENUM('primary', 'secondary', 'inverted');
  ALTER TABLE "_layouts_v_blocks_call_to_action" ALTER COLUMN "style" SET DEFAULT 'primary'::"enum__layouts_v_blocks_call_to_action_style";
  ALTER TABLE "_layouts_v_blocks_call_to_action" ALTER COLUMN "style" SET DATA TYPE "enum__layouts_v_blocks_call_to_action_style" USING "style"::"enum__layouts_v_blocks_call_to_action_style";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "eyebrow";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "accent_word";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "eyebrow";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "accent_word";
  DROP TYPE "enum_pages_blocks_steps_background";
  DROP TYPE "enum_pages_blocks_features_background";
  DROP TYPE "enum_pages_blocks_amenities_variant";
  DROP TYPE "enum_pages_blocks_amenities_background";
  DROP TYPE "enum_pages_blocks_stats_background";
  DROP TYPE "enum_pages_blocks_image_text_image_side";
  DROP TYPE "enum_pages_blocks_image_text_background";
  DROP TYPE "enum_pages_blocks_trust_strip_variant";
  DROP TYPE "enum_pages_blocks_trust_strip_background";
  DROP TYPE "enum__pages_v_blocks_steps_background";
  DROP TYPE "enum__pages_v_blocks_features_background";
  DROP TYPE "enum__pages_v_blocks_amenities_variant";
  DROP TYPE "enum__pages_v_blocks_amenities_background";
  DROP TYPE "enum__pages_v_blocks_stats_background";
  DROP TYPE "enum__pages_v_blocks_image_text_image_side";
  DROP TYPE "enum__pages_v_blocks_image_text_background";
  DROP TYPE "enum__pages_v_blocks_trust_strip_variant";
  DROP TYPE "enum__pages_v_blocks_trust_strip_background";`)
}
