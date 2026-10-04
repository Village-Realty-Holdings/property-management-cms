import { cn } from "@workspace/ui/lib/utils"

import type { FormBlock as FormBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { type BlockContext, blockId } from "./types"
import { VisualForm } from "./VisualForm"

/**
 * Form: a heading, some text and a visual-only form with the fields the
 * Block lists. On submit it shows its success message and stores nothing.
 * Everything but the form is server-safe; the form is a client island. It
 * lays itself out by the room it has (`fit-*`), so it fits a Container's
 * column.
 */
export function FormBlock({
  block,
  context,
}: {
  block: FormBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const id = blockId(context, "heading")
  const intro = block.intro?.trim()

  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={id}
      className="flex flex-col gap-8"
    >
      <div className="flex max-w-3xl flex-col gap-3">
        <EditableText
          as="h2"
          field="heading"
          context={context}
          id={id}
          className={cn(displayFont, "text-3xl text-balance fit-sm:text-4xl")}
        >
          {heading}
        </EditableText>
        {intro && (
          <EditableText
            as="p"
            field="intro"
            context={context}
            multiline
            className="text-lg text-pretty whitespace-pre-line"
          >
            {intro}
          </EditableText>
        )}
      </div>
      <VisualForm
        fields={block.formFields ?? []}
        submitLabel={block.submitLabel?.trim() || "Send"}
        successMessage={
          block.successMessage?.trim() ||
          "Thank you. We have received your message and will be in touch soon."
        }
        context={{
          index: context.index,
          within: context.within,
          editing: context.editing,
        }}
      />
    </BlockSection>
  )
}
