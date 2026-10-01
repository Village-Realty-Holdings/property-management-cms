import { cacheLife, cacheTag } from "next/cache"

import { cacheTags, toPagePath } from "../shared"
import type { GuideFilter, SearchFilter } from "../types"
import { contextFromEnv } from "./fromEnv"
import { contentAdapter } from "../queries"

/**
 * The REST queries behind `'use cache'` (ADR-0009): tagged with the shared
 * vocabulary so the CMS's revalidation reaches them, with an 'hours' ceiling
 * in case a notification is lost. Published content only. Keep these thin;
 * test the queries.
 */

/** The deployment's uncached adapter, built per call (env is read per call). */
const content = () => contentAdapter(contextFromEnv())

const {
  curatedList,
  curatedLists,
  guide,
  guides,
  location,
  locations,
  page,
  pages,
  properties,
  property,
  siteSettings,
  specials,
} = cacheTags

export async function getProperty(slug: string) {
  "use cache"
  cacheLife("hours")
  cacheTag(property(slug), properties, locations, specials, siteSettings)
  return content().getProperty(slug)
}

export async function getProperties(feedIds: string[]) {
  "use cache"
  cacheLife("hours")
  cacheTag(properties, locations, siteSettings)
  return content().getProperties(feedIds)
}

export async function searchProperties(filter: SearchFilter) {
  "use cache"
  cacheLife("hours")
  cacheTag(properties, locations, siteSettings)
  return content().searchProperties(filter)
}

export async function getLocation(path: string[]) {
  "use cache"
  cacheLife("hours")
  cacheTag(locations, siteSettings)
  const result = await content().getLocation(path)
  if (result) cacheTag(location(result.id))
  return result
}

export async function getCuratedList(slug: string) {
  "use cache"
  cacheLife("hours")
  cacheTag(curatedList(slug), curatedLists, properties, locations, siteSettings)
  return content().getCuratedList(slug)
}

export async function getPage(path: string[]) {
  "use cache"
  cacheLife("hours")
  cacheTag(page(toPagePath(path)), pages, curatedLists, locations)
  return content().getPage(path)
}

export async function getGuide(slug: string) {
  "use cache"
  cacheLife("hours")
  cacheTag(guide(slug), guides)
  return content().getGuide(slug)
}

export async function listGuides(filter?: GuideFilter) {
  "use cache"
  cacheLife("hours")
  cacheTag(guides)
  return content().listGuides(filter)
}

export async function listSpecials() {
  "use cache"
  cacheLife("hours")
  cacheTag(specials)
  return content().listSpecials()
}

export async function getSpecial(slug: string) {
  "use cache"
  cacheLife("hours")
  cacheTag(specials)
  return content().getSpecial(slug)
}

export async function getSiteSettings() {
  "use cache"
  cacheLife("hours")
  cacheTag(siteSettings, pages)
  return content().getSiteSettings()
}

export async function listSitemapEntries() {
  "use cache"
  cacheLife("hours")
  cacheTag(pages, properties, locations, curatedLists, guides, specials)
  return content().listSitemapEntries()
}
