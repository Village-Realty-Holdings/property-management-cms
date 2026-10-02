import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import type { BlogTeaserBlock as BlogTeaserBlockData } from "../../payload-types"
import { displayFont } from "../display"
import type { BlogPost } from "../fixtures/types"
import {
  BlockButton,
  linkOf,
  type BlockButtonTone,
  type BlockSurface,
} from "./BlockButton"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { type BlockContext, blockId } from "./types"

/** How many posts the teaser shows. */
const POSTS_SHOWN = 3

/**
 * What the all-posts button and a card's focus outline take from the
 * background: the coloured surfaces need the surface's own text colour (the
 * Theme's --ring is the primary colour, invisible on a primary section).
 * (Class names are written out so Tailwind can see them.)
 */
const onBackground = {
  default: { tone: "primary", surface: undefined, outline: "outline-ring" },
  muted: { tone: "primary", surface: undefined, outline: "outline-ring" },
  primary: {
    tone: "accent",
    surface: "primary",
    outline: "outline-primary-foreground",
  },
  dark: {
    tone: "accent",
    surface: "dark",
    outline: "outline-surface-dark-foreground",
  },
} as const satisfies Record<
  string,
  { tone: BlockButtonTone; surface: BlockSurface | undefined; outline: string }
>

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
})

/** "May 18, 2026" for an ISO date, or null when it isn't one. */
function formatDate(iso: string): string | null {
  const time = Date.parse(iso)
  return Number.isNaN(time) ? null : dateFormat.format(time)
}

/**
 * A post's card. The title is its one link, stretched over the whole card so
 * the card is one target and one tab stop. A post lives off the Site, so the
 * link leaves in the same tab without handing over the opener or the referrer.
 */
function PostCard({ post, outline }: { post: BlogPost; outline: string }) {
  const date = formatDate(post.date)
  const external = !post.url.startsWith("/")
  return (
    <article
      className={cn(
        "group/post relative flex h-full flex-col overflow-hidden rounded-(--card-radius) bg-card text-card-foreground shadow-(--card-shadow) ring-1 ring-foreground/10",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
        outline
      )}
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted">
        <Image
          src={post.image.src}
          alt={post.image.alt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {date && (
          <time dateTime={post.date} className="text-sm text-muted-foreground">
            {date}
          </time>
        )}
        <h3 className={cn(displayFont, "text-xl leading-snug text-balance")}>
          <a
            href={post.url}
            {...(external ? { rel: "noopener noreferrer" } : {})}
            className="outline-none group-hover/post:underline after:absolute after:inset-0"
          >
            {post.title}
          </a>
        </h3>
        <p className="text-base text-pretty">{post.excerpt}</p>
      </div>
    </article>
  )
}

/**
 * Blog teaser: the Site's first three blog posts as cards, each linking out
 * to its post. The posts are the Site's fixtures; with none, it says so.
 */
export function BlogTeaserBlock({
  block,
  context,
}: {
  block: BlogTeaserBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const id = blockId(context, "heading")
  const posts = context.fixtures.posts.slice(0, POSTS_SHOWN)
  const background = onBackground[surfaceOf(block.background, context)]
  const allPosts = linkOf(block.allPostsLink)
  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={id}
    >
      <div className="flex flex-col gap-8 sm:gap-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <EditableText
            as="h2"
            field="heading"
            context={context}
            id={id}
            className={cn(displayFont, "text-3xl text-balance sm:text-4xl")}
          >
            {heading}
          </EditableText>
          {allPosts && (
            <BlockButton
              link={allPosts}
              tone={background.tone}
              surface={background.surface}
              editable={{ field: "allPostsLink.label", context }}
              className="self-start sm:shrink-0"
            />
          )}
        </div>
        {posts.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.url}>
                <PostCard post={post} outline={background.outline} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-(--card-radius) border border-dashed border-current/40 p-8 text-center text-lg text-balance">
            No posts yet. Check back soon for stories and tips.
          </p>
        )}
      </div>
    </BlockSection>
  )
}
