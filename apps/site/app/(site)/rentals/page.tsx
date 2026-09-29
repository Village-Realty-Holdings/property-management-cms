import { Suspense } from "react"
import type { Metadata } from "next"

import { getSiteSettings } from "@workspace/content"

import { Browse } from "@/components/browse/browse"
import { BrowseSkeleton } from "@/components/browse/browse-skeleton"
import { RentalsHeader } from "@/components/browse/rentals-header"
import { hasSite } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const description = hasSite()
    ? `Browse every vacation rental from ${(await getSiteSettings()).name}: filter by place, guests, bedrooms, amenities and pets.`
    : undefined
  return {
    title: "Rentals",
    description,
    // Filtered and paged variants are the same page for search engines.
    alternates: { canonical: "/rentals" },
  }
}

/**
 * /rentals: browse the Site's Active Properties without dates. Filters live
 * in the URL (see @workspace/site-views browse/params.ts).
 */
export default function RentalsPage({ searchParams }: PageProps<"/rentals">) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pt-8 pb-20 sm:px-6 sm:pt-10 lg:px-8">
      <RentalsHeader />
      <Suspense fallback={<BrowseSkeleton />}>
        <Browse searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
