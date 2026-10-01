/**
 * Arrow-key movement over the Block picker's grid: groups of entries, each
 * laid out in rows of `columns`. Pure, so the picker's keyboard use can be
 * tested without a browser; the picker measures `columns` from the page.
 */

/** An entry's place: its group, and its index within the group. */
export type GridPosition = { group: number; index: number }

export type GridKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown"

/**
 * Where `key` takes the highlight from `from`. `sizes` is how many entries
 * each (non-empty) group has. Left and right walk the entries in reading
 * order, across rows and groups; up and down keep the column, and past the top
 * or bottom of a group go to the neighbouring group. Past the first or last
 * entry nothing moves.
 */
export function moveInGrid(
  sizes: number[],
  columns: number,
  from: GridPosition,
  key: GridKey
): GridPosition {
  const { group, index } = from
  const size = sizes[group] ?? 0
  const column = index % columns

  switch (key) {
    case "ArrowRight":
      if (index + 1 < size) return { group, index: index + 1 }
      if (group + 1 < sizes.length) return { group: group + 1, index: 0 }
      return from
    case "ArrowLeft":
      if (index > 0) return { group, index: index - 1 }
      if (group > 0) return { group: group - 1, index: sizes[group - 1]! - 1 }
      return from
    case "ArrowDown": {
      if (index + columns < size) return { group, index: index + columns }
      // A row above a short last row still steps down to that row's last
      // entry; only the last row has nothing below it in the group.
      const lastRowStart = Math.floor((size - 1) / columns) * columns
      if (index < lastRowStart) return { group, index: size - 1 }
      if (group + 1 < sizes.length)
        return {
          group: group + 1,
          index: Math.min(column, sizes[group + 1]! - 1),
        }
      return from
    }
    case "ArrowUp": {
      if (index - columns >= 0) return { group, index: index - columns }
      if (group > 0) {
        const previous = sizes[group - 1]!
        const lastRowStart = Math.floor((previous - 1) / columns) * columns
        return {
          group: group - 1,
          index: Math.min(lastRowStart + column, previous - 1),
        }
      }
      return from
    }
  }
}
