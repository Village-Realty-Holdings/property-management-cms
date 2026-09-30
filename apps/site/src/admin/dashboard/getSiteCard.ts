import "server-only"

import { cache } from "react"

import { resolveBrand } from "../../site/brand"
import { getBrand } from "../../site/queries"
import { siteCardOf, type SiteCard } from "./site"

/** The Site's name, logo, domain and schema; cached per request. */
export const getSiteCard = cache(async (): Promise<SiteCard> => {
  return siteCardOf(resolveBrand(await getBrand()))
})
