import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`pages_slug_idx\`;`)
  await db.run(sql`CREATE UNIQUE INDEX \`tenant_slug_idx\` ON \`pages\` (\`tenant_id\`,\`slug\`);`)
  await db.run(sql`CREATE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`DROP INDEX \`posts_slug_idx\`;`)
  await db.run(sql`CREATE INDEX \`posts_slug_idx\` ON \`posts\` (\`slug\`);`)
  // Payload cannot declare a second compound index named `tenant_slug_idx`; posts get theirs by hand.
  await db.run(sql`CREATE UNIQUE INDEX \`posts_tenant_slug_idx\` ON \`posts\` (\`tenant_id\`,\`slug\`);`)
  await db.run(sql`ALTER TABLE \`tenants\` ADD \`copy_from_id\` integer REFERENCES tenants(id);`)
  await db.run(sql`CREATE INDEX \`tenants_copy_from_idx\` ON \`tenants\` (\`copy_from_id\`);`)
  await db.run(sql`CREATE INDEX \`version_tenant_version_slug_idx\` ON \`_pages_v\` (\`version_tenant_id\`,\`version_slug\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`posts_tenant_slug_idx\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_tenants\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`branding_logo_id\` integer,
  	\`branding_icon_id\` integer,
  	\`branding_accent_color\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`branding_logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`branding_icon_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_tenants\`("id", "name", "slug", "branding_logo_id", "branding_icon_id", "branding_accent_color", "updated_at", "created_at") SELECT "id", "name", "slug", "branding_logo_id", "branding_icon_id", "branding_accent_color", "updated_at", "created_at" FROM \`tenants\`;`)
  await db.run(sql`DROP TABLE \`tenants\`;`)
  await db.run(sql`ALTER TABLE \`__new_tenants\` RENAME TO \`tenants\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX \`tenants_slug_idx\` ON \`tenants\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`tenants_branding_branding_logo_idx\` ON \`tenants\` (\`branding_logo_id\`);`)
  await db.run(sql`CREATE INDEX \`tenants_branding_branding_icon_idx\` ON \`tenants\` (\`branding_icon_id\`);`)
  await db.run(sql`CREATE INDEX \`tenants_updated_at_idx\` ON \`tenants\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`tenants_created_at_idx\` ON \`tenants\` (\`created_at\`);`)
  await db.run(sql`DROP INDEX \`tenant_slug_idx\`;`)
  await db.run(sql`DROP INDEX \`pages_slug_idx\`;`)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`DROP INDEX \`version_tenant_version_slug_idx\`;`)
  await db.run(sql`DROP INDEX \`posts_slug_idx\`;`)
  await db.run(sql`CREATE UNIQUE INDEX \`posts_slug_idx\` ON \`posts\` (\`slug\`);`)
}
