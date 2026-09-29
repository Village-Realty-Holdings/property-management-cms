import Link from "next/link"

import type { GuideDoc } from "@workspace/content/queries"
import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "../site/display"
import { FeedImage } from "../site/feed-image"

import { formatDate } from "./format"

export const guideHref = (guide: Pick<GuideDoc, "slug">) =>
  `/guides/${guide.slug}`

export type GuideCardProps = {
  guide: GuideDoc
  /** The lead story: a wide photo beside a larger headline. */
  lead?: boolean
  preload?: boolean
  headingAs?: "h2" | "h3"
  className?: string
}

/**
 * A Guide in the index: photo, date, title and excerpt. The whole card is
 * the link; the title is its text.
 */
export function GuideCard({
  guide,
  lead = false,
  preload = false,
  headingAs: Heading = "h2",
  className,
}: GuideCardProps) {
  const date = formatDate(guide.publishedAt)
  return (
    <article
      className={cn(
        "group relative flex flex-col gap-4",
        lead && "lg:grid lg:grid-cols-12 lg:items-center lg:gap-10",
        className
      )}
    >
      <FeedImage
        image={guide.heroImage}
        alt=""
        aspect={lead ? "16/9" : "3/2"}
        preload={preload}
        placeholderLabel="No photo for this guide"
        sizes={
          lead
            ? "(min-width: 1280px) 760px, (min-width: 1024px) 58vw, 100vw"
            : "(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
        }
        className={cn(
          "rounded-lg transition-[filter] duration-300 group-hover:brightness-95",
          lead && "lg:col-span-7"
        )}
      />
      <div className={cn("flex flex-col gap-2", lead && "lg:col-span-5")}>
        {date && (
          <p className="text-sm text-muted-foreground">
            <time dateTime={guide.publishedAt ?? undefined}>{date}</time>
          </p>
        )}
        <Heading
          className={cn(
            displayFont,
            "leading-tight text-balance",
            lead ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl"
          )}
        >
          <Link
            href={guideHref(guide)}
            className="decoration-(--brand-accent) decoration-2 underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/60"
          >
            {guide.title}
          </Link>
        </Heading>
        {guide.excerpt && (
          <p
            className={cn(
              "text-pretty text-muted-foreground",
              lead ? "text-lg" : "line-clamp-3 text-base"
            )}
          >
            {guide.excerpt}
          </p>
        )}
      </div>
    </article>
  )
}
