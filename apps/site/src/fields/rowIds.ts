/**
 * Block rows carry generated ids, and a row id belongs to one row: a copy
 * gets fresh ones. Only string ids go (rows); a relationship's id is a number.
 */
export function withoutRowIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutRowIds) as T
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([field, entry]) => !(field === "id" && typeof entry === "string")
        )
        .map(([field, entry]) => [field, withoutRowIds(entry)])
    ) as T
  }
  return value
}
