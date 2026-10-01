import { RichText } from "../site/rich-text"
import { clientLink } from "../lib/utm"

import { lexicalText, linkOf, str } from "./lib"
import { TuckInCta, tuckInLink } from "./tuck-in-cta"
import { tuckInContainer, type BlockRendererProps } from "./types"

type Point = { title: string; text: unknown }

function pointsOf(value: unknown): Point[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const title = str((item as { title?: unknown } | null)?.title)
    return title ? [{ title, text: (item as { text?: unknown }).text }] : []
  })
}

/**
 * Audience: what the news means for owners or guests (Tuck-In). Links to
 * the Client's website get UTM parameters (`owner_…`/`guest_…`), and an
 * Audience that follows another is set off by a rule, as in pclodge-landing.
 */
export function AudienceBlock({ block, context }: BlockRendererProps) {
  const title = str(block.title)
  if (!title) return null
  const who = block.audience === "owners" ? "owner" : "guest"
  const points = pointsOf(block.points)
  const closing = str(block.closing)
  const cta = linkOf(block.cta)
  const textLink = (href: string) =>
    clientLink(href, context.site, `${who}_text_link`)
  const id = `block-${context.index}-title`
  const afterAudience =
    context.page.blocks[context.index - 1]?.blockType === "audience"

  return (
    <div className={`${tuckInContainer} flex flex-col gap-10 pt-10`}>
      {afterAudience && <hr className="border-primary/30" />}
      <section
        aria-labelledby={id}
        className="flex flex-col gap-4 leading-relaxed"
      >
        <h2 id={id} className="text-xl font-bold text-(--tuck-in-heading)">
          {title}
        </h2>
        {lexicalText(block.intro) && (
          <RichText
            data={block.intro}
            className="max-w-none leading-relaxed"
            linkHref={textLink}
            linkClassName={tuckInLink}
          />
        )}
        {points.length > 0 && (
          <div className="flex flex-col gap-4">
            {points.map((point) => (
              <div key={point.title}>
                <strong className="block font-bold">{point.title}</strong>
                <RichText
                  data={point.text}
                  className="max-w-none gap-2 leading-relaxed"
                  linkHref={textLink}
                  linkClassName={tuckInLink}
                />
              </div>
            ))}
          </div>
        )}
        {closing && <p className="whitespace-pre-line">{closing}</p>}
        {cta && (
          <div className="pt-4">
            <TuckInCta
              href={clientLink(cta.href, context.site, `${who}_cta_button`)}
              label={cta.label}
            />
          </div>
        )}
      </section>
    </div>
  )
}
