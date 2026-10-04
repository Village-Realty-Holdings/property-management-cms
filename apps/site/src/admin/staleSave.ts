/**
 * The stale-save check, shared by the server and the editor: a save sends the
 * revision it opened as `expected`, and the server refuses it when someone
 * saved since. Pure: no runtime imports, like pageForm.ts and seoForm.ts.
 *
 * Known limit: check-then-write is not atomic, so two saves in the same
 * instant can both pass. One person in two tabs is protected, and the
 * conflict then says "You saved it in another tab".
 */

export type RevisionKind = "page" | "layout" | "theme" | "brand" | "seo"

/**
 * Opaque: the latest version id (Page, Layout, Theme) or the global's
 * updatedAt (Brand, SEO), as a string.
 */
export type Revision = string

/**
 * What a save sends. `expected` undefined skips the check; null means
 * "nothing was stored when I opened it".
 */
export type SaveGuard = { expected?: Revision | null; force?: boolean }

export type SaveConflict = {
  kind: RevisionKind
  /** Who saved: name or email; null for Brand/SEO, a script, or a removed User. */
  by: string | null
  /** The same User saved it (another tab). */
  byYou: boolean
  /** ISO time of that save. */
  at: string
}

/** Added to every guarded save's result. */
export type RevisionResult = {
  revision?: Revision | null
  conflict?: SaveConflict
}

const SUBJECT: Record<RevisionKind, string> = {
  page: "This Page",
  layout: "This Layout",
  theme: "The Theme",
  brand: "The Brand",
  seo: "SEO",
}

export function staleSaveTitle(kind: RevisionKind): string {
  return `${SUBJECT[kind]} changed since you opened it`
}

/** The message a refused save carries in its FormState. */
export function staleSaveMessage(kind: RevisionKind): string {
  return `${staleSaveTitle(kind)}.`
}

/** The dialog's description; `time` is already formatted by the caller. */
export function staleSaveDescription(
  conflict: SaveConflict,
  time: string
): string {
  const who = conflict.byYou
    ? `You saved it in another tab at ${time}.`
    : conflict.by
      ? `${conflict.by} saved it at ${time}.`
      : `It was saved at ${time}.`
  const keeps =
    conflict.kind === "brand" || conflict.kind === "seo"
      ? ""
      : " The version you replace stays in History."
  return `${who} Reload to see that version; your unsaved changes here will be lost. Save anyway to replace it with yours.${keeps}`
}

/** Revision of rows listed newest first; null when empty. */
export function latestRevision(
  rows: readonly { id: number }[]
): Revision | null {
  const first = rows[0]
  return first ? String(first.id) : null
}
