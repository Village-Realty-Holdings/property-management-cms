import { cn } from "@workspace/ui/lib/utils"

import type { CallToActionBlock as CallToActionBlockData } from "../../payload-types"
import { displayFont } from "../display"
import {
  BlockButton,
  linkOf,
  type BlockButtonTone,
  type BlockSurface,
} from "./BlockButton"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { type BlockContext, blockId } from "./types"

type Style = CallToActionBlockData["style"]

const styles: Record<
  Style,
  { panel: string; button: BlockButtonTone; surface?: BlockSurface }
> = {
  // The Site's primary colour, accent button.
  primary: {
    panel: "bg-primary text-primary-foreground",
    button: "accent",
    surface: "primary",
  },
  // Quiet: tinted paper with a hairline, primary button.
  secondary: {
    panel: "border border-border bg-secondary text-foreground",
    button: "primary",
  },
  // The accent colour, primary button drawn for the accent panel.
  inverted: {
    panel: "bg-accent text-accent-foreground",
    button: "onAccent",
    surface: "accent",
  },
  // The Theme's dark surface, accent button.
  dark: {
    panel:
      "border border-surface-dark-foreground/15 bg-surface-dark text-surface-dark-foreground",
    button: "accent",
    surface: "dark",
  },
}

/** Call to action: a short pitch with one button, in one of four styles. */
export function CallToActionBlock({
  block,
  context,
}: {
  block: CallToActionBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const body = block.body?.trim()
  const button = linkOf(block.button)
  const style = styles[block.style] ?? styles.primary
  const id = blockId(context, "heading")
  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={id}
    >
      <div
        className={cn(
          "relative flex flex-col gap-6 overflow-hidden rounded-(--card-radius) px-6 py-10 sm:px-10 sm:py-12 md:flex-row md:items-center md:justify-between md:gap-12 lg:px-14",
          "shadow-(--card-shadow)",
          style.panel
        )}
      >
        <div className="flex max-w-2xl flex-col gap-3">
          <EditableText
            as="h2"
            field="heading"
            context={context}
            id={id}
            className={cn(
              displayFont,
              "text-3xl leading-[1.05] text-balance sm:text-4xl"
            )}
          >
            {heading}
          </EditableText>
          {body && (
            <EditableText
              as="p"
              field="body"
              context={context}
              multiline
              className="text-base text-pretty whitespace-pre-line sm:text-lg"
            >
              {body}
            </EditableText>
          )}
        </div>
        {button && (
          <BlockButton
            link={button}
            tone={style.button}
            surface={style.surface}
            editable={{ field: "button.label", context }}
            className="self-start md:self-auto"
          />
        )}
      </div>
    </BlockSection>
  )
}
