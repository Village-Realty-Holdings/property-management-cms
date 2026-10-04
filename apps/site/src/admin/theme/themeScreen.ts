import type { Payload } from "payload"

import { getAvailableFonts } from "../../fonts/available"
import type { User } from "../../payload-types"
import { INPUT_LABELS, type ThemeInputs } from "../../theme"
import {
  FALLBACK_INPUTS,
  listThemeHistory,
  readLiveTheme,
  restoreThemeVersion,
  saveTheme,
} from "../../theme/record"
import { staleSaveRefusal, readRevision } from "../revision"
import type { RevisionResult, SaveGuard } from "../staleSave"
import { themeSummaryOf, type ThemeSummary } from "../dashboard/site"
import { formStateFromError, type FormState } from "../formState"
import { themeDetails, type DetailRow } from "./themeDetails"

/**
 * What the Theme screen reads and does, through the Local API as the
 * User (apps/site ADR-0002): the Server Actions pass the user's `as`. Kept
 * apart from the actions so it runs in tests without Next.
 */

const FONT_INPUTS = ["headingFont", "bodyFont"] as const

/** The Local API options of a signed-in User (see UserContext). */
export type UserAccess = {
  overrideAccess: false
  user: User & { collection: "users" }
}

/** One saved version, as the History list shows it. */
export type HistoryRow = {
  id: number
  /** ISO time of the save; History shows it in the viewer's time zone. */
  savedAt: string
  /** Who saved it; null when that user has been deleted. */
  author: string | null
  /** What changed, or the User's note. */
  summary: string
  /** The newest version is the one on the Site. */
  isLive: boolean
  /** Labels of Font controls whose Font was deleted since. */
  missingFonts: string[]
  /**
   * What restoring puts in those slots: the Classic font's family, named in
   * the confirm dialog before the save.
   */
  substitutions: { label: string; family: string }[]
}

export type ThemeScreen = {
  /** False while the Site still uses the default preset. */
  saved: boolean
  summary: ThemeSummary
  details: DetailRow[]
  history: HistoryRow[]
}

/** What a Theme save or restore answers, with the new revision. */
export type ThemeSaveResult = FormState & RevisionResult

const GONE = "That version no longer exists."

/** The family a restore uses in the Font control called `label`. */
export function substituteFamily(label: string): string {
  const key = FONT_INPUTS.find((input) => INPUT_LABELS[input] === label)
  const fallback = key ? FALLBACK_INPUTS[key] : FALLBACK_INPUTS.bodyFont
  return fallback.slice(fallback.indexOf(":") + 1)
}

/** What the toast says when a save would change nothing. */
export const NO_CHANGES_MESSAGE = "No changes to save"

/**
 * Saves the Theme as the User: it is live on the Site at once. A save
 * that changes nothing makes no version and says so.
 */
export async function saveThemeAs(
  payload: Payload,
  access: UserAccess,
  inputs: ThemeInputs,
  note?: string | null,
  guard: SaveGuard = {}
): Promise<ThemeSaveResult> {
  try {
    const stale = await staleSaveRefusal(
      payload,
      access,
      { kind: "theme" },
      guard
    )
    if (stale) return stale
    const saved = await saveTheme(payload, { user: access.user, inputs, note })
    const { revision } = await readRevision(payload, access, { kind: "theme" })
    return saved.changed
      ? { ok: true, message: "Theme saved. It is live on your Site.", revision }
      : { ok: true, message: NO_CHANGES_MESSAGE, revision }
  } catch (error) {
    return formStateFromError(error)
  }
}

export async function loadThemeScreen(
  payload: Payload,
  access: UserAccess
): Promise<ThemeScreen> {
  const [live, fonts, versions] = await Promise.all([
    readLiveTheme(payload),
    getAvailableFonts(payload),
    listThemeHistory(payload, { user: access.user }),
  ])
  return {
    saved: live.source === "saved",
    summary: themeSummaryOf(live),
    details: themeDetails(live.inputs, fonts),
    history: versions.map((version) => ({
      id: version.id,
      savedAt: version.savedAt,
      author: version.author?.name ?? null,
      summary: version.summary,
      isLive: version.isLive,
      missingFonts: version.missingFonts,
      substitutions: version.missingFonts.map((label) => ({
        label,
        family: substituteFamily(label),
      })),
    })),
  }
}

/**
 * Restores a version: it is saved again as the newest, so it is live at once
 * and the history only grows. The live version and unknown versions are
 * refused, with the reason.
 */
export async function restoreThemeAs(
  payload: Payload,
  access: UserAccess,
  versionId: number,
  guard: SaveGuard = {}
): Promise<ThemeSaveResult> {
  if (!Number.isInteger(versionId) || versionId <= 0) {
    return { ok: false, message: GONE }
  }
  try {
    const history = await listThemeHistory(payload, { user: access.user })
    const version = history.find((entry) => entry.id === versionId)
    if (!version) return { ok: false, message: GONE }
    if (version.isLive) {
      return { ok: false, message: "That version is already live." }
    }
    const stale = await staleSaveRefusal(
      payload,
      access,
      { kind: "theme" },
      guard
    )
    if (stale) return stale
    const restored = await restoreThemeVersion(payload, {
      user: access.user,
      versionId,
    })
    const { revision } = await readRevision(payload, access, { kind: "theme" })
    if (!restored.changed) {
      return {
        ok: true,
        message:
          "Your Site already looks like that version. Nothing to restore.",
        revision,
      }
    }
    return {
      ok: true,
      message: "Restored that version. It is live on your Site.",
      revision,
    }
  } catch (error) {
    return formStateFromError(error)
  }
}
