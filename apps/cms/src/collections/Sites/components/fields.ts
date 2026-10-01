/**
 * Import-map paths of the Site Settings admin components (relative to
 * apps/cms/src, the importMap baseDir). Kept here so field configs don't
 * repeat the strings.
 */
export const secretInput = {
  Field: "/collections/Sites/components/SecretInput#SecretInput",
} as const

export const colorSwatch = {
  afterInput: ["/collections/Sites/components/ColorSwatch#ColorSwatch"],
}

export const wrapTabs = {
  Field: "/collections/Sites/components/WrapTabs#WrapTabs",
} as const
