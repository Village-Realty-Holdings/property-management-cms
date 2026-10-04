import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

import { setSiteSchema } from "../setSiteSchema"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_layouts_blocks_logo_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum_layouts_blocks_navigation_items_children_link_type" AS ENUM('page', 'url');
  CREATE TYPE "enum_layouts_blocks_navigation_items_link_type" AS ENUM('page', 'url');
  CREATE TYPE "enum_layouts_blocks_navigation_items_display" AS ENUM('dropdown', 'mega');
  CREATE TYPE "enum_layouts_blocks_utility_strip_links_link_type" AS ENUM('page', 'url');
  CREATE TYPE "enum_layouts_blocks_footer_columns_columns_links_link_type" AS ENUM('page', 'url');
  CREATE TYPE "enum_layouts_blocks_footer_columns_columns_content" AS ENUM('links', 'address', 'hours', 'social');
  CREATE TYPE "enum_layouts_blocks_legal_bar_links_link_type" AS ENUM('page', 'url');
  CREATE TYPE "enum_layouts_blocks_call_to_action_style" AS ENUM('primary', 'secondary', 'inverted');
  CREATE TYPE "enum__layouts_v_blocks_logo_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "enum__layouts_v_blocks_navigation_items_children_link_type" AS ENUM('page', 'url');
  CREATE TYPE "enum__layouts_v_blocks_navigation_items_link_type" AS ENUM('page', 'url');
  CREATE TYPE "enum__layouts_v_blocks_navigation_items_display" AS ENUM('dropdown', 'mega');
  CREATE TYPE "enum__layouts_v_blocks_utility_strip_links_link_type" AS ENUM('page', 'url');
  CREATE TYPE "enum__layouts_v_blocks_footer_columns_columns_links_link_type" AS ENUM('page', 'url');
  CREATE TYPE "enum__layouts_v_blocks_footer_columns_columns_content" AS ENUM('links', 'address', 'hours', 'social');
  CREATE TYPE "enum__layouts_v_blocks_legal_bar_links_link_type" AS ENUM('page', 'url');
  CREATE TYPE "enum__layouts_v_blocks_call_to_action_style" AS ENUM('primary', 'secondary', 'inverted');
  CREATE TABLE "layouts_blocks_logo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"size" "enum_layouts_blocks_logo_size" DEFAULT 'medium' NOT NULL,
  	"show_tagline" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "layouts_blocks_navigation_items_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_type" "enum_layouts_blocks_navigation_items_children_link_type" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"column" varchar
  );
  
  CREATE TABLE "layouts_blocks_navigation_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_type" "enum_layouts_blocks_navigation_items_link_type" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"display" "enum_layouts_blocks_navigation_items_display" DEFAULT 'dropdown'
  );
  
  CREATE TABLE "layouts_blocks_navigation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "layouts_blocks_header_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"show_phone" boolean DEFAULT true,
  	"phone" varchar,
  	"button_label" varchar,
  	"button_href" varchar,
  	"login_label" varchar,
  	"login_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "layouts_blocks_utility_strip_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_type" "enum_layouts_blocks_utility_strip_links_link_type" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_url" varchar
  );
  
  CREATE TABLE "layouts_blocks_utility_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "layouts_blocks_footer_columns_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_type" "enum_layouts_blocks_footer_columns_columns_links_link_type" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_url" varchar
  );
  
  CREATE TABLE "layouts_blocks_footer_columns_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL,
  	"content" "enum_layouts_blocks_footer_columns_columns_content" DEFAULT 'links' NOT NULL,
  	"address" varchar,
  	"hours" varchar
  );
  
  CREATE TABLE "layouts_blocks_footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "layouts_blocks_legal_bar_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_type" "enum_layouts_blocks_legal_bar_links_link_type" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_url" varchar
  );
  
  CREATE TABLE "layouts_blocks_legal_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar DEFAULT '© {year} {name}' NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "layouts_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL,
  	"text" varchar,
  	"email_placeholder" varchar DEFAULT 'Your email address',
  	"button_label" varchar DEFAULT 'Subscribe' NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "layouts_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL,
  	"body" varchar,
  	"button_label" varchar,
  	"button_href" varchar,
  	"style" "enum_layouts_blocks_call_to_action_style" DEFAULT 'primary' NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "layouts_paths" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "layouts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"is_default" boolean DEFAULT false,
  	"note" varchar,
  	"change_summary" varchar,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_layouts_v_blocks_logo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"size" "enum__layouts_v_blocks_logo_size" DEFAULT 'medium' NOT NULL,
  	"show_tagline" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_navigation_items_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_type" "enum__layouts_v_blocks_navigation_items_children_link_type" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"column" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_navigation_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_type" "enum__layouts_v_blocks_navigation_items_link_type" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"display" "enum__layouts_v_blocks_navigation_items_display" DEFAULT 'dropdown',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_navigation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_header_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_phone" boolean DEFAULT true,
  	"phone" varchar,
  	"button_label" varchar,
  	"button_href" varchar,
  	"login_label" varchar,
  	"login_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_utility_strip_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_type" "enum__layouts_v_blocks_utility_strip_links_link_type" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_utility_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_footer_columns_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_type" "enum__layouts_v_blocks_footer_columns_columns_links_link_type" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_footer_columns_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL,
  	"content" "enum__layouts_v_blocks_footer_columns_columns_content" DEFAULT 'links' NOT NULL,
  	"address" varchar,
  	"hours" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_legal_bar_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_type" "enum__layouts_v_blocks_legal_bar_links_link_type" DEFAULT 'page',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_legal_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar DEFAULT '© {year} {name}' NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL,
  	"text" varchar,
  	"email_placeholder" varchar DEFAULT 'Your email address',
  	"button_label" varchar DEFAULT 'Subscribe' NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_layouts_v_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL,
  	"body" varchar,
  	"button_label" varchar,
  	"button_href" varchar,
  	"style" "enum__layouts_v_blocks_call_to_action_style" DEFAULT 'primary' NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_layouts_v_version_paths" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"path" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_layouts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_is_default" boolean DEFAULT false,
  	"version_note" varchar,
  	"version_change_summary" varchar,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "layouts_id" integer;
  ALTER TABLE "layouts_blocks_logo" ADD CONSTRAINT "layouts_blocks_logo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_navigation_items_children" ADD CONSTRAINT "layouts_blocks_navigation_items_children_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layouts_blocks_navigation_items_children" ADD CONSTRAINT "layouts_blocks_navigation_items_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts_blocks_navigation_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_navigation_items" ADD CONSTRAINT "layouts_blocks_navigation_items_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layouts_blocks_navigation_items" ADD CONSTRAINT "layouts_blocks_navigation_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts_blocks_navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_navigation" ADD CONSTRAINT "layouts_blocks_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_header_actions" ADD CONSTRAINT "layouts_blocks_header_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_utility_strip_links" ADD CONSTRAINT "layouts_blocks_utility_strip_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layouts_blocks_utility_strip_links" ADD CONSTRAINT "layouts_blocks_utility_strip_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts_blocks_utility_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_utility_strip" ADD CONSTRAINT "layouts_blocks_utility_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_footer_columns_columns_links" ADD CONSTRAINT "layouts_blocks_footer_columns_columns_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layouts_blocks_footer_columns_columns_links" ADD CONSTRAINT "layouts_blocks_footer_columns_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts_blocks_footer_columns_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_footer_columns_columns" ADD CONSTRAINT "layouts_blocks_footer_columns_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts_blocks_footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_footer_columns" ADD CONSTRAINT "layouts_blocks_footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_legal_bar_links" ADD CONSTRAINT "layouts_blocks_legal_bar_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layouts_blocks_legal_bar_links" ADD CONSTRAINT "layouts_blocks_legal_bar_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts_blocks_legal_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_legal_bar" ADD CONSTRAINT "layouts_blocks_legal_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_newsletter" ADD CONSTRAINT "layouts_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_blocks_call_to_action" ADD CONSTRAINT "layouts_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts_paths" ADD CONSTRAINT "layouts_paths_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "layouts" ADD CONSTRAINT "layouts_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_logo" ADD CONSTRAINT "_layouts_v_blocks_logo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_navigation_items_children" ADD CONSTRAINT "_layouts_v_blocks_navigation_items_children_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_navigation_items_children" ADD CONSTRAINT "_layouts_v_blocks_navigation_items_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v_blocks_navigation_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_navigation_items" ADD CONSTRAINT "_layouts_v_blocks_navigation_items_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_navigation_items" ADD CONSTRAINT "_layouts_v_blocks_navigation_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v_blocks_navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_navigation" ADD CONSTRAINT "_layouts_v_blocks_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_header_actions" ADD CONSTRAINT "_layouts_v_blocks_header_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_utility_strip_links" ADD CONSTRAINT "_layouts_v_blocks_utility_strip_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_utility_strip_links" ADD CONSTRAINT "_layouts_v_blocks_utility_strip_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v_blocks_utility_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_utility_strip" ADD CONSTRAINT "_layouts_v_blocks_utility_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_footer_columns_columns_links" ADD CONSTRAINT "_layouts_v_blocks_footer_columns_columns_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_footer_columns_columns_links" ADD CONSTRAINT "_layouts_v_blocks_footer_columns_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v_blocks_footer_columns_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_footer_columns_columns" ADD CONSTRAINT "_layouts_v_blocks_footer_columns_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v_blocks_footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_footer_columns" ADD CONSTRAINT "_layouts_v_blocks_footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_legal_bar_links" ADD CONSTRAINT "_layouts_v_blocks_legal_bar_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_legal_bar_links" ADD CONSTRAINT "_layouts_v_blocks_legal_bar_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v_blocks_legal_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_legal_bar" ADD CONSTRAINT "_layouts_v_blocks_legal_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_newsletter" ADD CONSTRAINT "_layouts_v_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_blocks_call_to_action" ADD CONSTRAINT "_layouts_v_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v_version_paths" ADD CONSTRAINT "_layouts_v_version_paths_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_layouts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_layouts_v" ADD CONSTRAINT "_layouts_v_parent_id_layouts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "layouts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_layouts_v" ADD CONSTRAINT "_layouts_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "layouts_blocks_logo_order_idx" ON "layouts_blocks_logo" USING btree ("_order");
  CREATE INDEX "layouts_blocks_logo_parent_id_idx" ON "layouts_blocks_logo" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_logo_path_idx" ON "layouts_blocks_logo" USING btree ("_path");
  CREATE INDEX "layouts_blocks_navigation_items_children_order_idx" ON "layouts_blocks_navigation_items_children" USING btree ("_order");
  CREATE INDEX "layouts_blocks_navigation_items_children_parent_id_idx" ON "layouts_blocks_navigation_items_children" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_navigation_items_children_link_link_page_idx" ON "layouts_blocks_navigation_items_children" USING btree ("link_page_id");
  CREATE INDEX "layouts_blocks_navigation_items_order_idx" ON "layouts_blocks_navigation_items" USING btree ("_order");
  CREATE INDEX "layouts_blocks_navigation_items_parent_id_idx" ON "layouts_blocks_navigation_items" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_navigation_items_link_link_page_idx" ON "layouts_blocks_navigation_items" USING btree ("link_page_id");
  CREATE INDEX "layouts_blocks_navigation_order_idx" ON "layouts_blocks_navigation" USING btree ("_order");
  CREATE INDEX "layouts_blocks_navigation_parent_id_idx" ON "layouts_blocks_navigation" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_navigation_path_idx" ON "layouts_blocks_navigation" USING btree ("_path");
  CREATE INDEX "layouts_blocks_header_actions_order_idx" ON "layouts_blocks_header_actions" USING btree ("_order");
  CREATE INDEX "layouts_blocks_header_actions_parent_id_idx" ON "layouts_blocks_header_actions" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_header_actions_path_idx" ON "layouts_blocks_header_actions" USING btree ("_path");
  CREATE INDEX "layouts_blocks_utility_strip_links_order_idx" ON "layouts_blocks_utility_strip_links" USING btree ("_order");
  CREATE INDEX "layouts_blocks_utility_strip_links_parent_id_idx" ON "layouts_blocks_utility_strip_links" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_utility_strip_links_link_link_page_idx" ON "layouts_blocks_utility_strip_links" USING btree ("link_page_id");
  CREATE INDEX "layouts_blocks_utility_strip_order_idx" ON "layouts_blocks_utility_strip" USING btree ("_order");
  CREATE INDEX "layouts_blocks_utility_strip_parent_id_idx" ON "layouts_blocks_utility_strip" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_utility_strip_path_idx" ON "layouts_blocks_utility_strip" USING btree ("_path");
  CREATE INDEX "layouts_blocks_footer_columns_columns_links_order_idx" ON "layouts_blocks_footer_columns_columns_links" USING btree ("_order");
  CREATE INDEX "layouts_blocks_footer_columns_columns_links_parent_id_idx" ON "layouts_blocks_footer_columns_columns_links" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_footer_columns_columns_links_link_link_pa_idx" ON "layouts_blocks_footer_columns_columns_links" USING btree ("link_page_id");
  CREATE INDEX "layouts_blocks_footer_columns_columns_order_idx" ON "layouts_blocks_footer_columns_columns" USING btree ("_order");
  CREATE INDEX "layouts_blocks_footer_columns_columns_parent_id_idx" ON "layouts_blocks_footer_columns_columns" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_footer_columns_order_idx" ON "layouts_blocks_footer_columns" USING btree ("_order");
  CREATE INDEX "layouts_blocks_footer_columns_parent_id_idx" ON "layouts_blocks_footer_columns" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_footer_columns_path_idx" ON "layouts_blocks_footer_columns" USING btree ("_path");
  CREATE INDEX "layouts_blocks_legal_bar_links_order_idx" ON "layouts_blocks_legal_bar_links" USING btree ("_order");
  CREATE INDEX "layouts_blocks_legal_bar_links_parent_id_idx" ON "layouts_blocks_legal_bar_links" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_legal_bar_links_link_link_page_idx" ON "layouts_blocks_legal_bar_links" USING btree ("link_page_id");
  CREATE INDEX "layouts_blocks_legal_bar_order_idx" ON "layouts_blocks_legal_bar" USING btree ("_order");
  CREATE INDEX "layouts_blocks_legal_bar_parent_id_idx" ON "layouts_blocks_legal_bar" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_legal_bar_path_idx" ON "layouts_blocks_legal_bar" USING btree ("_path");
  CREATE INDEX "layouts_blocks_newsletter_order_idx" ON "layouts_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "layouts_blocks_newsletter_parent_id_idx" ON "layouts_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_newsletter_path_idx" ON "layouts_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "layouts_blocks_call_to_action_order_idx" ON "layouts_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "layouts_blocks_call_to_action_parent_id_idx" ON "layouts_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "layouts_blocks_call_to_action_path_idx" ON "layouts_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "layouts_paths_order_idx" ON "layouts_paths" USING btree ("_order");
  CREATE INDEX "layouts_paths_parent_id_idx" ON "layouts_paths" USING btree ("_parent_id");
  CREATE INDEX "layouts_updated_by_idx" ON "layouts" USING btree ("updated_by_id");
  CREATE INDEX "layouts_updated_at_idx" ON "layouts" USING btree ("updated_at");
  CREATE INDEX "layouts_created_at_idx" ON "layouts" USING btree ("created_at");
  CREATE INDEX "_layouts_v_blocks_logo_order_idx" ON "_layouts_v_blocks_logo" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_logo_parent_id_idx" ON "_layouts_v_blocks_logo" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_logo_path_idx" ON "_layouts_v_blocks_logo" USING btree ("_path");
  CREATE INDEX "_layouts_v_blocks_navigation_items_children_order_idx" ON "_layouts_v_blocks_navigation_items_children" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_navigation_items_children_parent_id_idx" ON "_layouts_v_blocks_navigation_items_children" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_navigation_items_children_link_link_pa_idx" ON "_layouts_v_blocks_navigation_items_children" USING btree ("link_page_id");
  CREATE INDEX "_layouts_v_blocks_navigation_items_order_idx" ON "_layouts_v_blocks_navigation_items" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_navigation_items_parent_id_idx" ON "_layouts_v_blocks_navigation_items" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_navigation_items_link_link_page_idx" ON "_layouts_v_blocks_navigation_items" USING btree ("link_page_id");
  CREATE INDEX "_layouts_v_blocks_navigation_order_idx" ON "_layouts_v_blocks_navigation" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_navigation_parent_id_idx" ON "_layouts_v_blocks_navigation" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_navigation_path_idx" ON "_layouts_v_blocks_navigation" USING btree ("_path");
  CREATE INDEX "_layouts_v_blocks_header_actions_order_idx" ON "_layouts_v_blocks_header_actions" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_header_actions_parent_id_idx" ON "_layouts_v_blocks_header_actions" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_header_actions_path_idx" ON "_layouts_v_blocks_header_actions" USING btree ("_path");
  CREATE INDEX "_layouts_v_blocks_utility_strip_links_order_idx" ON "_layouts_v_blocks_utility_strip_links" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_utility_strip_links_parent_id_idx" ON "_layouts_v_blocks_utility_strip_links" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_utility_strip_links_link_link_page_idx" ON "_layouts_v_blocks_utility_strip_links" USING btree ("link_page_id");
  CREATE INDEX "_layouts_v_blocks_utility_strip_order_idx" ON "_layouts_v_blocks_utility_strip" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_utility_strip_parent_id_idx" ON "_layouts_v_blocks_utility_strip" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_utility_strip_path_idx" ON "_layouts_v_blocks_utility_strip" USING btree ("_path");
  CREATE INDEX "_layouts_v_blocks_footer_columns_columns_links_order_idx" ON "_layouts_v_blocks_footer_columns_columns_links" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_footer_columns_columns_links_parent_id_idx" ON "_layouts_v_blocks_footer_columns_columns_links" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_footer_columns_columns_links_link_link_idx" ON "_layouts_v_blocks_footer_columns_columns_links" USING btree ("link_page_id");
  CREATE INDEX "_layouts_v_blocks_footer_columns_columns_order_idx" ON "_layouts_v_blocks_footer_columns_columns" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_footer_columns_columns_parent_id_idx" ON "_layouts_v_blocks_footer_columns_columns" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_footer_columns_order_idx" ON "_layouts_v_blocks_footer_columns" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_footer_columns_parent_id_idx" ON "_layouts_v_blocks_footer_columns" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_footer_columns_path_idx" ON "_layouts_v_blocks_footer_columns" USING btree ("_path");
  CREATE INDEX "_layouts_v_blocks_legal_bar_links_order_idx" ON "_layouts_v_blocks_legal_bar_links" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_legal_bar_links_parent_id_idx" ON "_layouts_v_blocks_legal_bar_links" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_legal_bar_links_link_link_page_idx" ON "_layouts_v_blocks_legal_bar_links" USING btree ("link_page_id");
  CREATE INDEX "_layouts_v_blocks_legal_bar_order_idx" ON "_layouts_v_blocks_legal_bar" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_legal_bar_parent_id_idx" ON "_layouts_v_blocks_legal_bar" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_legal_bar_path_idx" ON "_layouts_v_blocks_legal_bar" USING btree ("_path");
  CREATE INDEX "_layouts_v_blocks_newsletter_order_idx" ON "_layouts_v_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_newsletter_parent_id_idx" ON "_layouts_v_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_newsletter_path_idx" ON "_layouts_v_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "_layouts_v_blocks_call_to_action_order_idx" ON "_layouts_v_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "_layouts_v_blocks_call_to_action_parent_id_idx" ON "_layouts_v_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_blocks_call_to_action_path_idx" ON "_layouts_v_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "_layouts_v_version_paths_order_idx" ON "_layouts_v_version_paths" USING btree ("_order");
  CREATE INDEX "_layouts_v_version_paths_parent_id_idx" ON "_layouts_v_version_paths" USING btree ("_parent_id");
  CREATE INDEX "_layouts_v_parent_idx" ON "_layouts_v" USING btree ("parent_id");
  CREATE INDEX "_layouts_v_version_version_updated_by_idx" ON "_layouts_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_layouts_v_version_version_updated_at_idx" ON "_layouts_v" USING btree ("version_updated_at");
  CREATE INDEX "_layouts_v_version_version_created_at_idx" ON "_layouts_v" USING btree ("version_created_at");
  CREATE INDEX "_layouts_v_created_at_idx" ON "_layouts_v" USING btree ("created_at");
  CREATE INDEX "_layouts_v_updated_at_idx" ON "_layouts_v" USING btree ("updated_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_layouts_fk" FOREIGN KEY ("layouts_id") REFERENCES "layouts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_layouts_id_idx" ON "payload_locked_documents_rels" USING btree ("layouts_id");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   ALTER TABLE "layouts_blocks_logo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_navigation_items_children" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_navigation_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_navigation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_header_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_utility_strip_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_utility_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_footer_columns_columns_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_footer_columns_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_footer_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_legal_bar_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_legal_bar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_blocks_call_to_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts_paths" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layouts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_logo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_navigation_items_children" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_navigation_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_navigation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_header_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_utility_strip_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_utility_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_footer_columns_columns_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_footer_columns_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_footer_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_legal_bar_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_legal_bar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_blocks_call_to_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v_version_paths" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_layouts_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "layouts_blocks_logo" CASCADE;
  DROP TABLE "layouts_blocks_navigation_items_children" CASCADE;
  DROP TABLE "layouts_blocks_navigation_items" CASCADE;
  DROP TABLE "layouts_blocks_navigation" CASCADE;
  DROP TABLE "layouts_blocks_header_actions" CASCADE;
  DROP TABLE "layouts_blocks_utility_strip_links" CASCADE;
  DROP TABLE "layouts_blocks_utility_strip" CASCADE;
  DROP TABLE "layouts_blocks_footer_columns_columns_links" CASCADE;
  DROP TABLE "layouts_blocks_footer_columns_columns" CASCADE;
  DROP TABLE "layouts_blocks_footer_columns" CASCADE;
  DROP TABLE "layouts_blocks_legal_bar_links" CASCADE;
  DROP TABLE "layouts_blocks_legal_bar" CASCADE;
  DROP TABLE "layouts_blocks_newsletter" CASCADE;
  DROP TABLE "layouts_blocks_call_to_action" CASCADE;
  DROP TABLE "layouts_paths" CASCADE;
  DROP TABLE "layouts" CASCADE;
  DROP TABLE "_layouts_v_blocks_logo" CASCADE;
  DROP TABLE "_layouts_v_blocks_navigation_items_children" CASCADE;
  DROP TABLE "_layouts_v_blocks_navigation_items" CASCADE;
  DROP TABLE "_layouts_v_blocks_navigation" CASCADE;
  DROP TABLE "_layouts_v_blocks_header_actions" CASCADE;
  DROP TABLE "_layouts_v_blocks_utility_strip_links" CASCADE;
  DROP TABLE "_layouts_v_blocks_utility_strip" CASCADE;
  DROP TABLE "_layouts_v_blocks_footer_columns_columns_links" CASCADE;
  DROP TABLE "_layouts_v_blocks_footer_columns_columns" CASCADE;
  DROP TABLE "_layouts_v_blocks_footer_columns" CASCADE;
  DROP TABLE "_layouts_v_blocks_legal_bar_links" CASCADE;
  DROP TABLE "_layouts_v_blocks_legal_bar" CASCADE;
  DROP TABLE "_layouts_v_blocks_newsletter" CASCADE;
  DROP TABLE "_layouts_v_blocks_call_to_action" CASCADE;
  DROP TABLE "_layouts_v_version_paths" CASCADE;
  DROP TABLE "_layouts_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_layouts_fk";
  
  DROP INDEX "payload_locked_documents_rels_layouts_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "layouts_id";
  DROP TYPE "enum_layouts_blocks_logo_size";
  DROP TYPE "enum_layouts_blocks_navigation_items_children_link_type";
  DROP TYPE "enum_layouts_blocks_navigation_items_link_type";
  DROP TYPE "enum_layouts_blocks_navigation_items_display";
  DROP TYPE "enum_layouts_blocks_utility_strip_links_link_type";
  DROP TYPE "enum_layouts_blocks_footer_columns_columns_links_link_type";
  DROP TYPE "enum_layouts_blocks_footer_columns_columns_content";
  DROP TYPE "enum_layouts_blocks_legal_bar_links_link_type";
  DROP TYPE "enum_layouts_blocks_call_to_action_style";
  DROP TYPE "enum__layouts_v_blocks_logo_size";
  DROP TYPE "enum__layouts_v_blocks_navigation_items_children_link_type";
  DROP TYPE "enum__layouts_v_blocks_navigation_items_link_type";
  DROP TYPE "enum__layouts_v_blocks_navigation_items_display";
  DROP TYPE "enum__layouts_v_blocks_utility_strip_links_link_type";
  DROP TYPE "enum__layouts_v_blocks_footer_columns_columns_links_link_type";
  DROP TYPE "enum__layouts_v_blocks_footer_columns_columns_content";
  DROP TYPE "enum__layouts_v_blocks_legal_bar_links_link_type";
  DROP TYPE "enum__layouts_v_blocks_call_to_action_style";`)
}
