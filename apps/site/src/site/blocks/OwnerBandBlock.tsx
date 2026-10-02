import { cn } from "@workspace/ui/lib/utils"

import type { OwnerBandBlock as OwnerBandBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockButton, linkOf, type BlockSurface } from "./BlockButton"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { Icon } from "./Icon"
import { type BlockContext, blockId } from "./types"

/**
 * Owner band: a pitch to property owners, their benefits and a call to
 * action. The pitch and button sit beside the benefits from `lg` up. On the
 * Primary or Dark background (the Block's own default is Dark) the button is
 * the accent one and its focus ring is drawn for the panel; on a page or
 * muted background it is the Theme's own button.
 */
export function OwnerBandBlock({
  block,
  context,
}: {
  block: OwnerBandBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const pitch = block.pitch?.trim()
  const button = linkOf(block.cta)
  const benefits = (block.benefits ?? []).flatMap((benefit, position) => {
    const text = benefit.text?.trim()
    return text ? [{ position, text, id: benefit.id }] : []
  })
  const background = surfaceOf(block.background, context)
  const surface: BlockSurface | undefined =
    background === "primary" || background === "dark" ? background : undefined
  const id = blockId(context, "heading")
  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={id}
    >
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-4">
          <EditableText
            as="h2"
            field="heading"
            context={context}
            id={id}
            className={cn(displayFont, "text-3xl text-balance sm:text-4xl")}
          >
            {heading}
          </EditableText>
          {pitch && (
            <EditableText
              as="p"
              field="pitch"
              context={context}
              multiline
              className="text-base text-pretty whitespace-pre-line sm:text-lg"
            >
              {pitch}
            </EditableText>
          )}
          {button && (
            <BlockButton
              link={button}
              tone={surface ? "accent" : "primary"}
              surface={surface}
              editable={{ field: "cta.label", context }}
              className="mt-2"
            />
          )}
        </div>
        {benefits.length > 0 && (
          <ul className="flex list-none flex-col gap-4">
            {benefits.map((benefit) => (
              <li key={benefit.id ?? benefit.position} className="flex gap-3">
                <Icon
                  name="circle-check"
                  className={cn(
                    "mt-0.5 size-6 shrink-0",
                    surface ? "text-accent" : "text-primary"
                  )}
                />
                <EditableText
                  field={`benefits.${benefit.position}.text`}
                  context={context}
                  className="text-base text-pretty sm:text-lg"
                >
                  {benefit.text}
                </EditableText>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BlockSection>
  )
}
