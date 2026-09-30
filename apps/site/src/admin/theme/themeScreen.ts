import type { Payload } from "payload"

import { getAvailableFonts } from "../../fonts/available"
import type { User } from "../../payload-types"
import {
  listThemeHistory,
  readLiveTheme,
  restoreThemeVersion,
} from "../../theme/record"
import { themeSummaryOf, type ThemeSummary } from "../dashboard/site"
import { formStateFromError, type FormState } from "../formState"
import { formatSavedAt, themeDetails, type DetailRow } from "./themeDetails"

/**
 * What the Theme screen reads and does, through the Local API as the Staff
 * User (apps/site ADR-0002): the Server Actions pass the user's `as`. Kept
 * apart from the actions so it runs in tests without Next.
 */

/** The Local API options of a signed-in Staff User (see StaffContext). */
export type StaffAccess = {
  overrideAccess: false
  user: User & { collection: "users" }
}

/** One saved version, as the History list shows it. */
export type HistoryRow = {
  id: number
  /** ISO time of the save. */
  savedAt: string
  /** "Mar 1, 2026, 10:05 AM UTC". */
  when: string
  /** Who saved it; null when that user has been deleted. */
  author: string | null
  /** What changed, or the Staff User's note. */
  summary: string
  /** The newest version is the one on the Site. */
  isLive: boolean
  /** Labels of Font controls whose Font was deleted since. */
  missingFonts: string[]
}

export type ThemeScreen = {
  /** False while the Site still uses the default preset. */
  saved: boolean
  summary: ThemeSummary
  details: DetailRow[]
  history: HistoryRow[]
}

const GONE = "That version no longer exists."

export async function loadThemeScreen(
  payload: Payload,
  access: StaffAccess
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
      when: formatSavedAt(version.savedAt),
      author: version.author?.name ?? null,
      summary: version.summary,
      isLive: version.isLive,
      missingFonts: version.missingFonts,
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
  access: StaffAccess,
  versionId: number
): Promise<FormState> {
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
    await restoreThemeVersion(payload, { user: access.user, versionId })
    return {
      ok: true,
      message: `Restored the version from ${formatSavedAt(version.savedAt)}. It is live on your Site.`,
    }
  } catch (error) {
    return formStateFromError(error)
  }
}
