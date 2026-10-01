/**
 * `@workspace/content`: how apps/site reads CMS content (ADR-0007). The Site
 * comes from the deployment (`SITE`) and never appears in this interface.
 *
 * CONTENT_ADAPTER=fake serves in-memory demo content (SITE=demo-mountain or
 * demo-beach); otherwise content comes from the CMS over REST.
 */
import { contentAdapterName } from "./env"
import { fakeAdapter } from "./fake"
import { restAdapter } from "./rest"
import { withVariables } from "./queries"
import type {
  ContentAdapter,
  CuratedListPage,
  GuideDoc,
  GuideFilter,
  LocationPage,
  PageDoc,
  Paginated,
  PropertyDetail,
  PropertySummary,
  SearchFilter,
  SiteSettings,
  SitemapEntry,
  SpecialDoc,
  SubmissionInput,
  SubmissionResult,
} from "./types"

export type * from "./types"
export type { CacheTag, CuratedListRule } from "./shared"
export { ContentRequestError, type FieldError } from "./queries/client"
export { SubmissionError } from "./queries/submit"

/** The in-memory demo content, with Variables replaced like the CMS's. */
const fake = withVariables(
  fakeAdapter,
  async () => (await fakeAdapter.getSiteSettings()).variables
)

const adapter = (): ContentAdapter =>
  contentAdapterName() === "fake" ? fake : restAdapter

/** An Active Property by slug; null when unknown or Withdrawn (render 410). */
export function getProperty(slug: string): Promise<PropertyDetail | null> {
  return adapter().getProperty(slug)
}

/** CMS content for a Feed search result, in the Feed's order. Active only. */
export function getProperties(feedIds: string[]): Promise<PropertySummary[]> {
  return adapter().getProperties(feedIds)
}

/** Non-dated browse by Location, Amenities, sleeps…; paginated. */
export function searchProperties(
  filter: SearchFilter
): Promise<Paginated<PropertySummary>> {
  return adapter().searchProperties(filter)
}

/** A visible Location by its slug path, with ancestors and child Locations. */
export function getLocation(path: string[]): Promise<LocationPage | null> {
  return adapter().getLocation(path)
}

/** A published Curated List with its members resolved from its rule. */
export function getCuratedList(slug: string): Promise<CuratedListPage | null> {
  return adapter().getCuratedList(slug)
}

/** A published Page by URL segments ([] is Home), with Variables replaced. */
export function getPage(path: string[]): Promise<PageDoc | null> {
  return adapter().getPage(path)
}

/** A published Guide by slug, with Variables replaced. */
export function getGuide(slug: string): Promise<GuideDoc | null> {
  return adapter().getGuide(slug)
}

/** Published Guides, newest first. */
export function listGuides(filter?: GuideFilter): Promise<Paginated<GuideDoc>> {
  return adapter().listGuides(filter)
}

/** Specials shown on the Site and not expired. */
export function listSpecials(): Promise<SpecialDoc[]> {
  return adapter().listSpecials()
}

/** A shown, unexpired Special by slug. */
export function getSpecial(slug: string): Promise<SpecialDoc | null> {
  return adapter().getSpecial(slug)
}

/** The deployment's Site Settings. */
export function getSiteSettings(): Promise<SiteSettings> {
  return adapter().getSiteSettings()
}

/**
 * Every public URL of the Site with its last change, for sitemap.xml:
 * published Pages, Active Properties (/rentals/<slug>), visible Locations
 * (/areas/<path>), published Curated Lists (/lists/<slug>) and Guides
 * (/guides/<slug>), and shown, unexpired Specials (/specials/<slug>).
 * Never Drafts.
 */
export function listSitemapEntries(): Promise<SitemapEntry[]> {
  return adapter().listSitemapEntries()
}

/**
 * Stores a Submission for the Site; the CMS forwards it (ADR-0014). Throws
 * `SubmissionError` (with field errors) when the CMS rejects it.
 */
export function submit(input: SubmissionInput): Promise<SubmissionResult> {
  return adapter().submit(input)
}

/**
 * All of the above as one `ContentAdapter`, for views that take their
 * content as an argument (`@workspace/site-views`).
 */
export const content: ContentAdapter = {
  getProperty,
  getProperties,
  searchProperties,
  getLocation,
  getCuratedList,
  getPage,
  getGuide,
  listGuides,
  listSpecials,
  getSpecial,
  getSiteSettings,
  listSitemapEntries,
  submit,
}
