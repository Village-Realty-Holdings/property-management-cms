import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { CopyCodeButton } from "@workspace/site-views/editorial/copy-code-button"
import { formatValidity } from "@workspace/site-views/editorial/format"
import { currentSpecial, currentSpecials } from "@/lib/specials"
import { Breadcrumbs } from "@workspace/site-views/site/breadcrumbs"
import { displayFont } from "@workspace/site-views/site/display"
import { FeedImage } from "@workspace/site-views/site/feed-image"
import { RichText } from "@workspace/site-views/site/rich-text"
import { hasSite, requireSiteEnv } from "@/lib/site"

type Params = Promise<{ slug: string }>

/**
 * The Site's current Specials, prerendered at build. Cache Components needs
 * at least one param; without SITE (a CI build) or Specials, a placeholder
 * 404s.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const placeholder = [{ slug: "__placeholder__" }]
  if (!hasSite()) return placeholder
  const slugs = (await currentSpecials())
    .filter((s) => s.slug)
    .map((s) => ({ slug: s.slug }))
  return slugs.length > 0 ? slugs : placeholder
}

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  if (!hasSite()) return {}
  const special = await currentSpecial((await params).slug)
  if (!special) return {}
  return {
    title: special.title,
    description: special.description ?? undefined,
    openGraph: {
      title: special.title,
      description: special.description ?? undefined,
      images: special.heroImage
        ? [{ url: special.heroImage.url, alt: special.heroImage.alt }]
        : undefined,
    },
  }
}

export default async function SpecialPage({ params }: { params: Params }) {
  await requireSiteEnv()
  const special = await currentSpecial((await params).slug)
  if (!special) notFound()

  const validity = formatValidity(special.validFrom, special.validTo)

  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="flex flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Specials", href: "/specials" },
            { label: special.title },
          ]}
        />
        <h1
          className={cn(
            displayFont,
            "max-w-3xl text-4xl leading-[1.05] text-balance sm:text-5xl lg:text-6xl"
          )}
        >
          {special.title}
        </h1>
        {special.description && (
          <p className="max-w-2xl text-xl leading-relaxed text-pretty text-muted-foreground sm:text-2xl">
            {special.description}
          </p>
        )}
      </header>

      <section
        aria-label="How to claim this offer"
        className="flex flex-col overflow-hidden rounded-xl bg-(--brand-primary) text-(--brand-primary-foreground) md:flex-row"
      >
        <div className="flex flex-1 flex-col gap-4 p-6 sm:p-8">
          {validity && (
            <p className="flex items-center gap-2 text-base font-medium">
              <CalendarIcon aria-hidden className="size-5 opacity-80" />
              <span>
                <span className="sr-only">Valid </span>
                {validity}
              </span>
            </p>
          )}
          <p className="max-w-md text-base text-pretty opacity-85">
            {special.code
              ? "Quote the code when you book online or by phone, and the discount is taken off your stay."
              : "The discount is applied when you book an eligible stay."}
          </p>
          <div className="mt-auto pt-2">
            <Link
              href="/rentals"
              className="inline-flex h-11 items-center rounded-full border border-current/40 px-6 text-sm font-semibold transition-colors hover:border-current hover:bg-current/10 focus-visible:ring-3 focus-visible:ring-current/40 focus-visible:outline-none"
            >
              Browse rentals
            </Link>
          </div>
        </div>
        {special.code && (
          <div className="flex flex-col gap-4 border-t-2 border-dashed border-current/30 p-6 sm:p-8 md:w-96 md:justify-center md:border-t-0 md:border-l-2">
            <p className="text-sm opacity-80">Your code</p>
            <p
              className={cn(
                displayFont,
                "text-4xl tracking-wide wrap-anywhere select-all"
              )}
            >
              {special.code}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <CopyCodeButton code={special.code} />
            </div>
          </div>
        )}
      </section>

      {special.heroImage && (
        <FeedImage
          image={special.heroImage}
          aspect="16/9"
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="rounded-xl"
        />
      )}

      {(special.body || special.terms || special.disclaimer) && (
        <div className="flex max-w-3xl flex-col gap-10">
          <RichText data={special.body} className="text-lg leading-[1.75]" />
          {special.terms && (
            <section
              aria-labelledby="terms-heading"
              className="flex flex-col gap-3"
            >
              <h2
                id="terms-heading"
                className={cn(displayFont, "text-2xl leading-tight")}
              >
                Terms
              </h2>
              <p className="text-base leading-relaxed text-pretty whitespace-pre-line">
                {special.terms}
              </p>
            </section>
          )}
          {special.disclaimer && (
            <p className="border-t border-border pt-6 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {special.disclaimer}
            </p>
          )}
        </div>
      )}
      {/*
        Eligible Properties aren't listed yet: SpecialDoc carries CMS Property
        IDs, and @workspace/content can't resolve those (getProperties takes
        Feed IDs).
      */}
    </article>
  )
}
