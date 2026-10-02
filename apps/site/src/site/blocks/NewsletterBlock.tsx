import { cn } from "@workspace/ui/lib/utils"

import type { NewsletterBlock as NewsletterBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { NewsletterForm } from "./NewsletterForm"
import { type BlockContext, blockId } from "./types"

/**
 * Newsletter: a heading, some text and a visual-only email form. The text
 * and the form sit side by side from `fit-md` up and stack below it, which
 * also suits a Footer, where the Block arrives through the page Block
 * registry. It lays itself out by the room it has (`fit-*`), so it fits a
 * Container's column.
 */
export function NewsletterBlock({
  block,
  context,
}: {
  block: NewsletterBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const text = block.text?.trim()
  const background = surfaceOf(block.background, context)
  const id = blockId(context, "heading")
  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={id}
    >
      <div className="grid items-center gap-8 fit-md:grid-cols-2 fit-md:gap-12">
        <div className="flex flex-col gap-3">
          <EditableText
            as="h2"
            field="heading"
            context={context}
            id={id}
            className={cn(displayFont, "text-3xl text-balance fit-sm:text-4xl")}
          >
            {heading}
          </EditableText>
          {text && (
            <EditableText
              as="p"
              field="text"
              context={context}
              multiline
              className="text-base text-pretty whitespace-pre-line fit-sm:text-lg"
            >
              {text}
            </EditableText>
          )}
        </div>
        <NewsletterForm
          placeholder={block.emailPlaceholder?.trim() || "Your email address"}
          buttonLabel={block.buttonLabel?.trim() || "Subscribe"}
          surface={
            background === "primary" || background === "dark"
              ? background
              : undefined
          }
          context={context}
        />
      </div>
    </BlockSection>
  )
}
