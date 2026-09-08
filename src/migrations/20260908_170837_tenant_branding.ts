import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`tenants\` ADD \`branding_logo_id\` integer REFERENCES media(id);`)
  await db.run(sql`ALTER TABLE \`tenants\` ADD \`branding_icon_id\` integer REFERENCES media(id);`)
  await db.run(sql`ALTER TABLE \`tenants\` ADD \`branding_accent_color\` text;`)
  await db.run(sql`CREATE INDEX \`tenants_branding_branding_logo_idx\` ON \`tenants\` (\`branding_logo_id\`);`)
  await db.run(sql`CREATE INDEX \`tenants_branding_branding_icon_idx\` ON \`tenants\` (\`branding_icon_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_tenants\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`INSERT INTO \`__new_tenants\`("id", "name", "slug", "updated_at", "created_at") SELECT "id", "name", "slug", "updated_at", "created_at" FROM \`tenants\`;`)
  await db.run(sql`DROP TABLE \`tenants\`;`)
  await db.run(sql`ALTER TABLE \`__new_tenants\` RENAME TO \`tenants\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX \`tenants_slug_idx\` ON \`tenants\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`tenants_updated_at_idx\` ON \`tenants\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`tenants_created_at_idx\` ON \`tenants\` (\`created_at\`);`)
}
