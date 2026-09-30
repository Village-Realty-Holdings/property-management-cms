import { cn } from "@workspace/ui/lib/utils"

import type { NewsletterBlock as NewsletterBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection, backgroundOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { NewsletterForm } from "./NewsletterForm"
import type { BlockContext } from "./types"

/**
 * Newsletter: a heading, some text and a visual-only email form. The text
 * and the form sit side by side from `md` up and stack below it, which also
 * suits a Footer, where the Block arrives through the page Block registry.
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
  const background = backgroundOf(block.background)
  const id = `block-${context.index}-heading`
  return (
    <BlockSection background={block.background} labelledBy={id}>
      <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
        <div className="flex flex-col gap-3">
          <EditableText
            as="h2"
            field="heading"
            context={context}
            id={id}
            className={cn(displayFont, "text-3xl text-balance sm:text-4xl")}
          >
            {heading}
          </EditableText>
          {text && (
            <EditableText
              as="p"
              field="text"
              context={context}
              className="text-base text-pretty whitespace-pre-line sm:text-lg"
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
