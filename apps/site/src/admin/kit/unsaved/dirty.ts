/**
 * Dirty tracking: has an editor's value moved away from what was last saved?
 *
 * Deep, order-insensitive for object keys, order-sensitive for arrays. A key
 * that is missing equals a key set to `undefined` (forms drop empty fields),
 * but `null` is a real value.
 */
export function isDirty(baseline: unknown, current: unknown): boolean {
  return !deepEqual(baseline, current)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false
    }
    return a.every((item, index) => deepEqual(item, b[index]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const key of keys) {
      if (!deepEqual(a[key], b[key])) return false
    }
    return true
  }
  return false
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
