/**
 * Pure helpers of the Phase 6 acceptance tests (the seeded Sites): comparing
 * page text with the real sites' copy, reading the Visual Editor's Outline,
 * reading `git worktree list`, and comparing database snapshots. Tested in
 * match.test.ts, which runs in `pnpm check`.
 */

/**
 * Text reduced to lowercase words: apostrophes dropped (so "We’re" and
 * "We're" both read "were"), every other run of punctuation or space one
 * space. CSS `text-transform` never reaches `textContent`, so an UPPERCASE
 * heading still compares equal to its copy.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’‘`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

/**
 * The `needles` that `haystack` does not contain in this order. Each needle
 * is looked for after the end of the previous one found; one that is missing
 * is reported and the search goes on from the same place.
 */
export function missingInOrder(
  haystack: string,
  needles: readonly string[]
): string[] {
  const text = ` ${normalizeText(haystack)} `
  const missing: string[] = []
  let from = 0
  for (const needle of needles) {
    const words = ` ${normalizeText(needle)} `
    const at = text.indexOf(words, from)
    if (at === -1) {
      missing.push(needle)
    } else {
      from = at + words.length - 1
    }
  }
  return missing
}

/**
 * Whether an Outline line names this Block: the line is the Block's name, or
 * starts with it followed by a separator ("Hero · Earn more from your home").
 * "Search Hero" does not name "Hero".
 */
export function lineNamesBlock(line: string, block: string): boolean {
  const text = normalizeText(line)
  const name = normalizeText(block)
  return text === name || text.startsWith(`${name} `)
}

/**
 * The lines of the Outline's Page group: those between a line reading "Page"
 * and the next reading "Footer". The whole outline when those labels are not
 * found (the Blocks are then looked for anywhere in it).
 */
export function pageGroupLines(outlineText: string): string[] {
  const lines = outlineText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  const start = lines.findIndex((line) => normalizeText(line) === "page")
  if (start === -1) return lines
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => normalizeText(line) === "footer")
  return end === -1 ? rest : rest.slice(0, end)
}

/**
 * The `blocks` that do not appear, in this order, among `lines`. Other lines
 * (labels, buttons, headings of the Blocks) may sit between them.
 */
export function missingBlocks(
  lines: readonly string[],
  blocks: readonly string[]
): string[] {
  const missing: string[] = []
  let from = 0
  for (const block of blocks) {
    const at = lines.findIndex(
      (line, index) => index >= from && lineNamesBlock(line, block)
    )
    if (at === -1) {
      missing.push(block)
    } else {
      from = at + 1
    }
  }
  return missing
}

export type Worktree = {
  path: string
  head: string
  /** The checked-out branch without `refs/heads/`, or null when detached. */
  branch: string | null
}

/** Parses `git worktree list --porcelain`. */
export function parseWorktreeList(porcelain: string): Worktree[] {
  return porcelain
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block) => {
      const fields = new Map<string, string>()
      for (const line of block.split("\n")) {
        const space = line.indexOf(" ")
        const key = space === -1 ? line : line.slice(0, space)
        fields.set(key, space === -1 ? "" : line.slice(space + 1))
      }
      const worktreePath = fields.get("worktree")
      if (worktreePath === undefined) return []
      const ref = fields.get("branch")
      return [
        {
          path: worktreePath,
          head: fields.get("HEAD") ?? "",
          branch: ref ? ref.replace(/^refs\/heads\//, "") : null,
        },
      ]
    })
}

/** A snapshot of stored state, as "what" → value. */
export type Snapshot = Record<string, string>

export type SnapshotChange = {
  key: string
  before: string | undefined
  after: string | undefined
}

/** Every key whose value differs between two snapshots, or is in only one. */
export function snapshotChanges(
  before: Snapshot,
  after: Snapshot
): SnapshotChange[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  return keys
    .sort()
    .filter((key) => before[key] !== after[key])
    .map((key) => ({ key, before: before[key], after: after[key] }))
}

/** Only the digits of a phone number, as it is written anywhere on a page. */
export function digitsOf(text: string): string {
  return text.replace(/\D/g, "")
}
