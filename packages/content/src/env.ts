// This package has no @types/node; the Site deployment's runtime provides
// `process.env`. Module-scoped, so it doesn't clash with @types/node in apps.
declare const process: { env: Record<string, string | undefined> }

/** The deployment's Site (its Site slug). Read per call so tests can switch it. */
export function currentSite(): string {
  const site = process.env.SITE
  if (!site) throw new Error("SITE must be set to the Site's slug")
  return site
}

/** The CMS origin (CMS_URL), e.g. https://cms.example.com. */
export function cmsUrl(): string {
  const url = process.env.CMS_URL
  if (!url) throw new Error("CMS_URL must be set to the CMS origin")
  return url
}

/** The Site's SiteReader API key (CMS_READER_KEY). Server-only. */
export function cmsReaderKey(): string {
  const key = process.env.CMS_READER_KEY
  if (!key)
    throw new Error("CMS_READER_KEY must be set to the Site's reader key")
  return key
}

/** "fake" selects the in-memory adapter; anything else the CMS REST adapter. */
export function contentAdapterName(): "fake" | "rest" {
  return process.env.CONTENT_ADAPTER === "fake" ? "fake" : "rest"
}
