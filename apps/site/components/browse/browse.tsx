import Link from "next/link"
import { CalendarClockIcon } from "lucide-react"

import {
  searchProperties,
  type Paginated,
  type PropertySummary,
  content,
} from "@workspace/content"
import { buttonVariants } from "@workspace/ui/components/button"

import { EmptyState } from "@workspace/site-views/site/empty-state"
import { PropertyGrid } from "@workspace/site-views/site/property-grid"
import { requireSiteEnv } from "@/lib/site"

import { ActiveFilters } from "./active-filters"
import { BrowsePagination } from "./browse-pagination"
import { BrowseProvider, BrowseResults } from "./browse-provider"
import { FilterFields, SortSelect } from "./filter-fields"
import { MobileFilters } from "./mobile-filters"
import {
  loadBrowseOptions,
  resolveSearch,
} from "@workspace/site-views/browse/options"
import {
  browseHref,
  clearedParams,
  parseBrowseParams,
  type RawSearchParams,
} from "@workspace/site-views/browse/params"

/** Results per page: four rows of three. */
export const PAGE_SIZE = 12

const nothing = (page: number): Paginated<PropertySummary> => ({
  docs: [],
  totalDocs: 0,
  page,
  totalPages: 0,
  limit: PAGE_SIZE,
  hasNextPage: false,
  hasPrevPage: false,
})

/**
 * Non-dated browse of the Site's Active Properties: filters from the URL,
 * the results, and pagination. Reads `searchParams`, so render it inside
 * <Suspense>.
 */
export async function Browse({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  await requireSiteEnv()
  const params = parseBrowseParams(await searchParams)
  const options = await loadBrowseOptions(content)
  const { filter, active, hasUnknown } = resolveSearch(
    params,
    options,
    PAGE_SIZE
  )
  // A filter value that matches nothing on this Site can't match any
  // Property; say so instead of dropping it and showing everything.
  const results = hasUnknown
    ? nothing(params.page)
    : await searchProperties(filter)
  const total = results.totalDocs
  const clearHref = browseHref(clearedParams(params))
  const pastTheEnd = results.docs.length === 0 && total > 0

  return (
    <BrowseProvider params={params}>
      <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
        <aside aria-labelledby="filters-heading" className="hidden lg:block">
          <div className="sticky top-6 flex flex-col gap-6">
            <h2 id="filters-heading" className="text-lg font-semibold">
              Filters
            </h2>
            <FilterFields options={options} />
            <p className="flex items-start gap-2 border-t border-border pt-5 text-sm text-muted-foreground">
              <CalendarClockIcon
                aria-hidden
                className="mt-0.5 size-4 shrink-0"
              />
              Searching by dates and price is coming soon. Call or email us to
              check availability.
            </p>
          </div>
        </aside>

        <section
          aria-labelledby="results-count"
          className="flex min-w-0 flex-col gap-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <h2
              id="results-count"
              aria-live="polite"
              className="text-lg font-semibold tabular-nums"
            >
              {total === 0
                ? "No rentals"
                : `${total} ${total === 1 ? "rental" : "rentals"}`}
            </h2>
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <MobileFilters options={options} total={total} />
              </div>
              <SortSelect />
            </div>
          </div>

          <ActiveFilters filters={active} clearHref={clearHref} />

          <BrowseResults className="flex flex-col gap-12 pt-2">
            {pastTheEnd ? (
              <EmptyState
                title="There are no more results"
                description={`This search has ${results.totalPages} ${results.totalPages === 1 ? "page" : "pages"}.`}
                action={
                  <Link
                    href={browseHref({ ...params, page: 1 })}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Go to the first page
                  </Link>
                }
              />
            ) : (
              <PropertyGrid
                properties={results.docs}
                preloadCount={params.page === 1 ? 3 : 0}
                empty={
                  active.length > 0
                    ? {
                        title: "No rentals match these filters",
                        description: hasUnknown
                          ? "This link has a filter we no longer offer. Remove it to see what's available."
                          : "Try removing a filter or two.",
                        action: (
                          <Link
                            href={clearHref}
                            replace
                            className={buttonVariants({ variant: "outline" })}
                          >
                            Clear all filters
                          </Link>
                        ),
                      }
                    : {
                        title: "No rentals to show yet",
                        description:
                          "Check back soon: new homes are on the way.",
                      }
                }
              />
            )}
            <BrowsePagination params={params} totalPages={results.totalPages} />
          </BrowseResults>
        </section>
      </div>
    </BrowseProvider>
  )
}
