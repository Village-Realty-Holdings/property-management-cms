import { describeChanges, type ThemeInputs } from "../inputs"

/** The change summary of a Theme version, as history shows it. */

export const START_SUMMARY = "Started from the Classic preset"
/**
 * A save that changes nothing is skipped by `saveTheme`, so history never
 * lists "No changes". Only a write around it (the raw Payload API) can reach
 * a summary with nothing to say, and gets this.
 */
export const SAVED_AGAIN_SUMMARY = "Saved again"

const savedFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

/** "Mar 1, 2026, 10:05 AM UTC". */
export function formatSavedAt(iso: string): string {
  return `${savedFormat.format(new Date(iso))} UTC`
}

/**
 * The summary of a save: the staff note when there is one, otherwise the
 * controls that changed from the live Theme (`from`) to what is saved (`to`).
 */
export function saveSummary(
  from: ThemeInputs,
  to: ThemeInputs,
  options: { first?: boolean; note?: string | null } = {}
): string {
  const note = options.note?.trim()
  if (note) return note
  const changes = describeChanges(from, to)
  if (changes.length > 0) return changes.join(", ")
  return options.first ? START_SUMMARY : SAVED_AGAIN_SUMMARY
}

/**
 * The summary of a restore: which version came back (`from`, the ISO time it
 * was saved), what the restore changed, and any font that version used that
 * has been deleted since (the Classic font is used instead).
 */
export function restoreSummary(
  live: ThemeInputs,
  restored: ThemeInputs,
  options: { from: string; deletedFonts?: readonly string[] }
): string {
  const changes = describeChanges(live, restored)
  let summary = `Restored the version from ${formatSavedAt(options.from)}: ${
    changes.length > 0 ? changes.join(", ") : "no changes"
  }`
  const deleted = options.deletedFonts ?? []
  if (deleted.length > 0) {
    const many = deleted.length > 1
    summary += `. ${deleted.join(" and ")} ${
      many ? "were" : "was"
    } deleted, so the Classic ${many ? "fonts are" : "font is"} used.`
  }
  return summary
}
