import { contentAdapter } from "../queries"
import type { ContentAdapter } from "../types"
import * as cached from "./cached"
import { contextFromEnv } from "./fromEnv"

/**
 * Reads the CMS over REST with the Site's SiteReader key (ADR-0007),
 * through Next's cache (./cached.ts). Published content only. Submissions
 * aren't cached.
 */
export const restAdapter: ContentAdapter = {
  getProperty: cached.getProperty,
  getProperties: cached.getProperties,
  searchProperties: cached.searchProperties,
  getLocation: cached.getLocation,
  getCuratedList: cached.getCuratedList,
  getPage: cached.getPage,
  getGuide: cached.getGuide,
  listGuides: cached.listGuides,
  listSpecials: cached.listSpecials,
  getSpecial: cached.getSpecial,
  getSiteSettings: cached.getSiteSettings,
  listSitemapEntries: cached.listSitemapEntries,
  submit: (input) => contentAdapter(contextFromEnv()).submit(input),
}
