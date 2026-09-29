import { cmsReaderKey, cmsUrl, currentSite } from "../env"
import type { QueryContext } from "../queries"
import { createRestClient } from "./client"

/**
 * The deployment's query context: CMS_URL, SITE and the Site's reader key
 * (CMS_READER_KEY). Published content only: Drafts are previewed in the CMS
 * (ADR-0018).
 */
export function contextFromEnv(): QueryContext {
  return {
    client: createRestClient({ baseURL: cmsUrl(), apiKey: cmsReaderKey() }),
    site: currentSite(),
  }
}
