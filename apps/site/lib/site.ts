import { connection } from "next/server"

/**
 * The deployment's configuration. A Site deployment gets its identity only
 * from `SITE` (ADR-0010) and holds only credentials scoped to that Site.
 * See apps/site/.env.example.
 */

export type ContentAdapterName = "fake" | "rest"

export type SiteEnv = {
  /** The Site's slug; must equal the CMS Site's `slug`. */
  site: string
  contentAdapter: ContentAdapterName
  /** CMS base URL. Required with the REST adapter. */
  cmsUrl: string | null
  /** The Site's SiteReader API key. Required with the REST adapter. */
  cmsReaderKey: string | null
  /** Shared with the CMS Site record: authenticates revalidation. */
  revalidationSecret: string | null
}

type Env = Record<string, string | undefined>

export class SiteConfigError extends Error {
  override name = "SiteConfigError"
}

const value = (env: Env, name: string) => env[name]?.trim() || null

function contentAdapterFrom(env: Env): ContentAdapterName {
  const raw = value(env, "CONTENT_ADAPTER")
  if (raw === null || raw === "rest") return "rest"
  if (raw === "fake") return "fake"
  throw new SiteConfigError(
    `CONTENT_ADAPTER must be "fake" or "rest" (got "${raw}").`
  )
}

/**
 * Reads and checks the deployment's env. Throws a `SiteConfigError` naming
 * the missing or invalid variable.
 */
export function readSiteEnv(env: Env = process.env): SiteEnv {
  const site = value(env, "SITE")
  if (!site) {
    throw new SiteConfigError(
      "SITE must be set to the Site's slug (the CMS Site's `slug`, e.g. demo-mountain)."
    )
  }
  const contentAdapter = contentAdapterFrom(env)
  const cmsUrl = value(env, "CMS_URL")
  const cmsReaderKey = value(env, "CMS_READER_KEY")
  if (contentAdapter === "rest") {
    if (!cmsUrl) {
      throw new SiteConfigError(
        "CMS_URL must be set to the CMS base URL (or set CONTENT_ADAPTER=fake)."
      )
    }
    if (!/^https?:\/\//.test(cmsUrl)) {
      throw new SiteConfigError(
        `CMS_URL must be an http(s) URL (got "${cmsUrl}").`
      )
    }
    if (!cmsReaderKey) {
      throw new SiteConfigError(
        "CMS_READER_KEY must be set to the Site's SiteReader API key (or set CONTENT_ADAPTER=fake)."
      )
    }
  }
  return {
    site,
    contentAdapter,
    cmsUrl,
    cmsReaderKey,
    revalidationSecret: value(env, "REVALIDATION_SECRET"),
  }
}

/** Whether `SITE` is set, so Site content can be read at all. */
export function hasSite(env: Env = process.env): boolean {
  return value(env, "SITE") !== null
}

/**
 * Checks the env before reading Site content. Without `SITE` (e.g. a plain
 * `next build` in CI), rendering waits for a request instead of failing the
 * build, and then fails with a clear error. With `SITE`, it returns at once,
 * so the Site's pages prerender normally.
 */
export async function requireSiteEnv(): Promise<SiteEnv> {
  if (!hasSite()) await connection()
  return readSiteEnv()
}
