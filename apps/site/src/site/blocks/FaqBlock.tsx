import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import { cn } from "@workspace/ui/lib/utils"

import type { FaqBlock as FaqBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { faqPageJsonLd, jsonLdScript } from "./structuredData"
import type { BlockContext } from "./types"

/**
 * FAQ: question and answer pairs in an accordion (one open at a time, by
 * mouse or keyboard), on a card so the text is at AA on any background. It
 * also emits the same pairs as schema.org `FAQPage` JSON-LD, in the HTML the
 * server sends. Element ids come from the Block's position, not `useId`, so
 * the Visual Editor's canvas and the Site draw the same markup. Pairs missing their question or answer are left out of both.
 */
export function FaqBlock({
  block,
  context,
}: {
  block: FaqBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const id = `block-${context.index}-heading`
  // Keep each pair's position in the Block, so an edit in the Visual Editor
  // names the right field even when a blank pair is skipped.
  const items = (block.questions ?? []).flatMap((item, index) =>
    item.question?.trim() && item.answer?.trim() ? [{ item, index }] : []
  )
  const jsonLd = faqPageJsonLd(items.map(({ item }) => item))

  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={id}
      className="flex flex-col gap-8"
    >
      <EditableText
        as="h2"
        field="heading"
        context={context}
        id={id}
        className={cn(displayFont, "text-3xl text-balance sm:text-4xl")}
      >
        {heading}
      </EditableText>
      {items.length > 0 && (
        <Accordion className="max-w-3xl rounded-(--card-radius) bg-card px-4 text-card-foreground shadow-(--card-shadow) sm:px-6">
          {items.map(({ item, index }) => (
            <AccordionItem key={item.id ?? index} value={`faq-${index}`}>
              <AccordionTrigger
                id={`block-${context.index}-faq-${index}-question`}
                className="py-4 text-base"
              >
                <EditableText
                  field={`questions.${index}.question`}
                  context={context}
                >
                  {item.question}
                </EditableText>
              </AccordionTrigger>
              <AccordionContent
                id={`block-${context.index}-faq-${index}-answer`}
                className="text-base"
              >
                <EditableText
                  as="p"
                  field={`questions.${index}.answer`}
                  context={context}
                  multiline
                  className="whitespace-pre-line"
                >
                  {item.answer}
                </EditableText>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
        />
      )}
    </BlockSection>
  )
}
