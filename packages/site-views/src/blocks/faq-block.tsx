import { PlusIcon } from "lucide-react"

import { RichText } from "../site/rich-text"
import { SectionHeading } from "../site/section-heading"

import { faqItemsOf, faqJsonLd, jsonForScript, str } from "./lib"
import { container, type BlockRendererProps } from "./types"

/**
 * FAQ: questions that open to their answers (native <details>, so it works
 * without JavaScript and with the keyboard), plus FAQPage structured data.
 */
export function FaqBlock({ block, context }: BlockRendererProps) {
  const items = faqItemsOf(block.items)
  if (items.length === 0) return null
  const heading = str(block.heading) ?? "Questions and answers"
  const id = `block-${context.index}-heading`
  const jsonLd = faqJsonLd(items)
  return (
    <section
      aria-labelledby={id}
      className={`${container} grid gap-8 py-16 sm:py-20 lg:grid-cols-[1fr_2fr] lg:gap-16`}
    >
      <SectionHeading id={id} title={heading} className="lg:self-start" />
      <div className="border-t border-border">
        {items.map((item, i) => (
          <details
            key={`${i}-${item.question}`}
            className="group border-b border-border"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-lg font-medium outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
              <span className="text-pretty">{item.question}</span>
              <PlusIcon
                aria-hidden
                className="size-5 shrink-0 text-(--brand-primary) transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
              />
            </summary>
            <RichText
              data={item.answer}
              className="pr-10 pb-6 text-muted-foreground"
            />
          </details>
        ))}
      </div>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonForScript(jsonLd) }}
        />
      )}
    </section>
  )
}
