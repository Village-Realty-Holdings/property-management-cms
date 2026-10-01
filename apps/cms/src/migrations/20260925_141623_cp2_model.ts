import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_properties_status" AS ENUM('active', 'withdrawn');
  CREATE TYPE "public"."enum_locations_level" AS ENUM('destination', 'area', 'complex');
  CREATE TYPE "public"."enum_locations_status" AS ENUM('active', 'withdrawn');
  CREATE TYPE "public"."enum_specials_status" AS ENUM('active', 'withdrawn');
  CREATE TYPE "public"."enum_reviews_moderation" AS ENUM('pending', 'shown', 'hidden');
  CREATE TYPE "public"."enum_reviews_status" AS ENUM('active', 'withdrawn');
  CREATE TYPE "public"."enum_pages_blocks_property_grid_source" AS ENUM('curatedList', 'location');
  CREATE TYPE "public"."enum_pages_blocks_call_to_action_style" AS ENUM('primary', 'secondary', 'inverted');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_blocks_property_grid_source" AS ENUM('curatedList', 'location');
  CREATE TYPE "public"."enum__pages_v_blocks_call_to_action_style" AS ENUM('primary', 'secondary', 'inverted');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_guides_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__guides_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_curated_lists_sort" AS ENUM('featured', 'rating', 'sleeps', 'bedrooms', 'name');
  CREATE TYPE "public"."enum_curated_lists_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__curated_lists_v_version_sort" AS ENUM('featured', 'rating', 'sleeps', 'bedrooms', 'name');
  CREATE TYPE "public"."enum__curated_lists_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_submissions_kind" AS ENUM('inquiry', 'ownerLead', 'contact');
  CREATE TYPE "public"."enum_submissions_forwarding_status" AS ENUM('pending', 'sent', 'failed');
  CREATE TYPE "public"."enum_amenities_status" AS ENUM('active', 'withdrawn');
  CREATE TYPE "public"."enum_property_types_status" AS ENUM('active', 'withdrawn');
  CREATE TYPE "public"."enum_sites_forwarding_destinations_kind" AS ENUM('all', 'inquiry', 'ownerLead', 'contact');
  CREATE TYPE "public"."enum_sites_forwarding_destinations_type" AS ENUM('webhook', 'email');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TABLE "properties_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"caption" varchar,
  	"width" numeric,
  	"height" numeric
  );
  
  CREATE TABLE "properties_rooms_beds" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" varchar NOT NULL,
  	"count" numeric DEFAULT 1
  );
  
  CREATE TABLE "properties_rooms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"sleeps" numeric
  );
  
  CREATE TABLE "properties_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "properties" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"status" "enum_properties_status" DEFAULT 'active' NOT NULL,
  	"slug" varchar,
  	"featured" boolean DEFAULT false,
  	"feed_id" varchar NOT NULL,
  	"feed_name" varchar,
  	"location_id" integer,
  	"property_type_id" integer,
  	"bedrooms" numeric,
  	"bathrooms" numeric,
  	"sleeps" numeric,
  	"pets_allowed" boolean DEFAULT false,
  	"rating" numeric,
  	"review_count" numeric,
  	"feed_description" varchar,
  	"online_bookable" boolean DEFAULT true,
  	"feed_updated_at" timestamp(3) with time zone,
  	"virtual_tour_url" varchar,
  	"address_line1" varchar,
  	"address_city" varchar,
  	"address_region" varchar,
  	"address_postal_code" varchar,
  	"address_country" varchar,
  	"geo_lat" numeric,
  	"geo_lng" numeric,
  	"stay_policy_check_in" varchar,
  	"stay_policy_check_out" varchar,
  	"stay_policy_minimum_age" numeric,
  	"stay_policy_house_rules" varchar,
  	"stay_policy_cancellation_policy" varchar,
  	"headline" varchar,
  	"summary" varchar,
  	"description" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "properties_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"amenities_id" integer
  );
  
  CREATE TABLE "locations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"title" varchar,
  	"feed_id" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"feed_type" varchar,
  	"parent_id" integer,
  	"display_name" varchar,
  	"intro" jsonb,
  	"hero_image_id" integer,
  	"complex_address" varchar,
  	"complex_check_in_info" jsonb,
  	"complex_housekeeping" jsonb,
  	"complex_fee_notes" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"level" "enum_locations_level",
  	"slug" varchar,
  	"visible" boolean DEFAULT true,
  	"status" "enum_locations_status" DEFAULT 'active' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "locations_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"amenities_id" integer
  );
  
  CREATE TABLE "specials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"feed_id" varchar NOT NULL,
  	"code" varchar,
  	"status" "enum_specials_status" DEFAULT 'active' NOT NULL,
  	"valid_from" timestamp(3) with time zone,
  	"valid_to" timestamp(3) with time zone,
  	"discount_summary" varchar,
  	"terms" varchar,
  	"title" varchar,
  	"slug" varchar,
  	"show_on_site" boolean DEFAULT false,
  	"summary" varchar,
  	"body" jsonb,
  	"disclaimer" varchar,
  	"hero_image_id" integer,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "specials_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"properties_id" integer
  );
  
  CREATE TABLE "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"moderation" "enum_reviews_moderation" DEFAULT 'pending' NOT NULL,
  	"status" "enum_reviews_status" DEFAULT 'active' NOT NULL,
  	"feed_id" varchar NOT NULL,
  	"source" varchar,
  	"property_id" integer,
  	"rating" numeric,
  	"stay_date" timestamp(3) with time zone,
  	"guest_name" varchar,
  	"title" varchar,
  	"body" varchar,
  	"manager_response" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"image_id" integer,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_property_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"source" "enum_pages_blocks_property_grid_source" DEFAULT 'curatedList',
  	"curated_list_id" integer,
  	"location_id" integer,
  	"limit" numeric DEFAULT 6,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_curated_list_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"body" varchar,
  	"button_label" varchar,
  	"button_href" varchar,
  	"style" "enum_pages_blocks_call_to_action_style" DEFAULT 'primary',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"title" varchar,
  	"path" varchar,
  	"show_in_nav" boolean DEFAULT false,
  	"nav_order" numeric,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"curated_lists_id" integer
  );
  
  CREATE TABLE "_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"image_id" integer,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_property_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"source" "enum__pages_v_blocks_property_grid_source" DEFAULT 'curatedList',
  	"curated_list_id" integer,
  	"location_id" integer,
  	"limit" numeric DEFAULT 6,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_curated_list_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"body" varchar,
  	"button_label" varchar,
  	"button_href" varchar,
  	"style" "enum__pages_v_blocks_call_to_action_style" DEFAULT 'primary',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_site_id" integer,
  	"version_title" varchar,
  	"version_path" varchar,
  	"version_show_in_nav" boolean DEFAULT false,
  	"version_nav_order" numeric,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"curated_lists_id" integer
  );
  
  CREATE TABLE "guides" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"title" varchar,
  	"slug" varchar,
  	"published_at" timestamp(3) with time zone,
  	"excerpt" varchar,
  	"hero_image_id" integer,
  	"body" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_guides_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "guides_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locations_id" integer,
  	"properties_id" integer
  );
  
  CREATE TABLE "_guides_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_site_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_excerpt" varchar,
  	"version_hero_image_id" integer,
  	"version_body" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__guides_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_guides_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locations_id" integer,
  	"properties_id" integer
  );
  
  CREATE TABLE "curated_lists" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"title" varchar,
  	"slug" varchar,
  	"hero_image_id" integer,
  	"intro" jsonb,
  	"rule_location_id" integer,
  	"rule_min_bedrooms" numeric,
  	"rule_min_sleeps" numeric,
  	"rule_pets_allowed" boolean DEFAULT false,
  	"sort" "enum_curated_lists_sort" DEFAULT 'featured',
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_curated_lists_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "curated_lists_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"amenities_id" integer,
  	"property_types_id" integer
  );
  
  CREATE TABLE "_curated_lists_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_site_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_hero_image_id" integer,
  	"version_intro" jsonb,
  	"version_rule_location_id" integer,
  	"version_rule_min_bedrooms" numeric,
  	"version_rule_min_sleeps" numeric,
  	"version_rule_pets_allowed" boolean DEFAULT false,
  	"version_sort" "enum__curated_lists_v_version_sort" DEFAULT 'featured',
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__curated_lists_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_curated_lists_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"amenities_id" integer,
  	"property_types_id" integer
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"credit" varchar,
  	"prefix" varchar,
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric
  );
  
  CREATE TABLE "submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer NOT NULL,
  	"kind" "enum_submissions_kind" NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"message" varchar,
  	"property_id" integer,
  	"arrival" timestamp(3) with time zone,
  	"departure" timestamp(3) with time zone,
  	"guests" numeric,
  	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  	"source_url" varchar,
  	"forwarding_status" "enum_submissions_forwarding_status" DEFAULT 'pending' NOT NULL,
  	"forwarding_attempts" numeric DEFAULT 0,
  	"forwarded_at" timestamp(3) with time zone,
  	"last_forwarding_error" varchar,
  	"delivered_to" jsonb,
  	"retain_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "amenities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"feed_id" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"group" varchar,
  	"icon" varchar,
  	"status" "enum_amenities_status" DEFAULT 'active',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "property_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"feed_id" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"status" "enum_property_types_status" DEFAULT 'active',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sites_amenity_presentation_filters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"amenity_id" integer NOT NULL,
  	"label" varchar,
  	"icon" varchar,
  	"group" varchar
  );
  
  CREATE TABLE "sites_property_type_labels_labels" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"property_type_id" integer NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "sites_forwarding_destinations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_sites_forwarding_destinations_kind" DEFAULT 'all' NOT NULL,
  	"type" "enum_sites_forwarding_destinations_type" DEFAULT 'webhook' NOT NULL,
  	"url" varchar,
  	"secret" varchar,
  	"email_to" varchar
  );
  
  CREATE TABLE "sites" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"domain" varchar,
  	"deployment_url" varchar,
  	"revalidation_secret" varchar,
  	"feed_account_ref" varchar,
  	"stay_policy_defaults_check_in" varchar,
  	"stay_policy_defaults_check_out" varchar,
  	"stay_policy_defaults_minimum_age" numeric,
  	"stay_policy_defaults_house_rules" varchar,
  	"stay_policy_defaults_cancellation_policy" varchar,
  	"moderation_auto_show_min_rating" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sites_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"amenities_id" integer
  );
  
  CREATE TABLE "users_tenants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"site_id" integer NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "enum_users_role" DEFAULT 'editor' NOT NULL,
  	"super_admin" boolean DEFAULT false,
  	"entra_oid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_readers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"site_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"properties_id" integer,
  	"locations_id" integer,
  	"specials_id" integer,
  	"reviews_id" integer,
  	"pages_id" integer,
  	"guides_id" integer,
  	"curated_lists_id" integer,
  	"media_id" integer,
  	"submissions_id" integer,
  	"amenities_id" integer,
  	"property_types_id" integer,
  	"sites_id" integer,
  	"users_id" integer,
  	"site_readers_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"site_readers_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "properties_photos" ADD CONSTRAINT "properties_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties_rooms_beds" ADD CONSTRAINT "properties_rooms_beds_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."properties_rooms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties_rooms" ADD CONSTRAINT "properties_rooms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties_highlights" ADD CONSTRAINT "properties_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_property_type_id_property_types_id_fk" FOREIGN KEY ("property_type_id") REFERENCES "public"."property_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties_rels" ADD CONSTRAINT "properties_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties_rels" ADD CONSTRAINT "properties_rels_amenities_fk" FOREIGN KEY ("amenities_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "locations" ADD CONSTRAINT "locations_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "locations" ADD CONSTRAINT "locations_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "locations" ADD CONSTRAINT "locations_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "locations_rels" ADD CONSTRAINT "locations_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "locations_rels" ADD CONSTRAINT "locations_rels_amenities_fk" FOREIGN KEY ("amenities_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "specials" ADD CONSTRAINT "specials_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "specials" ADD CONSTRAINT "specials_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "specials" ADD CONSTRAINT "specials_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "specials_rels" ADD CONSTRAINT "specials_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."specials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "specials_rels" ADD CONSTRAINT "specials_rels_properties_fk" FOREIGN KEY ("properties_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_property_grid" ADD CONSTRAINT "pages_blocks_property_grid_curated_list_id_curated_lists_id_fk" FOREIGN KEY ("curated_list_id") REFERENCES "public"."curated_lists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_property_grid" ADD CONSTRAINT "pages_blocks_property_grid_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_property_grid" ADD CONSTRAINT "pages_blocks_property_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_curated_list_cards" ADD CONSTRAINT "pages_blocks_curated_list_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action" ADD CONSTRAINT "pages_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_curated_lists_fk" FOREIGN KEY ("curated_lists_id") REFERENCES "public"."curated_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_property_grid" ADD CONSTRAINT "_pages_v_blocks_property_grid_curated_list_id_curated_lists_id_fk" FOREIGN KEY ("curated_list_id") REFERENCES "public"."curated_lists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_property_grid" ADD CONSTRAINT "_pages_v_blocks_property_grid_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_property_grid" ADD CONSTRAINT "_pages_v_blocks_property_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_curated_list_cards" ADD CONSTRAINT "_pages_v_blocks_curated_list_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action" ADD CONSTRAINT "_pages_v_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items" ADD CONSTRAINT "_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_site_id_sites_id_fk" FOREIGN KEY ("version_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_curated_lists_fk" FOREIGN KEY ("curated_lists_id") REFERENCES "public"."curated_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guides" ADD CONSTRAINT "guides_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guides" ADD CONSTRAINT "guides_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guides" ADD CONSTRAINT "guides_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guides_rels" ADD CONSTRAINT "guides_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guides_rels" ADD CONSTRAINT "guides_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guides_rels" ADD CONSTRAINT "guides_rels_properties_fk" FOREIGN KEY ("properties_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v" ADD CONSTRAINT "_guides_v_parent_id_guides_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guides_v" ADD CONSTRAINT "_guides_v_version_site_id_sites_id_fk" FOREIGN KEY ("version_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guides_v" ADD CONSTRAINT "_guides_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guides_v" ADD CONSTRAINT "_guides_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guides_v_rels" ADD CONSTRAINT "_guides_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v_rels" ADD CONSTRAINT "_guides_v_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v_rels" ADD CONSTRAINT "_guides_v_rels_properties_fk" FOREIGN KEY ("properties_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "curated_lists" ADD CONSTRAINT "curated_lists_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "curated_lists" ADD CONSTRAINT "curated_lists_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "curated_lists" ADD CONSTRAINT "curated_lists_rule_location_id_locations_id_fk" FOREIGN KEY ("rule_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "curated_lists" ADD CONSTRAINT "curated_lists_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "curated_lists_rels" ADD CONSTRAINT "curated_lists_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."curated_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "curated_lists_rels" ADD CONSTRAINT "curated_lists_rels_amenities_fk" FOREIGN KEY ("amenities_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "curated_lists_rels" ADD CONSTRAINT "curated_lists_rels_property_types_fk" FOREIGN KEY ("property_types_id") REFERENCES "public"."property_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_curated_lists_v" ADD CONSTRAINT "_curated_lists_v_parent_id_curated_lists_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."curated_lists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_curated_lists_v" ADD CONSTRAINT "_curated_lists_v_version_site_id_sites_id_fk" FOREIGN KEY ("version_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_curated_lists_v" ADD CONSTRAINT "_curated_lists_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_curated_lists_v" ADD CONSTRAINT "_curated_lists_v_version_rule_location_id_locations_id_fk" FOREIGN KEY ("version_rule_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_curated_lists_v" ADD CONSTRAINT "_curated_lists_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_curated_lists_v_rels" ADD CONSTRAINT "_curated_lists_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_curated_lists_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_curated_lists_v_rels" ADD CONSTRAINT "_curated_lists_v_rels_amenities_fk" FOREIGN KEY ("amenities_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_curated_lists_v_rels" ADD CONSTRAINT "_curated_lists_v_rels_property_types_fk" FOREIGN KEY ("property_types_id") REFERENCES "public"."property_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "submissions" ADD CONSTRAINT "submissions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "submissions" ADD CONSTRAINT "submissions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sites_amenity_presentation_filters" ADD CONSTRAINT "sites_amenity_presentation_filters_amenity_id_amenities_id_fk" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sites_amenity_presentation_filters" ADD CONSTRAINT "sites_amenity_presentation_filters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sites_property_type_labels_labels" ADD CONSTRAINT "sites_property_type_labels_labels_property_type_id_property_types_id_fk" FOREIGN KEY ("property_type_id") REFERENCES "public"."property_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sites_property_type_labels_labels" ADD CONSTRAINT "sites_property_type_labels_labels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sites_forwarding_destinations" ADD CONSTRAINT "sites_forwarding_destinations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sites_rels" ADD CONSTRAINT "sites_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sites_rels" ADD CONSTRAINT "sites_rels_amenities_fk" FOREIGN KEY ("amenities_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_readers" ADD CONSTRAINT "site_readers_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_properties_fk" FOREIGN KEY ("properties_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_specials_fk" FOREIGN KEY ("specials_id") REFERENCES "public"."specials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_guides_fk" FOREIGN KEY ("guides_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_curated_lists_fk" FOREIGN KEY ("curated_lists_id") REFERENCES "public"."curated_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_submissions_fk" FOREIGN KEY ("submissions_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_amenities_fk" FOREIGN KEY ("amenities_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_property_types_fk" FOREIGN KEY ("property_types_id") REFERENCES "public"."property_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sites_fk" FOREIGN KEY ("sites_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_readers_fk" FOREIGN KEY ("site_readers_id") REFERENCES "public"."site_readers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_site_readers_fk" FOREIGN KEY ("site_readers_id") REFERENCES "public"."site_readers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "properties_photos_order_idx" ON "properties_photos" USING btree ("_order");
  CREATE INDEX "properties_photos_parent_id_idx" ON "properties_photos" USING btree ("_parent_id");
  CREATE INDEX "properties_rooms_beds_order_idx" ON "properties_rooms_beds" USING btree ("_order");
  CREATE INDEX "properties_rooms_beds_parent_id_idx" ON "properties_rooms_beds" USING btree ("_parent_id");
  CREATE INDEX "properties_rooms_order_idx" ON "properties_rooms" USING btree ("_order");
  CREATE INDEX "properties_rooms_parent_id_idx" ON "properties_rooms" USING btree ("_parent_id");
  CREATE INDEX "properties_highlights_order_idx" ON "properties_highlights" USING btree ("_order");
  CREATE INDEX "properties_highlights_parent_id_idx" ON "properties_highlights" USING btree ("_parent_id");
  CREATE INDEX "properties_site_idx" ON "properties" USING btree ("site_id");
  CREATE INDEX "properties_slug_idx" ON "properties" USING btree ("slug");
  CREATE INDEX "properties_feed_id_idx" ON "properties" USING btree ("feed_id");
  CREATE INDEX "properties_location_idx" ON "properties" USING btree ("location_id");
  CREATE INDEX "properties_property_type_idx" ON "properties" USING btree ("property_type_id");
  CREATE INDEX "properties_seo_seo_image_idx" ON "properties" USING btree ("seo_image_id");
  CREATE INDEX "properties_updated_at_idx" ON "properties" USING btree ("updated_at");
  CREATE INDEX "properties_created_at_idx" ON "properties" USING btree ("created_at");
  CREATE UNIQUE INDEX "site_feedId_idx" ON "properties" USING btree ("site_id","feed_id");
  CREATE UNIQUE INDEX "site_slug_idx" ON "properties" USING btree ("site_id","slug");
  CREATE INDEX "properties_rels_order_idx" ON "properties_rels" USING btree ("order");
  CREATE INDEX "properties_rels_parent_idx" ON "properties_rels" USING btree ("parent_id");
  CREATE INDEX "properties_rels_path_idx" ON "properties_rels" USING btree ("path");
  CREATE INDEX "properties_rels_amenities_id_idx" ON "properties_rels" USING btree ("amenities_id");
  CREATE INDEX "locations_site_idx" ON "locations" USING btree ("site_id");
  CREATE INDEX "locations_feed_id_idx" ON "locations" USING btree ("feed_id");
  CREATE INDEX "locations_parent_idx" ON "locations" USING btree ("parent_id");
  CREATE INDEX "locations_hero_image_idx" ON "locations" USING btree ("hero_image_id");
  CREATE INDEX "locations_seo_seo_image_idx" ON "locations" USING btree ("seo_image_id");
  CREATE INDEX "locations_slug_idx" ON "locations" USING btree ("slug");
  CREATE INDEX "locations_updated_at_idx" ON "locations" USING btree ("updated_at");
  CREATE INDEX "locations_created_at_idx" ON "locations" USING btree ("created_at");
  CREATE UNIQUE INDEX "site_feedId_1_idx" ON "locations" USING btree ("site_id","feed_id");
  CREATE UNIQUE INDEX "site_slug_1_idx" ON "locations" USING btree ("site_id","slug");
  CREATE INDEX "locations_rels_order_idx" ON "locations_rels" USING btree ("order");
  CREATE INDEX "locations_rels_parent_idx" ON "locations_rels" USING btree ("parent_id");
  CREATE INDEX "locations_rels_path_idx" ON "locations_rels" USING btree ("path");
  CREATE INDEX "locations_rels_amenities_id_idx" ON "locations_rels" USING btree ("amenities_id");
  CREATE INDEX "specials_site_idx" ON "specials" USING btree ("site_id");
  CREATE INDEX "specials_feed_id_idx" ON "specials" USING btree ("feed_id");
  CREATE INDEX "specials_slug_idx" ON "specials" USING btree ("slug");
  CREATE INDEX "specials_hero_image_idx" ON "specials" USING btree ("hero_image_id");
  CREATE INDEX "specials_seo_seo_image_idx" ON "specials" USING btree ("seo_image_id");
  CREATE INDEX "specials_updated_at_idx" ON "specials" USING btree ("updated_at");
  CREATE INDEX "specials_created_at_idx" ON "specials" USING btree ("created_at");
  CREATE UNIQUE INDEX "site_feedId_2_idx" ON "specials" USING btree ("site_id","feed_id");
  CREATE UNIQUE INDEX "site_slug_2_idx" ON "specials" USING btree ("site_id","slug");
  CREATE INDEX "specials_rels_order_idx" ON "specials_rels" USING btree ("order");
  CREATE INDEX "specials_rels_parent_idx" ON "specials_rels" USING btree ("parent_id");
  CREATE INDEX "specials_rels_path_idx" ON "specials_rels" USING btree ("path");
  CREATE INDEX "specials_rels_properties_id_idx" ON "specials_rels" USING btree ("properties_id");
  CREATE INDEX "reviews_site_idx" ON "reviews" USING btree ("site_id");
  CREATE INDEX "reviews_moderation_idx" ON "reviews" USING btree ("moderation");
  CREATE INDEX "reviews_feed_id_idx" ON "reviews" USING btree ("feed_id");
  CREATE INDEX "reviews_property_idx" ON "reviews" USING btree ("property_id");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE UNIQUE INDEX "site_feedId_3_idx" ON "reviews" USING btree ("site_id","feed_id");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_hero_image_idx" ON "pages_blocks_hero" USING btree ("image_id");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_property_grid_order_idx" ON "pages_blocks_property_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_property_grid_parent_id_idx" ON "pages_blocks_property_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_property_grid_path_idx" ON "pages_blocks_property_grid" USING btree ("_path");
  CREATE INDEX "pages_blocks_property_grid_curated_list_idx" ON "pages_blocks_property_grid" USING btree ("curated_list_id");
  CREATE INDEX "pages_blocks_property_grid_location_idx" ON "pages_blocks_property_grid" USING btree ("location_id");
  CREATE INDEX "pages_blocks_curated_list_cards_order_idx" ON "pages_blocks_curated_list_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_curated_list_cards_parent_id_idx" ON "pages_blocks_curated_list_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_curated_list_cards_path_idx" ON "pages_blocks_curated_list_cards" USING btree ("_path");
  CREATE INDEX "pages_blocks_call_to_action_order_idx" ON "pages_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "pages_blocks_call_to_action_parent_id_idx" ON "pages_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_path_idx" ON "pages_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE INDEX "pages_site_idx" ON "pages" USING btree ("site_id");
  CREATE INDEX "pages_path_idx" ON "pages" USING btree ("path");
  CREATE INDEX "pages_seo_seo_image_idx" ON "pages" USING btree ("seo_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE UNIQUE INDEX "site_path_idx" ON "pages" USING btree ("site_id","path");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_curated_lists_id_idx" ON "pages_rels" USING btree ("curated_lists_id");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "_pages_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_image_idx" ON "_pages_v_blocks_hero" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_property_grid_order_idx" ON "_pages_v_blocks_property_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_property_grid_parent_id_idx" ON "_pages_v_blocks_property_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_property_grid_path_idx" ON "_pages_v_blocks_property_grid" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_property_grid_curated_list_idx" ON "_pages_v_blocks_property_grid" USING btree ("curated_list_id");
  CREATE INDEX "_pages_v_blocks_property_grid_location_idx" ON "_pages_v_blocks_property_grid" USING btree ("location_id");
  CREATE INDEX "_pages_v_blocks_curated_list_cards_order_idx" ON "_pages_v_blocks_curated_list_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_curated_list_cards_parent_id_idx" ON "_pages_v_blocks_curated_list_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_curated_list_cards_path_idx" ON "_pages_v_blocks_curated_list_cards" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_call_to_action_order_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_call_to_action_parent_id_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_path_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_faq_items_order_idx" ON "_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_items_parent_id_idx" ON "_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_site_idx" ON "_pages_v" USING btree ("version_site_id");
  CREATE INDEX "_pages_v_version_version_path_idx" ON "_pages_v" USING btree ("version_path");
  CREATE INDEX "_pages_v_version_seo_version_seo_image_idx" ON "_pages_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "version_site_version_path_idx" ON "_pages_v" USING btree ("version_site_id","version_path");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_curated_lists_id_idx" ON "_pages_v_rels" USING btree ("curated_lists_id");
  CREATE INDEX "guides_site_idx" ON "guides" USING btree ("site_id");
  CREATE INDEX "guides_slug_idx" ON "guides" USING btree ("slug");
  CREATE INDEX "guides_published_at_idx" ON "guides" USING btree ("published_at");
  CREATE INDEX "guides_hero_image_idx" ON "guides" USING btree ("hero_image_id");
  CREATE INDEX "guides_seo_seo_image_idx" ON "guides" USING btree ("seo_image_id");
  CREATE INDEX "guides_updated_at_idx" ON "guides" USING btree ("updated_at");
  CREATE INDEX "guides_created_at_idx" ON "guides" USING btree ("created_at");
  CREATE INDEX "guides__status_idx" ON "guides" USING btree ("_status");
  CREATE UNIQUE INDEX "site_slug_3_idx" ON "guides" USING btree ("site_id","slug");
  CREATE INDEX "guides_rels_order_idx" ON "guides_rels" USING btree ("order");
  CREATE INDEX "guides_rels_parent_idx" ON "guides_rels" USING btree ("parent_id");
  CREATE INDEX "guides_rels_path_idx" ON "guides_rels" USING btree ("path");
  CREATE INDEX "guides_rels_locations_id_idx" ON "guides_rels" USING btree ("locations_id");
  CREATE INDEX "guides_rels_properties_id_idx" ON "guides_rels" USING btree ("properties_id");
  CREATE INDEX "_guides_v_parent_idx" ON "_guides_v" USING btree ("parent_id");
  CREATE INDEX "_guides_v_version_version_site_idx" ON "_guides_v" USING btree ("version_site_id");
  CREATE INDEX "_guides_v_version_version_slug_idx" ON "_guides_v" USING btree ("version_slug");
  CREATE INDEX "_guides_v_version_version_published_at_idx" ON "_guides_v" USING btree ("version_published_at");
  CREATE INDEX "_guides_v_version_version_hero_image_idx" ON "_guides_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_guides_v_version_seo_version_seo_image_idx" ON "_guides_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_guides_v_version_version_updated_at_idx" ON "_guides_v" USING btree ("version_updated_at");
  CREATE INDEX "_guides_v_version_version_created_at_idx" ON "_guides_v" USING btree ("version_created_at");
  CREATE INDEX "_guides_v_version_version__status_idx" ON "_guides_v" USING btree ("version__status");
  CREATE INDEX "_guides_v_created_at_idx" ON "_guides_v" USING btree ("created_at");
  CREATE INDEX "_guides_v_updated_at_idx" ON "_guides_v" USING btree ("updated_at");
  CREATE INDEX "_guides_v_latest_idx" ON "_guides_v" USING btree ("latest");
  CREATE INDEX "version_site_version_slug_idx" ON "_guides_v" USING btree ("version_site_id","version_slug");
  CREATE INDEX "_guides_v_rels_order_idx" ON "_guides_v_rels" USING btree ("order");
  CREATE INDEX "_guides_v_rels_parent_idx" ON "_guides_v_rels" USING btree ("parent_id");
  CREATE INDEX "_guides_v_rels_path_idx" ON "_guides_v_rels" USING btree ("path");
  CREATE INDEX "_guides_v_rels_locations_id_idx" ON "_guides_v_rels" USING btree ("locations_id");
  CREATE INDEX "_guides_v_rels_properties_id_idx" ON "_guides_v_rels" USING btree ("properties_id");
  CREATE INDEX "curated_lists_site_idx" ON "curated_lists" USING btree ("site_id");
  CREATE INDEX "curated_lists_slug_idx" ON "curated_lists" USING btree ("slug");
  CREATE INDEX "curated_lists_hero_image_idx" ON "curated_lists" USING btree ("hero_image_id");
  CREATE INDEX "curated_lists_rule_rule_location_idx" ON "curated_lists" USING btree ("rule_location_id");
  CREATE INDEX "curated_lists_seo_seo_image_idx" ON "curated_lists" USING btree ("seo_image_id");
  CREATE INDEX "curated_lists_updated_at_idx" ON "curated_lists" USING btree ("updated_at");
  CREATE INDEX "curated_lists_created_at_idx" ON "curated_lists" USING btree ("created_at");
  CREATE INDEX "curated_lists__status_idx" ON "curated_lists" USING btree ("_status");
  CREATE UNIQUE INDEX "site_slug_4_idx" ON "curated_lists" USING btree ("site_id","slug");
  CREATE INDEX "curated_lists_rels_order_idx" ON "curated_lists_rels" USING btree ("order");
  CREATE INDEX "curated_lists_rels_parent_idx" ON "curated_lists_rels" USING btree ("parent_id");
  CREATE INDEX "curated_lists_rels_path_idx" ON "curated_lists_rels" USING btree ("path");
  CREATE INDEX "curated_lists_rels_amenities_id_idx" ON "curated_lists_rels" USING btree ("amenities_id");
  CREATE INDEX "curated_lists_rels_property_types_id_idx" ON "curated_lists_rels" USING btree ("property_types_id");
  CREATE INDEX "_curated_lists_v_parent_idx" ON "_curated_lists_v" USING btree ("parent_id");
  CREATE INDEX "_curated_lists_v_version_version_site_idx" ON "_curated_lists_v" USING btree ("version_site_id");
  CREATE INDEX "_curated_lists_v_version_version_slug_idx" ON "_curated_lists_v" USING btree ("version_slug");
  CREATE INDEX "_curated_lists_v_version_version_hero_image_idx" ON "_curated_lists_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_curated_lists_v_version_rule_version_rule_location_idx" ON "_curated_lists_v" USING btree ("version_rule_location_id");
  CREATE INDEX "_curated_lists_v_version_seo_version_seo_image_idx" ON "_curated_lists_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_curated_lists_v_version_version_updated_at_idx" ON "_curated_lists_v" USING btree ("version_updated_at");
  CREATE INDEX "_curated_lists_v_version_version_created_at_idx" ON "_curated_lists_v" USING btree ("version_created_at");
  CREATE INDEX "_curated_lists_v_version_version__status_idx" ON "_curated_lists_v" USING btree ("version__status");
  CREATE INDEX "_curated_lists_v_created_at_idx" ON "_curated_lists_v" USING btree ("created_at");
  CREATE INDEX "_curated_lists_v_updated_at_idx" ON "_curated_lists_v" USING btree ("updated_at");
  CREATE INDEX "_curated_lists_v_latest_idx" ON "_curated_lists_v" USING btree ("latest");
  CREATE INDEX "version_site_version_slug_1_idx" ON "_curated_lists_v" USING btree ("version_site_id","version_slug");
  CREATE INDEX "_curated_lists_v_rels_order_idx" ON "_curated_lists_v_rels" USING btree ("order");
  CREATE INDEX "_curated_lists_v_rels_parent_idx" ON "_curated_lists_v_rels" USING btree ("parent_id");
  CREATE INDEX "_curated_lists_v_rels_path_idx" ON "_curated_lists_v_rels" USING btree ("path");
  CREATE INDEX "_curated_lists_v_rels_amenities_id_idx" ON "_curated_lists_v_rels" USING btree ("amenities_id");
  CREATE INDEX "_curated_lists_v_rels_property_types_id_idx" ON "_curated_lists_v_rels" USING btree ("property_types_id");
  CREATE UNIQUE INDEX "media_filename_compound_idx" ON "media" USING btree ("filename","prefix");
  CREATE INDEX "media_site_idx" ON "media" USING btree ("site_id");
  CREATE INDEX "media_prefix_idx" ON "media" USING btree ("prefix");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "submissions_site_idx" ON "submissions" USING btree ("site_id");
  CREATE INDEX "submissions_property_idx" ON "submissions" USING btree ("property_id");
  CREATE INDEX "submissions_updated_at_idx" ON "submissions" USING btree ("updated_at");
  CREATE INDEX "submissions_created_at_idx" ON "submissions" USING btree ("created_at");
  CREATE UNIQUE INDEX "amenities_feed_id_idx" ON "amenities" USING btree ("feed_id");
  CREATE INDEX "amenities_updated_at_idx" ON "amenities" USING btree ("updated_at");
  CREATE INDEX "amenities_created_at_idx" ON "amenities" USING btree ("created_at");
  CREATE UNIQUE INDEX "property_types_feed_id_idx" ON "property_types" USING btree ("feed_id");
  CREATE INDEX "property_types_updated_at_idx" ON "property_types" USING btree ("updated_at");
  CREATE INDEX "property_types_created_at_idx" ON "property_types" USING btree ("created_at");
  CREATE INDEX "sites_amenity_presentation_filters_order_idx" ON "sites_amenity_presentation_filters" USING btree ("_order");
  CREATE INDEX "sites_amenity_presentation_filters_parent_id_idx" ON "sites_amenity_presentation_filters" USING btree ("_parent_id");
  CREATE INDEX "sites_amenity_presentation_filters_amenity_idx" ON "sites_amenity_presentation_filters" USING btree ("amenity_id");
  CREATE INDEX "sites_property_type_labels_labels_order_idx" ON "sites_property_type_labels_labels" USING btree ("_order");
  CREATE INDEX "sites_property_type_labels_labels_parent_id_idx" ON "sites_property_type_labels_labels" USING btree ("_parent_id");
  CREATE INDEX "sites_property_type_labels_labels_property_type_idx" ON "sites_property_type_labels_labels" USING btree ("property_type_id");
  CREATE INDEX "sites_forwarding_destinations_order_idx" ON "sites_forwarding_destinations" USING btree ("_order");
  CREATE INDEX "sites_forwarding_destinations_parent_id_idx" ON "sites_forwarding_destinations" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "sites_slug_idx" ON "sites" USING btree ("slug");
  CREATE UNIQUE INDEX "sites_domain_idx" ON "sites" USING btree ("domain");
  CREATE INDEX "sites_updated_at_idx" ON "sites" USING btree ("updated_at");
  CREATE INDEX "sites_created_at_idx" ON "sites" USING btree ("created_at");
  CREATE INDEX "sites_rels_order_idx" ON "sites_rels" USING btree ("order");
  CREATE INDEX "sites_rels_parent_idx" ON "sites_rels" USING btree ("parent_id");
  CREATE INDEX "sites_rels_path_idx" ON "sites_rels" USING btree ("path");
  CREATE INDEX "sites_rels_amenities_id_idx" ON "sites_rels" USING btree ("amenities_id");
  CREATE INDEX "users_tenants_order_idx" ON "users_tenants" USING btree ("_order");
  CREATE INDEX "users_tenants_parent_id_idx" ON "users_tenants" USING btree ("_parent_id");
  CREATE INDEX "users_tenants_site_idx" ON "users_tenants" USING btree ("site_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_entra_oid_idx" ON "users" USING btree ("entra_oid");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "site_readers_site_idx" ON "site_readers" USING btree ("site_id");
  CREATE INDEX "site_readers_updated_at_idx" ON "site_readers" USING btree ("updated_at");
  CREATE INDEX "site_readers_created_at_idx" ON "site_readers" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_properties_id_idx" ON "payload_locked_documents_rels" USING btree ("properties_id");
  CREATE INDEX "payload_locked_documents_rels_locations_id_idx" ON "payload_locked_documents_rels" USING btree ("locations_id");
  CREATE INDEX "payload_locked_documents_rels_specials_id_idx" ON "payload_locked_documents_rels" USING btree ("specials_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_guides_id_idx" ON "payload_locked_documents_rels" USING btree ("guides_id");
  CREATE INDEX "payload_locked_documents_rels_curated_lists_id_idx" ON "payload_locked_documents_rels" USING btree ("curated_lists_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("submissions_id");
  CREATE INDEX "payload_locked_documents_rels_amenities_id_idx" ON "payload_locked_documents_rels" USING btree ("amenities_id");
  CREATE INDEX "payload_locked_documents_rels_property_types_id_idx" ON "payload_locked_documents_rels" USING btree ("property_types_id");
  CREATE INDEX "payload_locked_documents_rels_sites_id_idx" ON "payload_locked_documents_rels" USING btree ("sites_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_site_readers_id_idx" ON "payload_locked_documents_rels" USING btree ("site_readers_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_site_readers_id_idx" ON "payload_preferences_rels" USING btree ("site_readers_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "properties_photos" CASCADE;
  DROP TABLE "properties_rooms_beds" CASCADE;
  DROP TABLE "properties_rooms" CASCADE;
  DROP TABLE "properties_highlights" CASCADE;
  DROP TABLE "properties" CASCADE;
  DROP TABLE "properties_rels" CASCADE;
  DROP TABLE "locations" CASCADE;
  DROP TABLE "locations_rels" CASCADE;
  DROP TABLE "specials" CASCADE;
  DROP TABLE "specials_rels" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "pages_blocks_hero" CASCADE;
  DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_property_grid" CASCADE;
  DROP TABLE "pages_blocks_curated_list_cards" CASCADE;
  DROP TABLE "pages_blocks_call_to_action" CASCADE;
  DROP TABLE "pages_blocks_faq_items" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "_pages_v_blocks_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_property_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_curated_list_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  DROP TABLE "guides" CASCADE;
  DROP TABLE "guides_rels" CASCADE;
  DROP TABLE "_guides_v" CASCADE;
  DROP TABLE "_guides_v_rels" CASCADE;
  DROP TABLE "curated_lists" CASCADE;
  DROP TABLE "curated_lists_rels" CASCADE;
  DROP TABLE "_curated_lists_v" CASCADE;
  DROP TABLE "_curated_lists_v_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "submissions" CASCADE;
  DROP TABLE "amenities" CASCADE;
  DROP TABLE "property_types" CASCADE;
  DROP TABLE "sites_amenity_presentation_filters" CASCADE;
  DROP TABLE "sites_property_type_labels_labels" CASCADE;
  DROP TABLE "sites_forwarding_destinations" CASCADE;
  DROP TABLE "sites" CASCADE;
  DROP TABLE "sites_rels" CASCADE;
  DROP TABLE "users_tenants" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "site_readers" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_properties_status";
  DROP TYPE "public"."enum_locations_level";
  DROP TYPE "public"."enum_locations_status";
  DROP TYPE "public"."enum_specials_status";
  DROP TYPE "public"."enum_reviews_moderation";
  DROP TYPE "public"."enum_reviews_status";
  DROP TYPE "public"."enum_pages_blocks_property_grid_source";
  DROP TYPE "public"."enum_pages_blocks_call_to_action_style";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_blocks_property_grid_source";
  DROP TYPE "public"."enum__pages_v_blocks_call_to_action_style";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum_guides_status";
  DROP TYPE "public"."enum__guides_v_version_status";
  DROP TYPE "public"."enum_curated_lists_sort";
  DROP TYPE "public"."enum_curated_lists_status";
  DROP TYPE "public"."enum__curated_lists_v_version_sort";
  DROP TYPE "public"."enum__curated_lists_v_version_status";
  DROP TYPE "public"."enum_submissions_kind";
  DROP TYPE "public"."enum_submissions_forwarding_status";
  DROP TYPE "public"."enum_amenities_status";
  DROP TYPE "public"."enum_property_types_status";
  DROP TYPE "public"."enum_sites_forwarding_destinations_kind";
  DROP TYPE "public"."enum_sites_forwarding_destinations_type";
  DROP TYPE "public"."enum_users_role";`)
}
