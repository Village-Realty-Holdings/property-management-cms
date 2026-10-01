import "server-only"

import { cache } from "react"

import { resolveBrand } from "../../site/brand"
import { getBrand, getTheme } from "../../site/queries"
import {
  siteCardOf,
  themeSummaryOf,
  type SiteCard,
  type ThemeSummary,
} from "./site"

/** The Site's name, logo, domain and schema; cached per request. */
export const getSiteCard = cache(async (): Promise<SiteCard> => {
  return siteCardOf(resolveBrand(await getBrand()))
})

/** The live Theme's colours and save time; cached per request. */
export const getThemeCard = cache(async (): Promise<ThemeSummary> => {
  return themeSummaryOf(await getTheme())
})
