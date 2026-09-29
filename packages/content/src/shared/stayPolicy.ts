/**
 * Stay Policy (CONTEXT.md): the Property Fact `property.stayPolicy` and the
 * Site's default `site.stayPolicyDefaults` share this shape. Pure; ported
 * from apps/cms src/collections/Properties/effectiveStayPolicy.ts.
 */

export type StayPolicy = {
  checkIn: string | null
  checkOut: string | null
  houseRules: string | null
  cancellationPolicy: string | null
  minimumAge: number | null
}

export const stayPolicyKeys = [
  "checkIn",
  "checkOut",
  "houseRules",
  "cancellationPolicy",
  "minimumAge",
] as const satisfies readonly (keyof StayPolicy)[]

/** A stored Stay Policy group: any field may be missing or null. */
export type PartialStayPolicy = {
  [K in keyof StayPolicy]?: StayPolicy[K] | undefined
}

/**
 * The Stay Policy guests see for a Property: each field comes from the
 * Property Fact (`property.stayPolicy`) when the Property Feed has a value,
 * otherwise from the Site's default (`site.stayPolicyDefaults`). Blank text
 * counts as no value. Fields neither has are `null`.
 */
export function effectiveStayPolicy(
  property: { stayPolicy?: PartialStayPolicy | null } | null | undefined,
  site: { stayPolicyDefaults?: PartialStayPolicy | null } | null | undefined
): StayPolicy {
  const own = property?.stayPolicy ?? {}
  const defaults = site?.stayPolicyDefaults ?? {}
  const result = {} as Record<keyof StayPolicy, unknown>
  for (const key of stayPolicyKeys) {
    result[key] = hasValue(own[key])
      ? own[key]
      : hasValue(defaults[key])
        ? defaults[key]
        : null
  }
  return result as StayPolicy
}

function hasValue(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === "string") return value.trim() !== ""
  return true
}
