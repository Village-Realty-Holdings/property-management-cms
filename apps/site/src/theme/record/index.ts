import type { Payload, TypedUser } from "payload"

import type { Theme as ThemeDoc } from "../../payload-types"
import { normalizeInputs, INPUT_LABELS, type ThemeInputs } from "../inputs"
import { FALLBACK_INPUTS } from "./fallback"
import { parseFontKey, storedFontIds } from "./fontKeys"
import { restoreSummary } from "./summary"

export { FALLBACK_INPUTS }

/**
 * The Theme record, server side (apps/site ADR-0004). The Theme goes live on
 * save and keeps every version. Writes run as the Staff User (ADR-0002);
 * reading the live Theme is public.
 */

export type LiveTheme = {
  /** `default` is the Classic preset: no Theme has been saved yet. */
  source: "saved" | "default"
  inputs: ThemeInputs
  /** ISO time of the live version's save, when saved. */
  savedAt: string | null
}

export type ThemeVersion = {
  id: number
  /** ISO time. */
  savedAt: string
  author: { id: number; name: string; email: string | null } | null
  summary: string
  inputs: ThemeInputs
  /** The newest version is the one on the Site. */
  isLive: boolean
  /** Labels of font controls whose stored Font has been deleted since. */
  missingFonts: string[]
}

type Staff = TypedUser

const FONT_KEYS = ["headingFont", "bodyFont"] as const

/** The live Theme, or the Classic preset when none is saved. */
export async function readLiveTheme(payload: Payload): Promise<LiveTheme> {
  const doc = await payload.findGlobal({ slug: "theme", depth: 0 })
  if (!doc.id)
    return { source: "default", inputs: FALLBACK_INPUTS, savedAt: null }
  return {
    source: "saved",
    inputs: normalizeInputs(doc, FALLBACK_INPUTS),
    savedAt: doc.updatedAt ?? null,
  }
}

/**
 * Saves `inputs` as a new version, live at once. `note` replaces the
 * automatic change summary. Throws when a value is invalid.
 */
export async function saveTheme(
  payload: Payload,
  options: { user: Staff; inputs: ThemeInputs; note?: string | null }
): Promise<LiveTheme> {
  await payload.updateGlobal({
    slug: "theme",
    data: { ...options.inputs, note: options.note?.trim() || null },
    depth: 0,
    overrideAccess: false,
    user: options.user,
  })
  return readLiveTheme(payload)
}

/** Every version, newest first (the first is live). Staff only. */
export async function listThemeHistory(
  payload: Payload,
  options: { user: Staff }
): Promise<ThemeVersion[]> {
  const { docs } = await payload.findGlobalVersions({
    slug: "theme",
    depth: 1,
    pagination: false,
    sort: "-id",
    overrideAccess: false,
    user: options.user,
  })
  const fontIds = await storedFontIds(payload)
  return docs.map((entry, index) => {
    const version = entry.version as Partial<ThemeDoc>
    const inputs = normalizeInputs(version, FALLBACK_INPUTS)
    const author = version.updatedBy
    return {
      id: Number(entry.id),
      savedAt: String(entry.createdAt),
      author:
        author && typeof author === "object"
          ? {
              id: author.id,
              name: author.name || author.email,
              email: author.email,
            }
          : null,
      summary: version.changeSummary ?? "",
      inputs,
      isLive: index === 0,
      missingFonts: missingFonts(inputs, fontIds),
    }
  })
}

/**
 * Puts an old version live again by saving it as a new version, so the
 * history only grows. A stored Font the old version used and that was deleted
 * since is replaced by the Classic font, and the summary says so.
 */
export async function restoreThemeVersion(
  payload: Payload,
  options: { user: Staff; versionId: number }
): Promise<LiveTheme> {
  const found = await payload
    .findGlobalVersionByID({
      slug: "theme",
      id: options.versionId,
      depth: 0,
      overrideAccess: false,
      user: options.user,
    })
    .catch((error: unknown) => {
      if ((error as { status?: number }).status === 404) return null
      throw error
    })
  if (!found) throw new Error("That version no longer exists.")

  const old = normalizeInputs(found.version, FALLBACK_INPUTS)
  const missing = missingFonts(old, await storedFontIds(payload))
  const inputs = { ...old }
  for (const key of FONT_KEYS) {
    if (missing.includes(INPUT_LABELS[key])) inputs[key] = FALLBACK_INPUTS[key]
  }
  const live = await readLiveTheme(payload)
  return saveTheme(payload, {
    user: options.user,
    inputs,
    note: restoreSummary(live.inputs, inputs, missing),
  })
}

function missingFonts(
  inputs: ThemeInputs,
  storedIds: ReadonlySet<number>
): string[] {
  return FONT_KEYS.filter((key) => {
    const parsed = parseFontKey(inputs[key])
    return parsed?.kind === "stored" && !storedIds.has(parsed.id)
  }).map((key) => INPUT_LABELS[key])
}
