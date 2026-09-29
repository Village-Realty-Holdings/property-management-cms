import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import type {
  ContentAdapter,
  GuideDoc,
  SiteSettings,
} from "@workspace/content/queries"
import { cn } from "@workspace/ui/lib/utils"

import { formatDate } from "../editorial/format"
import { guideHref } from "../editorial/guide-card"
import { JsonLd } from "../editorial/json-ld"
import { PreviewGuard } from "../preview-guard"
import { Breadcrumbs } from "../site/breadcrumbs"
import { displayFont } from "../site/display"
import { FeedImage } from "../site/feed-image"
import { RichText } from "../site/rich-text"

/** schema.org Article for the Guide (absolute URL only when the Site has a domain). */
function articleJsonLd(guide: GuideDoc, settings: SiteSettings) {
  const url = settings.domain
    ? `https://${settings.domain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}${guideHref(guide)}`
    : undefined
  const image = guide.heroImage ?? guide.seo.image
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.seo.description ?? guide.excerpt ?? undefined,
    datePublished: guide.publishedAt ?? undefined,
    image: image ? [image.url] : undefined,
    mainEntityOfPage: url,
    url,
    publisher: { "@type": "Organization", name: settings.name },
  }
}

/**
 * A Guide as its own page: title, excerpt, date, hero image and body. The
 * Site's usual chrome (`SiteFrame`) goes around it.
 */
export async function GuideView({
  guide,
  content,
  preview = false,
}: {
  guide: GuideDoc
  content: ContentAdapter
  /** In the CMS's Preview: links and forms don't act. */
  preview?: boolean
}) {
  const settings = await content.getSiteSettings()
  const date = formatDate(guide.publishedAt)

  return (
    <article className="flex flex-col pb-20">
      {preview && <PreviewGuard />}
      <JsonLd data={articleJsonLd(guide, settings)} />
      <header className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-10 sm:px-6 sm:pt-14">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Guides", href: "/guides" },
            { label: guide.title },
          ]}
        />
        <h1
          className={cn(
            displayFont,
            "text-4xl leading-[1.05] text-balance sm:text-5xl lg:text-6xl"
          )}
        >
          {guide.title}
        </h1>
        {guide.excerpt && (
          <p className="text-xl leading-relaxed text-pretty text-muted-foreground sm:text-2xl">
            {guide.excerpt}
          </p>
        )}
        {date && (
          <p className="border-l-4 border-(--brand-accent) pl-3 text-sm text-muted-foreground">
            Published{" "}
            <time dateTime={guide.publishedAt ?? undefined}>{date}</time>
          </p>
        )}
      </header>

      {guide.heroImage && (
        <div className="mx-auto mt-10 w-full max-w-5xl sm:px-6 lg:px-8">
          <FeedImage
            image={guide.heroImage}
            aspect="16/9"
            preload
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="sm:rounded-xl"
          />
        </div>
      )}

      <div className="mx-auto mt-10 w-full max-w-3xl px-4 sm:px-6">
        <RichText
          data={guide.body}
          className="text-lg leading-[1.75] [&>p:first-child]:first-letter:float-left [&>p:first-child]:first-letter:mt-1 [&>p:first-child]:first-letter:mr-2 [&>p:first-child]:first-letter:font-(family-name:--font-display) [&>p:first-child]:first-letter:text-6xl [&>p:first-child]:first-letter:leading-[0.8] [&>p:first-child]:first-letter:text-(--brand-primary)"
        />
        {/*
          Related Locations and Properties aren't shown yet: GuideDoc carries
          only their IDs, and @workspace/content can't resolve a Location or
          Property by ID (getLocation takes a path, getProperties Feed IDs).
        */}
        <p className="mt-14 border-t border-border pt-8">
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 rounded-sm font-medium text-primary underline decoration-(--brand-accent) decoration-2 underline-offset-4 hover:decoration-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
            More guides
          </Link>
        </p>
      </div>
    </article>
  )
}
