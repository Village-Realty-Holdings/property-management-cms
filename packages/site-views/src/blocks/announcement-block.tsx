import { str } from "./lib"
import { tuckInContainer, type BlockRendererProps } from "./types"

/** Announcement: the Tuck-In headline, "{site} Joins {client}!". */
export function AnnouncementBlock({ block, context }: BlockRendererProps) {
  const headline = str(block.headline)
  if (!headline) return null
  const subheading = str(block.subheading)
  // The Page's h1 when it opens the Page (see opensWithHero).
  const Heading = context.index === 0 ? "h1" : "h2"
  return (
    <section className={`${tuckInContainer} flex flex-col gap-3 pt-6`}>
      <Heading className="text-3xl leading-tight font-extrabold text-(--tuck-in-heading) sm:text-4xl">
        {headline}
      </Heading>
      {subheading && (
        <p className="text-lg leading-relaxed whitespace-pre-line">
          {subheading}
        </p>
      )}
    </section>
  )
}
