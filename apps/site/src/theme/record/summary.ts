import { describeChanges, type ThemeInputs } from "../inputs"

/** The change summary of a Theme version, as history shows it. */

export const START_SUMMARY = "Started from the Classic preset"
export const NO_CHANGES_SUMMARY = "No changes"

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
  return options.first ? START_SUMMARY : NO_CHANGES_SUMMARY
}

/**
 * The summary of a restore: what it changed, and any font the old version
 * used that has been deleted since (the Classic font is used instead).
 */
export function restoreSummary(
  from: ThemeInputs,
  to: ThemeInputs,
  deletedFonts: readonly string[]
): string {
  const changes = describeChanges(from, to)
  let summary = `Restored an earlier version: ${
    changes.length > 0 ? changes.join(", ") : "no changes"
  }`
  if (deletedFonts.length > 0) {
    const many = deletedFonts.length > 1
    summary += `. ${deletedFonts.join(" and ")} ${
      many ? "were" : "was"
    } deleted, so the Classic ${many ? "fonts are" : "font is"} used.`
  }
  return summary
}
