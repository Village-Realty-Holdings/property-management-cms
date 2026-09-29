import {
  resolveVariablesDeep,
  variableValuesFrom,
  type VariableValues,
} from "../shared"
import type { ContentAdapter } from "../types"
import { loadSite, type QueryContext } from "./context"
import { getCuratedList } from "./curatedLists"
import { getGuide, listGuides } from "./guides"
import { getLocation } from "./locations"
import { getPage } from "./pages"
import { getProperties, getProperty, searchProperties } from "./properties"
import { getSiteSettings } from "./site"
import { listSitemapEntries } from "./sitemap"
import { getSpecial, listSpecials } from "./specials"
import { submit } from "./submit"

/**
 * The whole `ContentAdapter` for one context: the Site's deployment reading
 * published content over REST, or a Staff User's Preview reading Drafts
 * through the Local API. Both get the same shapes, Variables included.
 */
export function contentAdapter(ctx: QueryContext): ContentAdapter {
  return withVariables(
    {
      getProperty: (slug) => getProperty(ctx, slug),
      getProperties: (feedIds) => getProperties(ctx, feedIds),
      searchProperties: (filter) => searchProperties(ctx, filter),
      getLocation: (path) => getLocation(ctx, path),
      getCuratedList: (slug) => getCuratedList(ctx, slug),
      getPage: (path) => getPage(ctx, path),
      getGuide: (slug) => getGuide(ctx, slug),
      listGuides: (filter) => listGuides(ctx, filter),
      listSpecials: () => listSpecials(ctx),
      getSpecial: (slug) => getSpecial(ctx, slug),
      getSiteSettings: () => getSiteSettings(ctx),
      listSitemapEntries: () => listSitemapEntries(ctx),
      submit: (input) => submit(ctx, input),
    },
    async () => variableValuesFrom(await loadSite(ctx))
  )
}

/**
 * `adapter` with the Site's Variables replaced in Pages and Guides
 * (ADR-0017): they store `{phone}` as typed, and the Site shows its current
 * value. A Site Settings change that touches a Variable revalidates `pages`
 * and `guides`.
 */
export function withVariables(
  adapter: ContentAdapter,
  variables: () => Promise<VariableValues>
): ContentAdapter {
  async function resolved<T>(doc: T): Promise<T> {
    if (doc === null) return doc
    return resolveVariablesDeep(doc, await variables())
  }
  return {
    ...adapter,
    getPage: async (path) => resolved(await adapter.getPage(path)),
    getGuide: async (slug) => resolved(await adapter.getGuide(slug)),
    listGuides: async (filter) => resolved(await adapter.listGuides(filter)),
  }
}
