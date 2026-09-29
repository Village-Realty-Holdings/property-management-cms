import { cacheLife } from "next/cache"

import { getSpecial, listSpecials, type SpecialDoc } from "@workspace/content"

import { isExpired } from "@workspace/site-views/editorial/format"

/*
 * The CMS only returns current Specials, but its answer is cached for hours;
 * these re-check the end date against a clock cached for minutes, so an
 * expired Special drops off without a CMS change. Caching here (not just the
 * clock) also keeps the pages prerenderable: reading the time outside a
 * cache, as the fake adapter does, blocks prerendering. Content cache tags
 * from inside propagate, so CMS revalidation still reaches these.
 */

/** Current Specials, ending soonest first. */
export async function currentSpecials(): Promise<SpecialDoc[]> {
  "use cache"
  cacheLife("minutes")
  const specials = await listSpecials()
  const now = Date.now()
  return specials.filter((special) => !isExpired(special, now))
}

/** A current Special by slug; null when unknown or expired. */
export async function currentSpecial(slug: string): Promise<SpecialDoc | null> {
  "use cache"
  cacheLife("minutes")
  const special = await getSpecial(slug)
  return special && !isExpired(special, Date.now()) ? special : null
}
