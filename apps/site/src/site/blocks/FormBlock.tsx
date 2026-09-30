import { cn } from "@workspace/ui/lib/utils"

import type { FormBlock as FormBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection } from "./BlockSection"
import { EditableText } from "./Editable"
import type { BlockContext } from "./types"
import { VisualForm } from "./VisualForm"

/**
 * Form: a heading, some text and a visual-only form with the fields the
 * Block lists. On submit it shows its success message and stores nothing.
 * Everything but the form is server-safe; the form is a client island.
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
  const id = `block-${context.index}-heading`
  const intro = block.intro?.trim()

  return (
    <BlockSection
      background={block.background}
      labelledBy={id}
      className="flex flex-col gap-8"
    >
      <div className="flex max-w-3xl flex-col gap-3">
        <EditableText
          as="h2"
          field="heading"
          context={context}
          id={id}
          className={cn(displayFont, "text-3xl text-balance sm:text-4xl")}
        >
          {heading}
        </EditableText>
        {intro && (
          <EditableText
            as="p"
            field="intro"
            context={context}
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
        context={{ index: context.index, editing: context.editing }}
      />
    </BlockSection>
  )
}
