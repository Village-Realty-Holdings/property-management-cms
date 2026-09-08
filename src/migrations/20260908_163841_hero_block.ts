import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`pages_hero_links\` RENAME TO \`pages_blocks_hero\`;`)
  await db.run(sql`CREATE TABLE \`pages_blocks_hero_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_hero\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_links_order_idx\` ON \`pages_blocks_hero_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_links_parent_id_idx\` ON \`pages_blocks_hero_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_hero_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text,
  	\`link_appearance\` text DEFAULT 'default',
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_hero\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_links_order_idx\` ON \`_pages_v_blocks_hero_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_links_parent_id_idx\` ON \`_pages_v_blocks_hero_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`type\` text DEFAULT 'lowImpact',
  	\`rich_text\` text DEFAULT '{"root":{"type":"root","children":[{"type":"heading","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"Your next stay starts here","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"tag":"h1"},{"type":"paragraph","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"A line or two about the homes, the area and why guests keep coming back.","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"version":1}}',
  	\`media_id\` integer,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_order_idx\` ON \`_pages_v_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_parent_id_idx\` ON \`_pages_v_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_path_idx\` ON \`_pages_v_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_media_idx\` ON \`_pages_v_blocks_hero\` (\`media_id\`);`)
  await db.run(sql`DROP TABLE \`_pages_v_version_hero_links\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`type\` text DEFAULT 'lowImpact',
  	\`rich_text\` text DEFAULT '{"root":{"type":"root","children":[{"type":"heading","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"Your next stay starts here","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"tag":"h1"},{"type":"paragraph","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"A line or two about the homes, the area and why guests keep coming back.","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"version":1}}',
  	\`media_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_hero\`("_order", "_parent_id", "_path", "id", "type", "rich_text", "media_id", "block_name") SELECT "_order", "_parent_id", "_path", "id", "type", "rich_text", "media_id", "block_name" FROM \`pages_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_hero\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_hero\` RENAME TO \`pages_blocks_hero\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_order_idx\` ON \`pages_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_parent_id_idx\` ON \`pages_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_path_idx\` ON \`pages_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_media_idx\` ON \`pages_blocks_hero\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`tenant_id\` integer,
  	\`title\` text,
  	\`meta_title\` text,
  	\`meta_image_id\` integer,
  	\`meta_description\` text,
  	\`published_at\` text,
  	\`generate_slug\` integer DEFAULT true,
  	\`slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`meta_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages\`("id", "tenant_id", "title", "meta_title", "meta_image_id", "meta_description", "published_at", "generate_slug", "slug", "updated_at", "created_at", "_status") SELECT "id", "tenant_id", "title", "meta_title", "meta_image_id", "meta_description", "published_at", "generate_slug", "slug", "updated_at", "created_at", "_status" FROM \`pages\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages\` RENAME TO \`pages\`;`)
  await db.run(sql`CREATE INDEX \`pages_tenant_idx\` ON \`pages\` (\`tenant_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_meta_meta_image_idx\` ON \`pages\` (\`meta_image_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`pages__status_idx\` ON \`pages\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_tenant_id\` integer,
  	\`version_title\` text,
  	\`version_meta_title\` text,
  	\`version_meta_image_id\` integer,
  	\`version_meta_description\` text,
  	\`version_published_at\` text,
  	\`version_generate_slug\` integer DEFAULT true,
  	\`version_slug\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_meta_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v\`("id", "parent_id", "version_tenant_id", "version_title", "version_meta_title", "version_meta_image_id", "version_meta_description", "version_published_at", "version_generate_slug", "version_slug", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest", "autosave") SELECT "id", "parent_id", "version_tenant_id", "version_title", "version_meta_title", "version_meta_image_id", "version_meta_description", "version_published_at", "version_generate_slug", "version_slug", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest", "autosave" FROM \`_pages_v\`;`)
  await db.run(sql`DROP TABLE \`_pages_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v\` RENAME TO \`_pages_v\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_parent_idx\` ON \`_pages_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_tenant_idx\` ON \`_pages_v\` (\`version_tenant_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_meta_version_meta_image_idx\` ON \`_pages_v\` (\`version_meta_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_slug_idx\` ON \`_pages_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_updated_at_idx\` ON \`_pages_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_at_idx\` ON \`_pages_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version__status_idx\` ON \`_pages_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_created_at_idx\` ON \`_pages_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_updated_at_idx\` ON \`_pages_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_latest_idx\` ON \`_pages_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_autosave_idx\` ON \`_pages_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_content_columns\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`size\` text DEFAULT 'full',
  	\`rich_text\` text DEFAULT '{"root":{"type":"root","children":[{"type":"heading","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"A heading for this section","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"tag":"h2"},{"type":"paragraph","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"Write a paragraph or two here. Keep it short and specific: what the home is like, who it suits and what makes the area worth the trip.","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"version":1}}',
  	\`enable_link\` integer,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_content_columns\`("_order", "_parent_id", "id", "size", "rich_text", "enable_link", "link_type", "link_new_tab", "link_url", "link_label", "link_appearance") SELECT "_order", "_parent_id", "id", "size", "rich_text", "enable_link", "link_type", "link_new_tab", "link_url", "link_label", "link_appearance" FROM \`pages_blocks_content_columns\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_columns\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_content_columns\` RENAME TO \`pages_blocks_content_columns\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_order_idx\` ON \`pages_blocks_content_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_parent_id_idx\` ON \`pages_blocks_content_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_cta\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`rich_text\` text DEFAULT '{"root":{"type":"root","children":[{"type":"heading","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"Ready to book your stay?","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"tag":"h2"},{"type":"paragraph","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"Check live availability or talk to the team about the right home for you.","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"version":1}}',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_cta\`("_order", "_parent_id", "_path", "id", "rich_text", "block_name") SELECT "_order", "_parent_id", "_path", "id", "rich_text", "block_name" FROM \`pages_blocks_cta\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_cta\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_cta\` RENAME TO \`pages_blocks_cta\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_order_idx\` ON \`pages_blocks_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_parent_id_idx\` ON \`pages_blocks_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_path_idx\` ON \`pages_blocks_cta\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Section heading',
  	\`subheading\` text DEFAULT 'A sentence that sets up what this section is about.',
  	\`layout\` text DEFAULT 'single',
  	\`width\` text DEFAULT 'container',
  	\`padding\` text DEFAULT 'md',
  	\`background\` text DEFAULT 'none',
  	\`background_image_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`background_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_section\`("_order", "_parent_id", "_path", "id", "heading", "subheading", "layout", "width", "padding", "background", "background_image_id", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "subheading", "layout", "width", "padding", "background", "background_image_id", "block_name" FROM \`pages_blocks_section\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_section\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_section\` RENAME TO \`pages_blocks_section\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_section_order_idx\` ON \`pages_blocks_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_section_parent_id_idx\` ON \`pages_blocks_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_section_path_idx\` ON \`pages_blocks_section\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_section_background_image_idx\` ON \`pages_blocks_section\` (\`background_image_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_gallery\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Photos',
  	\`layout\` text DEFAULT 'grid',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_gallery\`("_order", "_parent_id", "_path", "id", "heading", "layout", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "layout", "block_name" FROM \`pages_blocks_gallery\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_gallery\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_gallery\` RENAME TO \`pages_blocks_gallery\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_order_idx\` ON \`pages_blocks_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_parent_id_idx\` ON \`pages_blocks_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_path_idx\` ON \`pages_blocks_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_location\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Location',
  	\`address_street\` text DEFAULT '123 Ocean Drive',
  	\`address_city\` text DEFAULT 'Seaside',
  	\`address_region\` text DEFAULT 'CA',
  	\`address_postal_code\` text DEFAULT '90000',
  	\`address_country\` text DEFAULT 'USA',
  	\`latitude\` numeric,
  	\`longitude\` numeric,
  	\`zoom\` numeric DEFAULT 14,
  	\`show_map\` integer DEFAULT true,
  	\`notes\` text DEFAULT '{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"Free parking on the driveway. The door code arrives by text on the morning of arrival.","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"version":1}}',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_location\`("_order", "_parent_id", "_path", "id", "heading", "address_street", "address_city", "address_region", "address_postal_code", "address_country", "latitude", "longitude", "zoom", "show_map", "notes", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "address_street", "address_city", "address_region", "address_postal_code", "address_country", "latitude", "longitude", "zoom", "show_map", "notes", "block_name" FROM \`pages_blocks_location\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_location\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_location\` RENAME TO \`pages_blocks_location\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_location_order_idx\` ON \`pages_blocks_location\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_location_parent_id_idx\` ON \`pages_blocks_location\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_location_path_idx\` ON \`pages_blocks_location\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_pricing\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Rates',
  	\`currency\` text DEFAULT 'USD',
  	\`footnote\` text DEFAULT 'Taxes and cleaning fee not included.',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_pricing\`("_order", "_parent_id", "_path", "id", "heading", "currency", "footnote", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "currency", "footnote", "block_name" FROM \`pages_blocks_pricing\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_pricing\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_pricing\` RENAME TO \`pages_blocks_pricing\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_pricing_order_idx\` ON \`pages_blocks_pricing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_pricing_parent_id_idx\` ON \`pages_blocks_pricing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_pricing_path_idx\` ON \`pages_blocks_pricing\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_faq\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Frequently asked questions',
  	\`intro\` text DEFAULT 'Quick answers about booking, arrival and the house rules.',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_faq\`("_order", "_parent_id", "_path", "id", "heading", "intro", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "block_name" FROM \`pages_blocks_faq\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_faq\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_faq\` RENAME TO \`pages_blocks_faq\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_order_idx\` ON \`pages_blocks_faq\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_parent_id_idx\` ON \`pages_blocks_faq\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_path_idx\` ON \`pages_blocks_faq\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_archive\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`intro_content\` text DEFAULT '{"root":{"type":"root","children":[{"type":"heading","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"From the journal","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"tag":"h2"},{"type":"paragraph","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"Local tips, seasonal guides and news from the team.","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"version":1}}',
  	\`populate_by\` text DEFAULT 'collection',
  	\`relation_to\` text DEFAULT 'posts',
  	\`limit\` numeric DEFAULT 10,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_archive\`("_order", "_parent_id", "_path", "id", "intro_content", "populate_by", "relation_to", "limit", "block_name") SELECT "_order", "_parent_id", "_path", "id", "intro_content", "populate_by", "relation_to", "limit", "block_name" FROM \`pages_blocks_archive\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_archive\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_archive\` RENAME TO \`pages_blocks_archive\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_archive_order_idx\` ON \`pages_blocks_archive\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_archive_parent_id_idx\` ON \`pages_blocks_archive\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_archive_path_idx\` ON \`pages_blocks_archive\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_property_listing\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Featured rentals',
  	\`intro\` text DEFAULT 'Hand-picked homes with real-time availability.',
  	\`source\` text DEFAULT 'query',
  	\`query_node_id\` text,
  	\`query_bedrooms\` numeric,
  	\`query_guests\` numeric,
  	\`query_pets\` integer,
  	\`query_featured_only\` integer,
  	\`query_sort\` text DEFAULT 'featured',
  	\`query_limit\` numeric DEFAULT 6,
  	\`query_follow_search_params\` integer,
  	\`view\` text DEFAULT 'grid',
  	\`columns\` text DEFAULT '3',
  	\`detail_page_id\` integer,
  	\`empty_message\` text DEFAULT 'No rentals match. Try different dates or fewer filters.',
  	\`block_name\` text,
  	FOREIGN KEY (\`detail_page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_property_listing\`("_order", "_parent_id", "_path", "id", "heading", "intro", "source", "query_node_id", "query_bedrooms", "query_guests", "query_pets", "query_featured_only", "query_sort", "query_limit", "query_follow_search_params", "view", "columns", "detail_page_id", "empty_message", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "source", "query_node_id", "query_bedrooms", "query_guests", "query_pets", "query_featured_only", "query_sort", "query_limit", "query_follow_search_params", "view", "columns", "detail_page_id", "empty_message", "block_name" FROM \`pages_blocks_property_listing\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_property_listing\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_property_listing\` RENAME TO \`pages_blocks_property_listing\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_property_listing_order_idx\` ON \`pages_blocks_property_listing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_property_listing_parent_id_idx\` ON \`pages_blocks_property_listing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_property_listing_path_idx\` ON \`pages_blocks_property_listing\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_property_listing_detail_page_idx\` ON \`pages_blocks_property_listing\` (\`detail_page_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_booking_steps\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Book in three steps',
  	\`intro\` text DEFAULT 'From first look to front door, booking takes a few minutes.',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_booking_steps\`("_order", "_parent_id", "_path", "id", "heading", "intro", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "block_name" FROM \`pages_blocks_booking_steps\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_booking_steps\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_booking_steps\` RENAME TO \`pages_blocks_booking_steps\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_booking_steps_order_idx\` ON \`pages_blocks_booking_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_booking_steps_parent_id_idx\` ON \`pages_blocks_booking_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_booking_steps_path_idx\` ON \`pages_blocks_booking_steps\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_area_guide\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Explore the area',
  	\`intro\` text DEFAULT 'Beaches, restaurants and things to do, all a short drive from the front door.',
  	\`layout\` text DEFAULT 'cards',
  	\`search_page_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`search_page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_area_guide\`("_order", "_parent_id", "_path", "id", "heading", "intro", "layout", "search_page_id", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "layout", "search_page_id", "block_name" FROM \`pages_blocks_area_guide\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_area_guide\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_area_guide\` RENAME TO \`pages_blocks_area_guide\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_area_guide_order_idx\` ON \`pages_blocks_area_guide\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_area_guide_parent_id_idx\` ON \`pages_blocks_area_guide\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_area_guide_path_idx\` ON \`pages_blocks_area_guide\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_area_guide_search_page_idx\` ON \`pages_blocks_area_guide\` (\`search_page_id\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_content_columns\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`size\` text DEFAULT 'full',
  	\`rich_text\` text DEFAULT '{"root":{"type":"root","children":[{"type":"heading","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"A heading for this section","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"tag":"h2"},{"type":"paragraph","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"Write a paragraph or two here. Keep it short and specific: what the home is like, who it suits and what makes the area worth the trip.","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"version":1}}',
  	\`enable_link\` integer,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text,
  	\`link_appearance\` text DEFAULT 'default',
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_content_columns\`("_order", "_parent_id", "id", "size", "rich_text", "enable_link", "link_type", "link_new_tab", "link_url", "link_label", "link_appearance", "_uuid") SELECT "_order", "_parent_id", "id", "size", "rich_text", "enable_link", "link_type", "link_new_tab", "link_url", "link_label", "link_appearance", "_uuid" FROM \`_pages_v_blocks_content_columns\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_content_columns\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_content_columns\` RENAME TO \`_pages_v_blocks_content_columns\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_columns_order_idx\` ON \`_pages_v_blocks_content_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_columns_parent_id_idx\` ON \`_pages_v_blocks_content_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_cta\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`rich_text\` text DEFAULT '{"root":{"type":"root","children":[{"type":"heading","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"Ready to book your stay?","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"tag":"h2"},{"type":"paragraph","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"Check live availability or talk to the team about the right home for you.","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"version":1}}',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_cta\`("_order", "_parent_id", "_path", "id", "rich_text", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "rich_text", "_uuid", "block_name" FROM \`_pages_v_blocks_cta\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_cta\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_cta\` RENAME TO \`_pages_v_blocks_cta\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_order_idx\` ON \`_pages_v_blocks_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_parent_id_idx\` ON \`_pages_v_blocks_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_path_idx\` ON \`_pages_v_blocks_cta\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Section heading',
  	\`subheading\` text DEFAULT 'A sentence that sets up what this section is about.',
  	\`layout\` text DEFAULT 'single',
  	\`width\` text DEFAULT 'container',
  	\`padding\` text DEFAULT 'md',
  	\`background\` text DEFAULT 'none',
  	\`background_image_id\` integer,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`background_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_section\`("_order", "_parent_id", "_path", "id", "heading", "subheading", "layout", "width", "padding", "background", "background_image_id", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "subheading", "layout", "width", "padding", "background", "background_image_id", "_uuid", "block_name" FROM \`_pages_v_blocks_section\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_section\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_section\` RENAME TO \`_pages_v_blocks_section\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_section_order_idx\` ON \`_pages_v_blocks_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_section_parent_id_idx\` ON \`_pages_v_blocks_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_section_path_idx\` ON \`_pages_v_blocks_section\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_section_background_image_idx\` ON \`_pages_v_blocks_section\` (\`background_image_id\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_gallery\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Photos',
  	\`layout\` text DEFAULT 'grid',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_gallery\`("_order", "_parent_id", "_path", "id", "heading", "layout", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "layout", "_uuid", "block_name" FROM \`_pages_v_blocks_gallery\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_gallery\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_gallery\` RENAME TO \`_pages_v_blocks_gallery\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_order_idx\` ON \`_pages_v_blocks_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_parent_id_idx\` ON \`_pages_v_blocks_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_path_idx\` ON \`_pages_v_blocks_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_location\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Location',
  	\`address_street\` text DEFAULT '123 Ocean Drive',
  	\`address_city\` text DEFAULT 'Seaside',
  	\`address_region\` text DEFAULT 'CA',
  	\`address_postal_code\` text DEFAULT '90000',
  	\`address_country\` text DEFAULT 'USA',
  	\`latitude\` numeric,
  	\`longitude\` numeric,
  	\`zoom\` numeric DEFAULT 14,
  	\`show_map\` integer DEFAULT true,
  	\`notes\` text DEFAULT '{"root":{"type":"root","children":[{"type":"paragraph","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"Free parking on the driveway. The door code arrives by text on the morning of arrival.","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"version":1}}',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_location\`("_order", "_parent_id", "_path", "id", "heading", "address_street", "address_city", "address_region", "address_postal_code", "address_country", "latitude", "longitude", "zoom", "show_map", "notes", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "address_street", "address_city", "address_region", "address_postal_code", "address_country", "latitude", "longitude", "zoom", "show_map", "notes", "_uuid", "block_name" FROM \`_pages_v_blocks_location\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_location\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_location\` RENAME TO \`_pages_v_blocks_location\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_location_order_idx\` ON \`_pages_v_blocks_location\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_location_parent_id_idx\` ON \`_pages_v_blocks_location\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_location_path_idx\` ON \`_pages_v_blocks_location\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_pricing\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Rates',
  	\`currency\` text DEFAULT 'USD',
  	\`footnote\` text DEFAULT 'Taxes and cleaning fee not included.',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_pricing\`("_order", "_parent_id", "_path", "id", "heading", "currency", "footnote", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "currency", "footnote", "_uuid", "block_name" FROM \`_pages_v_blocks_pricing\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_pricing\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_pricing\` RENAME TO \`_pages_v_blocks_pricing\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_pricing_order_idx\` ON \`_pages_v_blocks_pricing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_pricing_parent_id_idx\` ON \`_pages_v_blocks_pricing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_pricing_path_idx\` ON \`_pages_v_blocks_pricing\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_faq\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Frequently asked questions',
  	\`intro\` text DEFAULT 'Quick answers about booking, arrival and the house rules.',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_faq\`("_order", "_parent_id", "_path", "id", "heading", "intro", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "_uuid", "block_name" FROM \`_pages_v_blocks_faq\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_faq\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_faq\` RENAME TO \`_pages_v_blocks_faq\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_order_idx\` ON \`_pages_v_blocks_faq\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_parent_id_idx\` ON \`_pages_v_blocks_faq\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_path_idx\` ON \`_pages_v_blocks_faq\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_archive\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`intro_content\` text DEFAULT '{"root":{"type":"root","children":[{"type":"heading","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"From the journal","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"tag":"h2"},{"type":"paragraph","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"Local tips, seasonal guides and news from the team.","version":1}],"direction":"ltr","format":"","indent":0,"version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"version":1}}',
  	\`populate_by\` text DEFAULT 'collection',
  	\`relation_to\` text DEFAULT 'posts',
  	\`limit\` numeric DEFAULT 10,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_archive\`("_order", "_parent_id", "_path", "id", "intro_content", "populate_by", "relation_to", "limit", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "intro_content", "populate_by", "relation_to", "limit", "_uuid", "block_name" FROM \`_pages_v_blocks_archive\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_archive\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_archive\` RENAME TO \`_pages_v_blocks_archive\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_archive_order_idx\` ON \`_pages_v_blocks_archive\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_archive_parent_id_idx\` ON \`_pages_v_blocks_archive\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_archive_path_idx\` ON \`_pages_v_blocks_archive\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_property_listing\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Featured rentals',
  	\`intro\` text DEFAULT 'Hand-picked homes with real-time availability.',
  	\`source\` text DEFAULT 'query',
  	\`query_node_id\` text,
  	\`query_bedrooms\` numeric,
  	\`query_guests\` numeric,
  	\`query_pets\` integer,
  	\`query_featured_only\` integer,
  	\`query_sort\` text DEFAULT 'featured',
  	\`query_limit\` numeric DEFAULT 6,
  	\`query_follow_search_params\` integer,
  	\`view\` text DEFAULT 'grid',
  	\`columns\` text DEFAULT '3',
  	\`detail_page_id\` integer,
  	\`empty_message\` text DEFAULT 'No rentals match. Try different dates or fewer filters.',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`detail_page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_property_listing\`("_order", "_parent_id", "_path", "id", "heading", "intro", "source", "query_node_id", "query_bedrooms", "query_guests", "query_pets", "query_featured_only", "query_sort", "query_limit", "query_follow_search_params", "view", "columns", "detail_page_id", "empty_message", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "source", "query_node_id", "query_bedrooms", "query_guests", "query_pets", "query_featured_only", "query_sort", "query_limit", "query_follow_search_params", "view", "columns", "detail_page_id", "empty_message", "_uuid", "block_name" FROM \`_pages_v_blocks_property_listing\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_property_listing\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_property_listing\` RENAME TO \`_pages_v_blocks_property_listing\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_property_listing_order_idx\` ON \`_pages_v_blocks_property_listing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_property_listing_parent_id_idx\` ON \`_pages_v_blocks_property_listing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_property_listing_path_idx\` ON \`_pages_v_blocks_property_listing\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_property_listing_detail_page_idx\` ON \`_pages_v_blocks_property_listing\` (\`detail_page_id\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_booking_steps\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Book in three steps',
  	\`intro\` text DEFAULT 'From first look to front door, booking takes a few minutes.',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_booking_steps\`("_order", "_parent_id", "_path", "id", "heading", "intro", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "_uuid", "block_name" FROM \`_pages_v_blocks_booking_steps\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_booking_steps\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_booking_steps\` RENAME TO \`_pages_v_blocks_booking_steps\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_booking_steps_order_idx\` ON \`_pages_v_blocks_booking_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_booking_steps_parent_id_idx\` ON \`_pages_v_blocks_booking_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_booking_steps_path_idx\` ON \`_pages_v_blocks_booking_steps\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_area_guide\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Explore the area',
  	\`intro\` text DEFAULT 'Beaches, restaurants and things to do, all a short drive from the front door.',
  	\`layout\` text DEFAULT 'cards',
  	\`search_page_id\` integer,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`search_page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_area_guide\`("_order", "_parent_id", "_path", "id", "heading", "intro", "layout", "search_page_id", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "layout", "search_page_id", "_uuid", "block_name" FROM \`_pages_v_blocks_area_guide\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_area_guide\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_area_guide\` RENAME TO \`_pages_v_blocks_area_guide\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_area_guide_order_idx\` ON \`_pages_v_blocks_area_guide\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_area_guide_parent_id_idx\` ON \`_pages_v_blocks_area_guide\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_area_guide_path_idx\` ON \`_pages_v_blocks_area_guide\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_area_guide_search_page_idx\` ON \`_pages_v_blocks_area_guide\` (\`search_page_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_hero_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_hero_links_order_idx\` ON \`pages_hero_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_hero_links_parent_id_idx\` ON \`pages_hero_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_version_hero_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text,
  	\`link_appearance\` text DEFAULT 'default',
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_version_hero_links_order_idx\` ON \`_pages_v_version_hero_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_hero_links_parent_id_idx\` ON \`_pages_v_version_hero_links\` (\`_parent_id\`);`)
  await db.run(sql`DROP TABLE \`pages_blocks_hero_links\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_hero_links\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_hero\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_content_columns\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`size\` text DEFAULT 'full',
  	\`rich_text\` text,
  	\`enable_link\` integer,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text,
  	\`link_appearance\` text DEFAULT 'default',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_content_columns\`("_order", "_parent_id", "id", "size", "rich_text", "enable_link", "link_type", "link_new_tab", "link_url", "link_label", "link_appearance") SELECT "_order", "_parent_id", "id", "size", "rich_text", "enable_link", "link_type", "link_new_tab", "link_url", "link_label", "link_appearance" FROM \`pages_blocks_content_columns\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_columns\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_content_columns\` RENAME TO \`pages_blocks_content_columns\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_order_idx\` ON \`pages_blocks_content_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_parent_id_idx\` ON \`pages_blocks_content_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_cta\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`rich_text\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_cta\`("_order", "_parent_id", "_path", "id", "rich_text", "block_name") SELECT "_order", "_parent_id", "_path", "id", "rich_text", "block_name" FROM \`pages_blocks_cta\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_cta\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_cta\` RENAME TO \`pages_blocks_cta\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_order_idx\` ON \`pages_blocks_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_parent_id_idx\` ON \`pages_blocks_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_cta_path_idx\` ON \`pages_blocks_cta\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`subheading\` text,
  	\`layout\` text DEFAULT 'single',
  	\`width\` text DEFAULT 'container',
  	\`padding\` text DEFAULT 'md',
  	\`background\` text DEFAULT 'none',
  	\`background_image_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`background_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_section\`("_order", "_parent_id", "_path", "id", "heading", "subheading", "layout", "width", "padding", "background", "background_image_id", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "subheading", "layout", "width", "padding", "background", "background_image_id", "block_name" FROM \`pages_blocks_section\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_section\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_section\` RENAME TO \`pages_blocks_section\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_section_order_idx\` ON \`pages_blocks_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_section_parent_id_idx\` ON \`pages_blocks_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_section_path_idx\` ON \`pages_blocks_section\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_section_background_image_idx\` ON \`pages_blocks_section\` (\`background_image_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_gallery\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`layout\` text DEFAULT 'grid',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_gallery\`("_order", "_parent_id", "_path", "id", "heading", "layout", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "layout", "block_name" FROM \`pages_blocks_gallery\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_gallery\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_gallery\` RENAME TO \`pages_blocks_gallery\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_order_idx\` ON \`pages_blocks_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_parent_id_idx\` ON \`pages_blocks_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_gallery_path_idx\` ON \`pages_blocks_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_location\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Location',
  	\`address_street\` text,
  	\`address_city\` text,
  	\`address_region\` text,
  	\`address_postal_code\` text,
  	\`address_country\` text,
  	\`latitude\` numeric,
  	\`longitude\` numeric,
  	\`zoom\` numeric DEFAULT 14,
  	\`show_map\` integer DEFAULT true,
  	\`notes\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_location\`("_order", "_parent_id", "_path", "id", "heading", "address_street", "address_city", "address_region", "address_postal_code", "address_country", "latitude", "longitude", "zoom", "show_map", "notes", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "address_street", "address_city", "address_region", "address_postal_code", "address_country", "latitude", "longitude", "zoom", "show_map", "notes", "block_name" FROM \`pages_blocks_location\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_location\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_location\` RENAME TO \`pages_blocks_location\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_location_order_idx\` ON \`pages_blocks_location\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_location_parent_id_idx\` ON \`pages_blocks_location\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_location_path_idx\` ON \`pages_blocks_location\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_pricing\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Rates',
  	\`currency\` text DEFAULT 'USD',
  	\`footnote\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_pricing\`("_order", "_parent_id", "_path", "id", "heading", "currency", "footnote", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "currency", "footnote", "block_name" FROM \`pages_blocks_pricing\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_pricing\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_pricing\` RENAME TO \`pages_blocks_pricing\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_pricing_order_idx\` ON \`pages_blocks_pricing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_pricing_parent_id_idx\` ON \`pages_blocks_pricing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_pricing_path_idx\` ON \`pages_blocks_pricing\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_faq\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Frequently asked questions',
  	\`intro\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_faq\`("_order", "_parent_id", "_path", "id", "heading", "intro", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "block_name" FROM \`pages_blocks_faq\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_faq\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_faq\` RENAME TO \`pages_blocks_faq\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_order_idx\` ON \`pages_blocks_faq\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_parent_id_idx\` ON \`pages_blocks_faq\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_faq_path_idx\` ON \`pages_blocks_faq\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_archive\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`intro_content\` text,
  	\`populate_by\` text DEFAULT 'collection',
  	\`relation_to\` text DEFAULT 'posts',
  	\`limit\` numeric DEFAULT 10,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_archive\`("_order", "_parent_id", "_path", "id", "intro_content", "populate_by", "relation_to", "limit", "block_name") SELECT "_order", "_parent_id", "_path", "id", "intro_content", "populate_by", "relation_to", "limit", "block_name" FROM \`pages_blocks_archive\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_archive\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_archive\` RENAME TO \`pages_blocks_archive\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_archive_order_idx\` ON \`pages_blocks_archive\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_archive_parent_id_idx\` ON \`pages_blocks_archive\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_archive_path_idx\` ON \`pages_blocks_archive\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_property_listing\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Featured rentals',
  	\`intro\` text,
  	\`source\` text DEFAULT 'query',
  	\`query_node_id\` text,
  	\`query_bedrooms\` numeric,
  	\`query_guests\` numeric,
  	\`query_pets\` integer,
  	\`query_featured_only\` integer,
  	\`query_sort\` text DEFAULT 'featured',
  	\`query_limit\` numeric DEFAULT 6,
  	\`query_follow_search_params\` integer,
  	\`view\` text DEFAULT 'grid',
  	\`columns\` text DEFAULT '3',
  	\`detail_page_id\` integer,
  	\`empty_message\` text DEFAULT 'No rentals match. Try different dates or fewer filters.',
  	\`block_name\` text,
  	FOREIGN KEY (\`detail_page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_property_listing\`("_order", "_parent_id", "_path", "id", "heading", "intro", "source", "query_node_id", "query_bedrooms", "query_guests", "query_pets", "query_featured_only", "query_sort", "query_limit", "query_follow_search_params", "view", "columns", "detail_page_id", "empty_message", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "source", "query_node_id", "query_bedrooms", "query_guests", "query_pets", "query_featured_only", "query_sort", "query_limit", "query_follow_search_params", "view", "columns", "detail_page_id", "empty_message", "block_name" FROM \`pages_blocks_property_listing\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_property_listing\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_property_listing\` RENAME TO \`pages_blocks_property_listing\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_property_listing_order_idx\` ON \`pages_blocks_property_listing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_property_listing_parent_id_idx\` ON \`pages_blocks_property_listing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_property_listing_path_idx\` ON \`pages_blocks_property_listing\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_property_listing_detail_page_idx\` ON \`pages_blocks_property_listing\` (\`detail_page_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_booking_steps\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Book in three steps',
  	\`intro\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_booking_steps\`("_order", "_parent_id", "_path", "id", "heading", "intro", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "block_name" FROM \`pages_blocks_booking_steps\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_booking_steps\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_booking_steps\` RENAME TO \`pages_blocks_booking_steps\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_booking_steps_order_idx\` ON \`pages_blocks_booking_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_booking_steps_parent_id_idx\` ON \`pages_blocks_booking_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_booking_steps_path_idx\` ON \`pages_blocks_booking_steps\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new_pages_blocks_area_guide\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Explore the area',
  	\`intro\` text,
  	\`layout\` text DEFAULT 'cards',
  	\`search_page_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`search_page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pages_blocks_area_guide\`("_order", "_parent_id", "_path", "id", "heading", "intro", "layout", "search_page_id", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "layout", "search_page_id", "block_name" FROM \`pages_blocks_area_guide\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_area_guide\`;`)
  await db.run(sql`ALTER TABLE \`__new_pages_blocks_area_guide\` RENAME TO \`pages_blocks_area_guide\`;`)
  await db.run(sql`CREATE INDEX \`pages_blocks_area_guide_order_idx\` ON \`pages_blocks_area_guide\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_area_guide_parent_id_idx\` ON \`pages_blocks_area_guide\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_area_guide_path_idx\` ON \`pages_blocks_area_guide\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_area_guide_search_page_idx\` ON \`pages_blocks_area_guide\` (\`search_page_id\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_content_columns\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`size\` text DEFAULT 'full',
  	\`rich_text\` text,
  	\`enable_link\` integer,
  	\`link_type\` text DEFAULT 'reference',
  	\`link_new_tab\` integer,
  	\`link_url\` text,
  	\`link_label\` text,
  	\`link_appearance\` text DEFAULT 'default',
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_content_columns\`("_order", "_parent_id", "id", "size", "rich_text", "enable_link", "link_type", "link_new_tab", "link_url", "link_label", "link_appearance", "_uuid") SELECT "_order", "_parent_id", "id", "size", "rich_text", "enable_link", "link_type", "link_new_tab", "link_url", "link_label", "link_appearance", "_uuid" FROM \`_pages_v_blocks_content_columns\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_content_columns\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_content_columns\` RENAME TO \`_pages_v_blocks_content_columns\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_columns_order_idx\` ON \`_pages_v_blocks_content_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_columns_parent_id_idx\` ON \`_pages_v_blocks_content_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_cta\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`rich_text\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_cta\`("_order", "_parent_id", "_path", "id", "rich_text", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "rich_text", "_uuid", "block_name" FROM \`_pages_v_blocks_cta\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_cta\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_cta\` RENAME TO \`_pages_v_blocks_cta\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_order_idx\` ON \`_pages_v_blocks_cta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_parent_id_idx\` ON \`_pages_v_blocks_cta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_cta_path_idx\` ON \`_pages_v_blocks_cta\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`subheading\` text,
  	\`layout\` text DEFAULT 'single',
  	\`width\` text DEFAULT 'container',
  	\`padding\` text DEFAULT 'md',
  	\`background\` text DEFAULT 'none',
  	\`background_image_id\` integer,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`background_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_section\`("_order", "_parent_id", "_path", "id", "heading", "subheading", "layout", "width", "padding", "background", "background_image_id", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "subheading", "layout", "width", "padding", "background", "background_image_id", "_uuid", "block_name" FROM \`_pages_v_blocks_section\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_section\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_section\` RENAME TO \`_pages_v_blocks_section\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_section_order_idx\` ON \`_pages_v_blocks_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_section_parent_id_idx\` ON \`_pages_v_blocks_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_section_path_idx\` ON \`_pages_v_blocks_section\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_section_background_image_idx\` ON \`_pages_v_blocks_section\` (\`background_image_id\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_gallery\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`layout\` text DEFAULT 'grid',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_gallery\`("_order", "_parent_id", "_path", "id", "heading", "layout", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "layout", "_uuid", "block_name" FROM \`_pages_v_blocks_gallery\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_gallery\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_gallery\` RENAME TO \`_pages_v_blocks_gallery\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_order_idx\` ON \`_pages_v_blocks_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_parent_id_idx\` ON \`_pages_v_blocks_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_gallery_path_idx\` ON \`_pages_v_blocks_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_location\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Location',
  	\`address_street\` text,
  	\`address_city\` text,
  	\`address_region\` text,
  	\`address_postal_code\` text,
  	\`address_country\` text,
  	\`latitude\` numeric,
  	\`longitude\` numeric,
  	\`zoom\` numeric DEFAULT 14,
  	\`show_map\` integer DEFAULT true,
  	\`notes\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_location\`("_order", "_parent_id", "_path", "id", "heading", "address_street", "address_city", "address_region", "address_postal_code", "address_country", "latitude", "longitude", "zoom", "show_map", "notes", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "address_street", "address_city", "address_region", "address_postal_code", "address_country", "latitude", "longitude", "zoom", "show_map", "notes", "_uuid", "block_name" FROM \`_pages_v_blocks_location\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_location\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_location\` RENAME TO \`_pages_v_blocks_location\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_location_order_idx\` ON \`_pages_v_blocks_location\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_location_parent_id_idx\` ON \`_pages_v_blocks_location\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_location_path_idx\` ON \`_pages_v_blocks_location\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_pricing\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Rates',
  	\`currency\` text DEFAULT 'USD',
  	\`footnote\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_pricing\`("_order", "_parent_id", "_path", "id", "heading", "currency", "footnote", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "currency", "footnote", "_uuid", "block_name" FROM \`_pages_v_blocks_pricing\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_pricing\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_pricing\` RENAME TO \`_pages_v_blocks_pricing\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_pricing_order_idx\` ON \`_pages_v_blocks_pricing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_pricing_parent_id_idx\` ON \`_pages_v_blocks_pricing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_pricing_path_idx\` ON \`_pages_v_blocks_pricing\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_faq\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Frequently asked questions',
  	\`intro\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_faq\`("_order", "_parent_id", "_path", "id", "heading", "intro", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "_uuid", "block_name" FROM \`_pages_v_blocks_faq\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_faq\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_faq\` RENAME TO \`_pages_v_blocks_faq\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_order_idx\` ON \`_pages_v_blocks_faq\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_parent_id_idx\` ON \`_pages_v_blocks_faq\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_faq_path_idx\` ON \`_pages_v_blocks_faq\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_archive\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`intro_content\` text,
  	\`populate_by\` text DEFAULT 'collection',
  	\`relation_to\` text DEFAULT 'posts',
  	\`limit\` numeric DEFAULT 10,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_archive\`("_order", "_parent_id", "_path", "id", "intro_content", "populate_by", "relation_to", "limit", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "intro_content", "populate_by", "relation_to", "limit", "_uuid", "block_name" FROM \`_pages_v_blocks_archive\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_archive\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_archive\` RENAME TO \`_pages_v_blocks_archive\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_archive_order_idx\` ON \`_pages_v_blocks_archive\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_archive_parent_id_idx\` ON \`_pages_v_blocks_archive\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_archive_path_idx\` ON \`_pages_v_blocks_archive\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_property_listing\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Featured rentals',
  	\`intro\` text,
  	\`source\` text DEFAULT 'query',
  	\`query_node_id\` text,
  	\`query_bedrooms\` numeric,
  	\`query_guests\` numeric,
  	\`query_pets\` integer,
  	\`query_featured_only\` integer,
  	\`query_sort\` text DEFAULT 'featured',
  	\`query_limit\` numeric DEFAULT 6,
  	\`query_follow_search_params\` integer,
  	\`view\` text DEFAULT 'grid',
  	\`columns\` text DEFAULT '3',
  	\`detail_page_id\` integer,
  	\`empty_message\` text DEFAULT 'No rentals match. Try different dates or fewer filters.',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`detail_page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_property_listing\`("_order", "_parent_id", "_path", "id", "heading", "intro", "source", "query_node_id", "query_bedrooms", "query_guests", "query_pets", "query_featured_only", "query_sort", "query_limit", "query_follow_search_params", "view", "columns", "detail_page_id", "empty_message", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "source", "query_node_id", "query_bedrooms", "query_guests", "query_pets", "query_featured_only", "query_sort", "query_limit", "query_follow_search_params", "view", "columns", "detail_page_id", "empty_message", "_uuid", "block_name" FROM \`_pages_v_blocks_property_listing\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_property_listing\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_property_listing\` RENAME TO \`_pages_v_blocks_property_listing\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_property_listing_order_idx\` ON \`_pages_v_blocks_property_listing\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_property_listing_parent_id_idx\` ON \`_pages_v_blocks_property_listing\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_property_listing_path_idx\` ON \`_pages_v_blocks_property_listing\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_property_listing_detail_page_idx\` ON \`_pages_v_blocks_property_listing\` (\`detail_page_id\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_booking_steps\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Book in three steps',
  	\`intro\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_booking_steps\`("_order", "_parent_id", "_path", "id", "heading", "intro", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "_uuid", "block_name" FROM \`_pages_v_blocks_booking_steps\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_booking_steps\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_booking_steps\` RENAME TO \`_pages_v_blocks_booking_steps\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_booking_steps_order_idx\` ON \`_pages_v_blocks_booking_steps\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_booking_steps_parent_id_idx\` ON \`_pages_v_blocks_booking_steps\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_booking_steps_path_idx\` ON \`_pages_v_blocks_booking_steps\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`__new__pages_v_blocks_area_guide\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Explore the area',
  	\`intro\` text,
  	\`layout\` text DEFAULT 'cards',
  	\`search_page_id\` integer,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`search_page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new__pages_v_blocks_area_guide\`("_order", "_parent_id", "_path", "id", "heading", "intro", "layout", "search_page_id", "_uuid", "block_name") SELECT "_order", "_parent_id", "_path", "id", "heading", "intro", "layout", "search_page_id", "_uuid", "block_name" FROM \`_pages_v_blocks_area_guide\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_area_guide\`;`)
  await db.run(sql`ALTER TABLE \`__new__pages_v_blocks_area_guide\` RENAME TO \`_pages_v_blocks_area_guide\`;`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_area_guide_order_idx\` ON \`_pages_v_blocks_area_guide\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_area_guide_parent_id_idx\` ON \`_pages_v_blocks_area_guide\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_area_guide_path_idx\` ON \`_pages_v_blocks_area_guide\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_area_guide_search_page_idx\` ON \`_pages_v_blocks_area_guide\` (\`search_page_id\`);`)
  await db.run(sql`ALTER TABLE \`pages\` ADD \`hero_type\` text DEFAULT 'lowImpact';`)
  await db.run(sql`ALTER TABLE \`pages\` ADD \`hero_rich_text\` text;`)
  await db.run(sql`ALTER TABLE \`pages\` ADD \`hero_media_id\` integer REFERENCES media(id);`)
  await db.run(sql`CREATE INDEX \`pages_hero_hero_media_idx\` ON \`pages\` (\`hero_media_id\`);`)
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`version_hero_type\` text DEFAULT 'lowImpact';`)
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`version_hero_rich_text\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`version_hero_media_id\` integer REFERENCES media(id);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_hero_version_hero_media_idx\` ON \`_pages_v\` (\`version_hero_media_id\`);`)
}
