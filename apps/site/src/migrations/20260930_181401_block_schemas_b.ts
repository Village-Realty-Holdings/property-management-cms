import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { setSiteSchema } from '../setSiteSchema'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_pages_blocks_featured_rentals_variant" AS ENUM('carousel', 'grid');
  CREATE TYPE "enum_pages_blocks_featured_rentals_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_large_group_rentals_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_rental_grid_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_testimonials_variant" AS ENUM('carousel', 'grid');
  CREATE TYPE "enum_pages_blocks_testimonials_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_owner_band_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_newsletter_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_blog_teaser_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_location_map" AS ENUM('card', 'image');
  CREATE TYPE "enum_pages_blocks_location_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_faq_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_pages_blocks_form_form_fields" AS ENUM('name', 'email', 'phone', 'message', 'propertyAddress', 'dates');
  CREATE TYPE "enum_pages_blocks_form_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_featured_rentals_variant" AS ENUM('carousel', 'grid');
  CREATE TYPE "enum__pages_v_blocks_featured_rentals_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_large_group_rentals_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_rental_grid_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_testimonials_variant" AS ENUM('carousel', 'grid');
  CREATE TYPE "enum__pages_v_blocks_testimonials_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_owner_band_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_newsletter_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_blog_teaser_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_location_map" AS ENUM('card', 'image');
  CREATE TYPE "enum__pages_v_blocks_location_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_faq_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_form_form_fields" AS ENUM('name', 'email', 'phone', 'message', 'propertyAddress', 'dates');
  CREATE TYPE "enum__pages_v_blocks_form_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum_layouts_blocks_newsletter_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__layouts_v_blocks_newsletter_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TABLE "pages_blocks_featured_rentals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"count" numeric DEFAULT 3,
  	"variant" "enum_pages_blocks_featured_rentals_variant" DEFAULT 'grid',
  	"background" "enum_pages_blocks_featured_rentals_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_large_group_rentals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"min_sleeps" numeric DEFAULT 12,
  	"background" "enum_pages_blocks_large_group_rentals_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_rental_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"page_size" numeric DEFAULT 6,
  	"background" "enum_pages_blocks_rental_grid_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_testimonials_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"name" varchar,
  	"role" varchar,
  	"rating" numeric DEFAULT 5
  );
  
  CREATE TABLE "pages_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"variant" "enum_pages_blocks_testimonials_variant" DEFAULT 'carousel',
  	"background" "enum_pages_blocks_testimonials_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_owner_band_benefits" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_owner_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"pitch" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"background" "enum_pages_blocks_owner_band_background" DEFAULT 'dark',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"email_placeholder" varchar DEFAULT 'Your email address',
  	"button_label" varchar DEFAULT 'Subscribe',
  	"background" "enum_pages_blocks_newsletter_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_blog_teaser" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"all_posts_link_label" varchar,
  	"all_posts_link_href" varchar,
  	"background" "enum_pages_blocks_blog_teaser_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_location" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"address" varchar,
  	"text" varchar,
  	"map" "enum_pages_blocks_location_map" DEFAULT 'card',
  	"map_image_id" integer,
  	"background" "enum_pages_blocks_location_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"background" "enum_pages_blocks_faq_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_form_form_fields" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_pages_blocks_form_form_fields",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"submit_label" varchar DEFAULT 'Send',
  	"success_message" varchar DEFAULT 'Thank you. We have received your message and will be in touch soon.',
  	"background" "enum_pages_blocks_form_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_featured_rentals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"count" numeric DEFAULT 3,
  	"variant" "enum__pages_v_blocks_featured_rentals_variant" DEFAULT 'grid',
  	"background" "enum__pages_v_blocks_featured_rentals_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_large_group_rentals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"min_sleeps" numeric DEFAULT 12,
  	"background" "enum__pages_v_blocks_large_group_rentals_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rental_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"page_size" numeric DEFAULT 6,
  	"background" "enum__pages_v_blocks_rental_grid_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_testimonials_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"name" varchar,
  	"role" varchar,
  	"rating" numeric DEFAULT 5,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"variant" "enum__pages_v_blocks_testimonials_variant" DEFAULT 'carousel',
  	"background" "enum__pages_v_blocks_testimonials_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_owner_band_benefits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_owner_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"pitch" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"background" "enum__pages_v_blocks_owner_band_background" DEFAULT 'dark',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"email_placeholder" varchar DEFAULT 'Your email address',
  	"button_label" varchar DEFAULT 'Subscribe',
  	"background" "enum__pages_v_blocks_newsletter_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_blog_teaser" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"all_posts_link_label" varchar,
  	"all_posts_link_href" varchar,
  	"background" "enum__pages_v_blocks_blog_teaser_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_location" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"address" varchar,
  	"text" varchar,
  	"map" "enum__pages_v_blocks_location_map" DEFAULT 'card',
  	"map_image_id" integer,
  	"background" "enum__pages_v_blocks_location_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"background" "enum__pages_v_blocks_faq_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_form_form_fields" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__pages_v_blocks_form_form_fields",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"submit_label" varchar DEFAULT 'Send',
  	"success_message" varchar DEFAULT 'Thank you. We have received your message and will be in touch soon.',
  	"background" "enum__pages_v_blocks_form_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "layouts_blocks_newsletter" ADD COLUMN "background" "enum_layouts_blocks_newsletter_background" DEFAULT 'default';
  ALTER TABLE "_layouts_v_blocks_newsletter" ADD COLUMN "background" "enum__layouts_v_blocks_newsletter_background" DEFAULT 'default';
  ALTER TABLE "pages_blocks_featured_rentals" ADD CONSTRAINT "pages_blocks_featured_rentals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_large_group_rentals" ADD CONSTRAINT "pages_blocks_large_group_rentals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rental_grid" ADD CONSTRAINT "pages_blocks_rental_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonials_testimonials" ADD CONSTRAINT "pages_blocks_testimonials_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_testimonials" ADD CONSTRAINT "pages_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_owner_band_benefits" ADD CONSTRAINT "pages_blocks_owner_band_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_owner_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_owner_band" ADD CONSTRAINT "pages_blocks_owner_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_newsletter" ADD CONSTRAINT "pages_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_blog_teaser" ADD CONSTRAINT "pages_blocks_blog_teaser_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_location" ADD CONSTRAINT "pages_blocks_location_map_image_id_media_id_fk" FOREIGN KEY ("map_image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_location" ADD CONSTRAINT "pages_blocks_location_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_questions" ADD CONSTRAINT "pages_blocks_faq_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_form_form_fields" ADD CONSTRAINT "pages_blocks_form_form_fields_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "pages_blocks_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_form" ADD CONSTRAINT "pages_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_featured_rentals" ADD CONSTRAINT "_pages_v_blocks_featured_rentals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_large_group_rentals" ADD CONSTRAINT "_pages_v_blocks_large_group_rentals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rental_grid" ADD CONSTRAINT "_pages_v_blocks_rental_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonials_testimonials" ADD CONSTRAINT "_pages_v_blocks_testimonials_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_testimonials" ADD CONSTRAINT "_pages_v_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_owner_band_benefits" ADD CONSTRAINT "_pages_v_blocks_owner_band_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_owner_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_owner_band" ADD CONSTRAINT "_pages_v_blocks_owner_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_newsletter" ADD CONSTRAINT "_pages_v_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_blog_teaser" ADD CONSTRAINT "_pages_v_blocks_blog_teaser_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_location" ADD CONSTRAINT "_pages_v_blocks_location_map_image_id_media_id_fk" FOREIGN KEY ("map_image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_location" ADD CONSTRAINT "_pages_v_blocks_location_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_questions" ADD CONSTRAINT "_pages_v_blocks_faq_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_form_form_fields" ADD CONSTRAINT "_pages_v_blocks_form_form_fields_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "_pages_v_blocks_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_form" ADD CONSTRAINT "_pages_v_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_featured_rentals_order_idx" ON "pages_blocks_featured_rentals" USING btree ("_order");
  CREATE INDEX "pages_blocks_featured_rentals_parent_id_idx" ON "pages_blocks_featured_rentals" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_featured_rentals_path_idx" ON "pages_blocks_featured_rentals" USING btree ("_path");
  CREATE INDEX "pages_blocks_large_group_rentals_order_idx" ON "pages_blocks_large_group_rentals" USING btree ("_order");
  CREATE INDEX "pages_blocks_large_group_rentals_parent_id_idx" ON "pages_blocks_large_group_rentals" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_large_group_rentals_path_idx" ON "pages_blocks_large_group_rentals" USING btree ("_path");
  CREATE INDEX "pages_blocks_rental_grid_order_idx" ON "pages_blocks_rental_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_rental_grid_parent_id_idx" ON "pages_blocks_rental_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rental_grid_path_idx" ON "pages_blocks_rental_grid" USING btree ("_path");
  CREATE INDEX "pages_blocks_testimonials_testimonials_order_idx" ON "pages_blocks_testimonials_testimonials" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_testimonials_parent_id_idx" ON "pages_blocks_testimonials_testimonials" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_order_idx" ON "pages_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_parent_id_idx" ON "pages_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_path_idx" ON "pages_blocks_testimonials" USING btree ("_path");
  CREATE INDEX "pages_blocks_owner_band_benefits_order_idx" ON "pages_blocks_owner_band_benefits" USING btree ("_order");
  CREATE INDEX "pages_blocks_owner_band_benefits_parent_id_idx" ON "pages_blocks_owner_band_benefits" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_owner_band_order_idx" ON "pages_blocks_owner_band" USING btree ("_order");
  CREATE INDEX "pages_blocks_owner_band_parent_id_idx" ON "pages_blocks_owner_band" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_owner_band_path_idx" ON "pages_blocks_owner_band" USING btree ("_path");
  CREATE INDEX "pages_blocks_newsletter_order_idx" ON "pages_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "pages_blocks_newsletter_parent_id_idx" ON "pages_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_newsletter_path_idx" ON "pages_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "pages_blocks_blog_teaser_order_idx" ON "pages_blocks_blog_teaser" USING btree ("_order");
  CREATE INDEX "pages_blocks_blog_teaser_parent_id_idx" ON "pages_blocks_blog_teaser" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_blog_teaser_path_idx" ON "pages_blocks_blog_teaser" USING btree ("_path");
  CREATE INDEX "pages_blocks_location_order_idx" ON "pages_blocks_location" USING btree ("_order");
  CREATE INDEX "pages_blocks_location_parent_id_idx" ON "pages_blocks_location" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_location_path_idx" ON "pages_blocks_location" USING btree ("_path");
  CREATE INDEX "pages_blocks_location_map_image_idx" ON "pages_blocks_location" USING btree ("map_image_id");
  CREATE INDEX "pages_blocks_faq_questions_order_idx" ON "pages_blocks_faq_questions" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_questions_parent_id_idx" ON "pages_blocks_faq_questions" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE INDEX "pages_blocks_form_form_fields_order_idx" ON "pages_blocks_form_form_fields" USING btree ("order");
  CREATE INDEX "pages_blocks_form_form_fields_parent_idx" ON "pages_blocks_form_form_fields" USING btree ("parent_id");
  CREATE INDEX "pages_blocks_form_order_idx" ON "pages_blocks_form" USING btree ("_order");
  CREATE INDEX "pages_blocks_form_parent_id_idx" ON "pages_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_form_path_idx" ON "pages_blocks_form" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_featured_rentals_order_idx" ON "_pages_v_blocks_featured_rentals" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_featured_rentals_parent_id_idx" ON "_pages_v_blocks_featured_rentals" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_featured_rentals_path_idx" ON "_pages_v_blocks_featured_rentals" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_large_group_rentals_order_idx" ON "_pages_v_blocks_large_group_rentals" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_large_group_rentals_parent_id_idx" ON "_pages_v_blocks_large_group_rentals" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_large_group_rentals_path_idx" ON "_pages_v_blocks_large_group_rentals" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_rental_grid_order_idx" ON "_pages_v_blocks_rental_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rental_grid_parent_id_idx" ON "_pages_v_blocks_rental_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rental_grid_path_idx" ON "_pages_v_blocks_rental_grid" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_testimonials_testimonials_order_idx" ON "_pages_v_blocks_testimonials_testimonials" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonials_testimonials_parent_id_idx" ON "_pages_v_blocks_testimonials_testimonials" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_order_idx" ON "_pages_v_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonials_parent_id_idx" ON "_pages_v_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_path_idx" ON "_pages_v_blocks_testimonials" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_owner_band_benefits_order_idx" ON "_pages_v_blocks_owner_band_benefits" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_owner_band_benefits_parent_id_idx" ON "_pages_v_blocks_owner_band_benefits" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_owner_band_order_idx" ON "_pages_v_blocks_owner_band" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_owner_band_parent_id_idx" ON "_pages_v_blocks_owner_band" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_owner_band_path_idx" ON "_pages_v_blocks_owner_band" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_newsletter_order_idx" ON "_pages_v_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_newsletter_parent_id_idx" ON "_pages_v_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_newsletter_path_idx" ON "_pages_v_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_blog_teaser_order_idx" ON "_pages_v_blocks_blog_teaser" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_blog_teaser_parent_id_idx" ON "_pages_v_blocks_blog_teaser" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_blog_teaser_path_idx" ON "_pages_v_blocks_blog_teaser" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_location_order_idx" ON "_pages_v_blocks_location" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_location_parent_id_idx" ON "_pages_v_blocks_location" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_location_path_idx" ON "_pages_v_blocks_location" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_location_map_image_idx" ON "_pages_v_blocks_location" USING btree ("map_image_id");
  CREATE INDEX "_pages_v_blocks_faq_questions_order_idx" ON "_pages_v_blocks_faq_questions" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_questions_parent_id_idx" ON "_pages_v_blocks_faq_questions" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_form_form_fields_order_idx" ON "_pages_v_blocks_form_form_fields" USING btree ("order");
  CREATE INDEX "_pages_v_blocks_form_form_fields_parent_idx" ON "_pages_v_blocks_form_form_fields" USING btree ("parent_id");
  CREATE INDEX "_pages_v_blocks_form_order_idx" ON "_pages_v_blocks_form" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_form_parent_id_idx" ON "_pages_v_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_form_path_idx" ON "_pages_v_blocks_form" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   DROP TABLE "pages_blocks_featured_rentals" CASCADE;
  DROP TABLE "pages_blocks_large_group_rentals" CASCADE;
  DROP TABLE "pages_blocks_rental_grid" CASCADE;
  DROP TABLE "pages_blocks_testimonials_testimonials" CASCADE;
  DROP TABLE "pages_blocks_testimonials" CASCADE;
  DROP TABLE "pages_blocks_owner_band_benefits" CASCADE;
  DROP TABLE "pages_blocks_owner_band" CASCADE;
  DROP TABLE "pages_blocks_newsletter" CASCADE;
  DROP TABLE "pages_blocks_blog_teaser" CASCADE;
  DROP TABLE "pages_blocks_location" CASCADE;
  DROP TABLE "pages_blocks_faq_questions" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_form_form_fields" CASCADE;
  DROP TABLE "pages_blocks_form" CASCADE;
  DROP TABLE "_pages_v_blocks_featured_rentals" CASCADE;
  DROP TABLE "_pages_v_blocks_large_group_rentals" CASCADE;
  DROP TABLE "_pages_v_blocks_rental_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_testimonials_testimonials" CASCADE;
  DROP TABLE "_pages_v_blocks_testimonials" CASCADE;
  DROP TABLE "_pages_v_blocks_owner_band_benefits" CASCADE;
  DROP TABLE "_pages_v_blocks_owner_band" CASCADE;
  DROP TABLE "_pages_v_blocks_newsletter" CASCADE;
  DROP TABLE "_pages_v_blocks_blog_teaser" CASCADE;
  DROP TABLE "_pages_v_blocks_location" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_questions" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_form_form_fields" CASCADE;
  DROP TABLE "_pages_v_blocks_form" CASCADE;
  ALTER TABLE "layouts_blocks_newsletter" DROP COLUMN "background";
  ALTER TABLE "_layouts_v_blocks_newsletter" DROP COLUMN "background";
  DROP TYPE "enum_pages_blocks_featured_rentals_variant";
  DROP TYPE "enum_pages_blocks_featured_rentals_background";
  DROP TYPE "enum_pages_blocks_large_group_rentals_background";
  DROP TYPE "enum_pages_blocks_rental_grid_background";
  DROP TYPE "enum_pages_blocks_testimonials_variant";
  DROP TYPE "enum_pages_blocks_testimonials_background";
  DROP TYPE "enum_pages_blocks_owner_band_background";
  DROP TYPE "enum_pages_blocks_newsletter_background";
  DROP TYPE "enum_pages_blocks_blog_teaser_background";
  DROP TYPE "enum_pages_blocks_location_map";
  DROP TYPE "enum_pages_blocks_location_background";
  DROP TYPE "enum_pages_blocks_faq_background";
  DROP TYPE "enum_pages_blocks_form_form_fields";
  DROP TYPE "enum_pages_blocks_form_background";
  DROP TYPE "enum__pages_v_blocks_featured_rentals_variant";
  DROP TYPE "enum__pages_v_blocks_featured_rentals_background";
  DROP TYPE "enum__pages_v_blocks_large_group_rentals_background";
  DROP TYPE "enum__pages_v_blocks_rental_grid_background";
  DROP TYPE "enum__pages_v_blocks_testimonials_variant";
  DROP TYPE "enum__pages_v_blocks_testimonials_background";
  DROP TYPE "enum__pages_v_blocks_owner_band_background";
  DROP TYPE "enum__pages_v_blocks_newsletter_background";
  DROP TYPE "enum__pages_v_blocks_blog_teaser_background";
  DROP TYPE "enum__pages_v_blocks_location_map";
  DROP TYPE "enum__pages_v_blocks_location_background";
  DROP TYPE "enum__pages_v_blocks_faq_background";
  DROP TYPE "enum__pages_v_blocks_form_form_fields";
  DROP TYPE "enum__pages_v_blocks_form_background";
  DROP TYPE "enum_layouts_blocks_newsletter_background";
  DROP TYPE "enum__layouts_v_blocks_newsletter_background";`)
}
