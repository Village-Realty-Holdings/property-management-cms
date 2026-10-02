import { cn } from "@workspace/ui/lib/utils"

import type { StepsBlock as StepsBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import type { BlockContext } from "./types"

/**
 * The number's disc: the background's text colour as the fill and the
 * background's fill as the number, or the Theme's primary pair on a page or
 * muted background. Contrast is the same both ways round, so the pair the
 * Theme derived to pass AA still passes.
 */
const discs = {
  default: "bg-primary text-primary-foreground",
  muted: "bg-primary text-primary-foreground",
  primary: "bg-primary-foreground text-primary",
  dark: "bg-surface-dark-foreground text-surface-dark",
} as const

/** Columns at `lg`, by the number of steps shown. (Class names are written out so Tailwind can see them.) */
const columns: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
}

/**
 * Steps: three or four numbered steps, each with a title and text, in an
 * ordered list. A step with no title is left out and the rest are numbered
 * on; each keeps its place in the stored list for in-place editing.
 */
export function StepsBlock({
  block,
  context,
}: {
  block: StepsBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const intro = block.intro?.trim()
  const steps = (block.steps ?? []).flatMap((step, position) => {
    const title = step.title?.trim()
    return title
      ? [{ position, title, text: step.text?.trim() ?? "", id: step.id }]
      : []
  })
  const disc = discs[surfaceOf(block.background, context)]
  const id = `block-${context.index}-heading`
  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={id}
      className="flex flex-col gap-10"
    >
      <div className="flex max-w-2xl flex-col gap-3">
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
            multiline
            className="text-base text-pretty whitespace-pre-line sm:text-lg"
          >
            {intro}
          </EditableText>
        )}
      </div>
      {steps.length > 0 && (
        <ol
          className={cn(
            "grid list-none gap-x-8 gap-y-10 sm:grid-cols-2",
            columns[steps.length] ?? "lg:grid-cols-4"
          )}
        >
          {steps.map((step, i) => (
            <li key={step.id ?? step.position} className="flex flex-col gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  displayFont,
                  "flex size-12 items-center justify-center rounded-full text-xl leading-none",
                  disc
                )}
              >
                {i + 1}
              </span>
              <EditableText
                as="h3"
                field={`steps.${step.position}.title`}
                context={context}
                className={cn(displayFont, "text-xl text-balance")}
              >
                {step.title}
              </EditableText>
              {step.text && (
                <EditableText
                  as="p"
                  field={`steps.${step.position}.text`}
                  context={context}
                  multiline
                  className="text-base text-pretty whitespace-pre-line"
                >
                  {step.text}
                </EditableText>
              )}
            </li>
          ))}
        </ol>
      )}
    </BlockSection>
  )
}
