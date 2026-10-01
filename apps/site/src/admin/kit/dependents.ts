/** Something that depends on an item the user is about to delete or change. */
export type Dependent = {
  /** Singular, capitalised glossary term: "Page", "Layout", "Theme". */
  kind: string
  /** Irregular plural; defaults to `kind + "s"`. */
  plural?: string
  /** What the user calls it: the Page's title, the Layout's name. */
  name: string
  /** Where to see it, if it has a screen. */
  href?: string
}

/** "Used by 1 Layout and 3 Pages.", or "Nothing else uses it." */
export function summarizeDependents(dependents: readonly Dependent[]): string {
  if (dependents.length === 0) return "Nothing else uses it."
  const groups = new Map<string, { count: number; kind: Dependent }>()
  for (const dependent of dependents) {
    const group = groups.get(dependent.kind)
    if (group) group.count++
    else groups.set(dependent.kind, { count: 1, kind: dependent })
  }
  const parts = [...groups.values()].map(({ count, kind }) => {
    const noun = count === 1 ? kind.kind : (kind.plural ?? `${kind.kind}s`)
    return `${count} ${noun}`
  })
  const list =
    parts.length === 1
      ? parts[0]!
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
  return `Used by ${list}.`
}
