import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

import { setSiteSchema } from "../setSiteSchema"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TABLE "saved_themes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"inputs" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "saved_themes_id" integer;
  CREATE UNIQUE INDEX "saved_themes_name_idx" ON "saved_themes" USING btree ("name");
  CREATE INDEX "saved_themes_updated_at_idx" ON "saved_themes" USING btree ("updated_at");
  CREATE INDEX "saved_themes_created_at_idx" ON "saved_themes" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_saved_themes_fk" FOREIGN KEY ("saved_themes_id") REFERENCES "saved_themes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_saved_themes_id_idx" ON "payload_locked_documents_rels" USING btree ("saved_themes_id");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   ALTER TABLE "saved_themes" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "saved_themes" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_saved_themes_fk";
  
  DROP INDEX "payload_locked_documents_rels_saved_themes_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "saved_themes_id";`)
}
