import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "../site/display"

import { BlockButton, type BlockButtonTone } from "./block-link"
import { linkOf, str } from "./lib"
import { container, type BlockRendererProps } from "./types"

type Style = "primary" | "secondary" | "inverted"

const styles: Record<Style, { panel: string; button: BlockButtonTone }> = {
  // The Site's primary colour, accent button.
  primary: {
    panel: "bg-(--brand-primary) text-(--brand-primary-foreground)",
    button: "accent",
  },
  // Quiet: tinted paper with a hairline, primary button.
  secondary: {
    panel: "border border-border bg-secondary text-foreground",
    button: "primary",
  },
  // The accent colour, primary button.
  inverted: {
    panel: "bg-(--brand-accent) text-(--brand-accent-foreground)",
    button: "primary",
  },
}

const styleOf = (value: unknown): Style =>
  value === "secondary" || value === "inverted" ? value : "primary"

/** Call to Action: a short pitch with one button, in one of three styles. */
export function CallToActionBlock({ block, context }: BlockRendererProps) {
  const heading = str(block.heading)
  if (!heading) return null
  const body = str(block.body)
  const button = linkOf(block.button)
  const style = styles[styleOf(block.style)]
  const id = `block-${context.index}-heading`
  return (
    <section aria-labelledby={id} className={`${container} py-10 sm:py-14`}>
      <div
        className={cn(
          "relative flex flex-col gap-6 overflow-hidden rounded-2xl px-6 py-10 sm:px-10 sm:py-12 md:flex-row md:items-center md:justify-between md:gap-12 lg:px-14",
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
            <p className="text-base text-pretty whitespace-pre-line opacity-85 sm:text-lg">
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
