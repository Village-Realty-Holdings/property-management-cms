import Link from "next/link"
import { ArrowLeftIcon, SlidersHorizontalIcon } from "lucide-react"

import type {
  ContentAdapter,
  CuratedListPage,
} from "@workspace/content/queries"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { Breadcrumbs } from "@workspace/site-views/site/breadcrumbs"
import { displayFont } from "@workspace/site-views/site/display"
import { FeedImage } from "@workspace/site-views/site/feed-image"
import { PropertyGrid } from "@workspace/site-views/site/property-grid"
import { RichText } from "@workspace/site-views/site/rich-text"

import { PreviewGuard } from "../preview-guard"

import { loadBrowseOptions, ruleHref } from "./options"

const pillClass =
  "inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

/**
 * A Curated List page: a split hero (title, count, links; the list's hero
 * image, else its first member's photo), the intro and the members.
 */
export async function CuratedListView({
  list,
  content,
  preview = false,
}: {
  list: CuratedListPage
  content: ContentAdapter
  /** In the CMS's Preview: links and forms don't act. */
  preview?: boolean
}) {
  const options = await loadBrowseOptions(content)
  const refineHref = ruleHref(list.rule, options, list.sort)
  const count = list.properties.length
  const image = list.heroImage ?? list.properties[0]?.image ?? null
  const hasIntro = !!list.intro?.root.children.length

  return (
    <>
      {preview && <PreviewGuard />}
      <section
        aria-labelledby="list-title"
        className="border-b border-border bg-(--brand-primary)/6"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pt-8 pb-10 sm:px-6 sm:pt-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14 lg:px-8 lg:pb-14">
          <div className="flex flex-col gap-5">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Collections", href: "/lists" },
                { label: list.title },
              ]}
            />
            <h1
              id="list-title"
              className={cn(
                displayFont,
                "text-4xl leading-[0.95] text-balance sm:text-6xl"
              )}
            >
              {list.title}
            </h1>
            {!hasIntro && list.description && (
              <p className="max-w-xl text-lg text-pretty text-muted-foreground">
                {list.description}
              </p>
            )}
            <p className="text-base font-medium">
              {count === 0
                ? "No homes in this collection right now"
                : `${count} ${count === 1 ? "home" : "homes"} in this collection`}
            </p>
            {refineHref && count > 0 && (
              <div>
                <Link
                  href={refineHref}
                  className={cn(
                    pillClass,
                    "bg-(--brand-primary) text-(--brand-primary-foreground) hover:bg-(--brand-primary)/90"
                  )}
                >
                  <SlidersHorizontalIcon aria-hidden className="size-4" />
                  Refine with filters
                </Link>
              </div>
            )}
          </div>
          <FeedImage
            image={image}
            alt=""
            aspect="4/3"
            preload
            sizes="(min-width: 1280px) 580px, (min-width: 1024px) 45vw, 100vw"
            className="rounded-2xl"
          />
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {hasIntro && <RichText data={list.intro} className="text-lg" />}
        <section aria-label={`Homes in ${list.title}`}>
          <PropertyGrid
            properties={list.properties}
            preloadCount={0}
            cardHeadingAs="h2"
            empty={{
              title: "Nothing here at the moment",
              description:
                "Homes join this collection as they become available. In the meantime, browse everything we have.",
              action: (
                <Link href="/rentals" className={buttonVariants()}>
                  Browse all rentals
                </Link>
              ),
            }}
          />
        </section>
        {count > 0 && (
          <Link
            href="/rentals"
            className={cn(
              pillClass,
              "self-start border border-border hover:bg-muted"
            )}
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
            Browse all rentals
          </Link>
        )}
      </div>
    </>
  )
}
