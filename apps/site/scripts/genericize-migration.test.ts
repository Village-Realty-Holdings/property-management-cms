import { describe, expect, it } from "vitest"

import { genericizeMigration } from "./genericize-migration"

// The shape `payload migrate:create` writes, cut down.
const generated = `import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql\`
   CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TABLE "pages" ("id" serial PRIMARY KEY NOT NULL);
  ALTER TABLE "pages_v" ADD CONSTRAINT "fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id");\`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql\`
   DROP TABLE "pages" CASCADE;
  DROP TYPE "public"."enum_pages_status";\`)
}
`

describe("genericizeMigration", () => {
  it("removes every explicit public schema qualifier", () => {
    const { source, stripped } = genericizeMigration(generated)
    expect(source).not.toContain('"public".')
    expect(source).toContain('CREATE TYPE "enum_pages_status"')
    expect(source).toContain('REFERENCES "pages"("id")')
    expect(stripped).toBe(3)
  })

  it("makes up() and down() start by pointing the transaction at the Site's schema", () => {
    const { source } = genericizeMigration(generated)
    expect(source).toContain("import { setSiteSchema } from '../setSiteSchema'")
    expect(source).toMatch(
      /export async function up\([^)]*\): Promise<void> \{\n {2}await setSiteSchema\(db, payload\)\n/
    )
    expect(source).toMatch(
      /export async function down\([^)]*\): Promise<void> \{\n {2}await setSiteSchema\(db, payload\)\n/
    )
  })

  it("leaves a migration without qualifiers (an ALTER TABLE change) working", () => {
    const alter = generated.replaceAll('"public".', "")
    const { source, stripped } = genericizeMigration(alter)
    expect(stripped).toBe(0)
    expect(source.match(/await setSiteSchema\(db, payload\)/g)).toHaveLength(2)
  })

  it("does nothing the second time", () => {
    const once = genericizeMigration(generated).source
    const twice = genericizeMigration(once)
    expect(twice.source).toBe(once)
    expect(twice.stripped).toBe(0)
  })

  it("refuses a file that is not a Payload migration", () => {
    expect(() => genericizeMigration("export const x = 1\n")).toThrow(/up\(\)/)
  })
})
