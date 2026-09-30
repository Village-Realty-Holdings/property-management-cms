import { cn } from "@workspace/ui/lib/utils"

import type { CallToActionBlock as CallToActionBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockButton, linkOf, type BlockButtonTone } from "./BlockButton"
import { container, sectionY, type BlockContext } from "./types"

type Style = CallToActionBlockData["style"]

const styles: Record<Style, { panel: string; button: BlockButtonTone }> = {
  // The Site's primary colour, accent button.
  primary: {
    panel: "bg-primary text-primary-foreground",
    button: "accent",
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
  },
}

/** Call to action: a short pitch with one button, in one of three styles. */
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
  const id = `block-${context.index}-heading`
  return (
    <section aria-labelledby={id} className={`${container} ${sectionY}`}>
      <div
        className={cn(
          "relative flex flex-col gap-6 overflow-hidden rounded-(--card-radius) px-6 py-10 sm:px-10 sm:py-12 md:flex-row md:items-center md:justify-between md:gap-12 lg:px-14",
          "shadow-(--card-shadow)",
          style.panel
        )}
      >
        <div className="flex max-w-2xl flex-col gap-3">
          <h2
            id={id}
            className={cn(
              displayFont,
              "text-3xl leading-[1.05] text-balance sm:text-4xl"
            )}
          >
            {heading}
          </h2>
          {body && (
            <p className="text-base text-pretty whitespace-pre-line sm:text-lg">
              {body}
            </p>
          )}
        </div>
        {button && (
          <BlockButton
            link={button}
            tone={style.button}
            className="self-start md:self-auto"
          />
        )}
      </div>
    </section>
  )
}
