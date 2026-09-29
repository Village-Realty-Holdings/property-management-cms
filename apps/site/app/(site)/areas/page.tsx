import type { Metadata } from "next"
import Link from "next/link"
import { HouseIcon } from "lucide-react"

import { getSiteSettings } from "@workspace/content"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { ChildLocations } from "@/components/location/child-locations"
import {
  listRootLocations,
  locationHref,
} from "@/components/location/location-links"
import { Breadcrumbs } from "@workspace/site-views/site/breadcrumbs"
import { displayFont } from "@workspace/site-views/site/display"
import { EmptyState } from "@workspace/site-views/site/empty-state"
import { FeedImage } from "@workspace/site-views/site/feed-image"
import { resolveBrand } from "@workspace/site-views/theme/branding"
import { requireSiteEnv } from "@/lib/site"

export const metadata: Metadata = {
  title: "Areas",
  description:
    "Every place we have rentals, from whole destinations to single resorts.",
  alternates: { canonical: "/areas" },
}

/**
 * The Site's top-level Locations with the places inside each. Only
 * Locations with rentals are listed (see `listRootLocations`).
 */
export default async function AreasIndex() {
  await requireSiteEnv()
  const [settings, roots] = await Promise.all([
    getSiteSettings(),
    listRootLocations(),
  ])
  const brand = resolveBrand(settings)

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "Areas" }]}
        />
      </div>
      <section
        aria-labelledby="areas-heading"
        className="bg-(--brand-primary) text-(--brand-primary-foreground)"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-12 pb-12 sm:px-6 sm:pt-16 sm:pb-16 lg:px-8">
          <h1
            id="areas-heading"
            className={cn(
              displayFont,
              "text-5xl leading-[0.95] text-balance sm:text-7xl"
            )}
          >
            Where we are
          </h1>
          <p className="max-w-xl text-lg text-pretty opacity-85 sm:text-xl">
            {brand.name} homes, place by place. Pick an area to see its rentals.
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-20 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {roots.length === 0 ? (
          <EmptyState
            icon={HouseIcon}
            title="No areas to show yet"
            description={
              brand.phone
                ? `Call us on ${brand.phone} and we'll find you a place.`
                : "Check back soon: new homes are on the way."
            }
            action={
              <Link href="/" className={buttonVariants({ size: "lg" })}>
                Go to the home page
              </Link>
            }
          />
        ) : (
          roots.map((root, i) => (
            <section
              key={root.id}
              aria-labelledby={`area-${root.id}`}
              className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14"
            >
              <Link
                href={locationHref(root)}
                tabIndex={-1}
                aria-hidden
                className="block"
              >
                <FeedImage
                  image={root.heroImage}
                  alt=""
                  sizes="(min-width: 1280px) 600px, (min-width: 1024px) 48vw, 100vw"
                  aspect="3/2"
                  preload={i === 0}
                  placeholderLabel=""
                  className="rounded-lg"
                />
              </Link>
              <div className="flex flex-col gap-5">
                <h2
                  id={`area-${root.id}`}
                  className={cn(
                    displayFont,
                    "text-4xl leading-tight text-balance sm:text-5xl"
                  )}
                >
                  <Link
                    href={locationHref(root)}
                    className="decoration-(--brand-accent) decoration-2 underline-offset-8 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
                  >
                    {root.name}
                  </Link>
                </h2>
                {root.description && (
                  <p className="max-w-prose text-lg text-pretty text-muted-foreground">
                    {root.description}
                  </p>
                )}
                <ChildLocations locations={root.children} />
                <Link
                  href={locationHref(root)}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "self-start rounded-full px-6"
                  )}
                >
                  See all of {root.name}
                </Link>
              </div>
            </section>
          ))
        )}
      </div>
    </>
  )
}
