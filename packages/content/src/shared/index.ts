/**
 * `@workspace/content/shared`: pure TypeScript shared by apps/site (through
 * `@workspace/content`) and apps/cms. No Next.js or Payload imports here.
 */

export { cacheTags, isCacheTag, uniqueTags, type CacheTag } from "./cacheTags"

/** URL segments (["company", "team"]) to a stored Page path ("/company/team"). */
export function toPagePath(segments: readonly string[]): string {
  return `/${segments.filter(Boolean).join("/")}`
}

export {
  curatedListPrefilter,
  curatedListRuleFrom,
  curatedListWhere,
  propertiesWithAllAmenities,
  type CuratedListRule,
  type CuratedListRuleFields,
  type CuratedListWhereOptions,
  type Where,
  type WhereField,
  type WhereQuery,
} from "./curatedListWhere"

export {
  effectiveStayPolicy,
  stayPolicyKeys,
  type PartialStayPolicy,
  type StayPolicy,
} from "./stayPolicy"

export {
  propertyTypeLabel,
  resolveAmenityPresentation,
  type AmenityInput,
  type AmenityView,
  type SitePresentation,
  type SitePropertyTypeLabels,
} from "./presentation"

export {
  canonicalSegments,
  isCanonicalPath,
  isLegacyPropertyPattern,
  legacyPropertyPatterns,
  legacyUrlSettingsFrom,
  matchLegacyUrl,
  noLegacyUrls,
  normalizeLegacyPath,
  propertyPath,
  validateLegacyRedirect,
  validateLegacyRedirects,
  type LegacyMatch,
  type LegacyPropertyPattern,
  type LegacyRedirect,
  type LegacyUrlSettings,
} from "./legacyUrls"

export {
  builtInVariables,
  builtInVariableSources,
  collectVariableIssues,
  findVariableIssues,
  isBuiltInVariable,
  isVariableName,
  resolveVariables,
  resolveVariablesDeep,
  validateVariableKey,
  variablesChanged,
  variableValuesFrom,
  type BuiltInVariable,
  type FieldVariableIssue,
  type VariableIssue,
  type VariableSource,
  type VariableValues,
} from "./variables"
