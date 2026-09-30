// First, so the Site's modules see DATABASE_SCHEMA when they load.
import { SCHEMA, databaseUrl } from "./env"

import { getPayload, type Payload } from "payload"

import { DEV_STAFF_USER } from "../../../src/auth/devSignIn"
import { findOrCreateStaffUser } from "../../../src/auth/staffUser"
import { importGoogleFont } from "../../../src/fonts/importGoogleFont"
import type { FontKind } from "../../../src/fonts/types"
import { buildPayloadConfig } from "../../../src/payload.config"
import {
  SAMPLE_BLOCKS,
  SAMPLE_PAGE_PATH,
  SAMPLE_PAGE_TITLE,
} from "../../../src/site/dev/samplePage"
import { readSiteTheme, type LiveSiteTheme } from "../../../src/site/read"
import { saveTheme } from "../../../src/theme/record"
import type { ThemeInputs } from "../../../src/theme"

/**
 * The tests' own handle on the scratch Site: the same database and schema the
 * dev server uses, reached through the Local API as the Staff User. Staff
 * writes (saving a Theme, publishing a Page, adding a Font) go through here;
 * everything visitors and Staff see is read back through the browser.
 */

export type ScratchSite = {
  payload: Payload
  staff: Awaited<ReturnType<typeof findOrCreateStaffUser>>
  /** Saves `inputs` as the newest Theme version; it is live at once. */
  saveTheme(inputs: ThemeInputs, note?: string): Promise<void>
  /** The Theme the Site is showing, with the fonts its keys can name. */
  liveTheme(): Promise<LiveSiteTheme>
  /** Publishes the sample Page (or updates it) at `SAMPLE_PAGE_PATH`. */
  publishSamplePage(): Promise<void>
  /** Adds a Google Font unless the Site already has it. Needs network. */
  ensureGoogleFont(
    family: string,
    kind: FontKind,
    weights: readonly number[]
  ): Promise<void>
  close(): Promise<void>
}

export async function openScratchSite(): Promise<ScratchSite> {
  const payload = await getPayload({
    key: `e2e-theme-${SCHEMA}`,
    config: buildPayloadConfig({
      databaseUrl: databaseUrl(),
      schemaName: SCHEMA,
      // The schema is built by `payload migrate`; never push over it.
      push: false,
    }),
  })
  const staff = await findOrCreateStaffUser(payload, DEV_STAFF_USER)
  const user = { ...staff, collection: "users" as const }

  return {
    payload,
    staff,
    async saveTheme(inputs, note) {
      await saveTheme(payload, {
        user,
        inputs,
        note: note ?? null,
      })
    },
    async liveTheme() {
      return readSiteTheme(payload)
    },
    async publishSamplePage() {
      const { docs } = await payload.find({
        collection: "pages",
        where: { path: { equals: SAMPLE_PAGE_PATH } },
        limit: 1,
        draft: true,
      })
      const data = {
        title: SAMPLE_PAGE_TITLE,
        path: SAMPLE_PAGE_PATH,
        layout: SAMPLE_BLOCKS,
        _status: "published" as const,
      }
      if (docs[0]) {
        await payload.update({ collection: "pages", id: docs[0].id, data })
      } else {
        await payload.create({ collection: "pages", data })
      }
    },
    async ensureGoogleFont(family, kind, weights) {
      const existing = await payload.find({
        collection: "fonts",
        where: { family: { equals: family } },
        limit: 1,
      })
      if (existing.docs[0]) return
      await importGoogleFont(payload, { family, kind, weights: [...weights] })
    },
    async close() {
      await payload.destroy()
    },
  }
}
