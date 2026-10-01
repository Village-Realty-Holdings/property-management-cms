import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { setSiteSchema } from '../setSiteSchema'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   ALTER TABLE "pages" ADD COLUMN "is_template" boolean DEFAULT false;
  ALTER TABLE "_pages_v" ADD COLUMN "version_is_template" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   ALTER TABLE "pages" DROP COLUMN "is_template";
  ALTER TABLE "_pages_v" DROP COLUMN "version_is_template";`)
}
