import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`header\` ADD \`logo_id\` integer REFERENCES media(id);`)
  await db.run(sql`CREATE INDEX \`header_logo_idx\` ON \`header\` (\`logo_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_header\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`tenant_id\` integer,
  	\`brand\` text,
  	\`cta_link_label\` text,
  	\`cta_link_url\` text,
  	\`cta_link_new_tab\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_header\`("id", "tenant_id", "brand", "cta_link_label", "cta_link_url", "cta_link_new_tab", "updated_at", "created_at") SELECT "id", "tenant_id", "brand", "cta_link_label", "cta_link_url", "cta_link_new_tab", "updated_at", "created_at" FROM \`header\`;`)
  await db.run(sql`DROP TABLE \`header\`;`)
  await db.run(sql`ALTER TABLE \`__new_header\` RENAME TO \`header\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX \`header_tenant_idx\` ON \`header\` (\`tenant_id\`);`)
  await db.run(sql`CREATE INDEX \`header_updated_at_idx\` ON \`header\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`header_created_at_idx\` ON \`header\` (\`created_at\`);`)
}
