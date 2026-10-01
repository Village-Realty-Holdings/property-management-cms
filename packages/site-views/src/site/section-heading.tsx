import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "./display"

export type SectionHeadingProps = {
  title: ReactNode
  /** A sentence under the title. */
  description?: ReactNode
  /** @default "h2" */
  as?: "h1" | "h2" | "h3"
  /** A link beside the title, e.g. "See all rentals". */
  action?: ReactNode
  /** For `aria-labelledby` on the section. */
  id?: string
  className?: string
}

const sizes = {
  h1: "text-4xl sm:text-5xl",
  h2: "text-3xl sm:text-4xl",
  h3: "text-2xl",
} as const

/** A section's title in the Site's display face, with an optional action. */
export function SectionHeading({
  title,
  description,
  as: Heading = "h2",
  action,
  id,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8",
        className
      )}
    >
      <div className="flex max-w-2xl flex-col gap-2">
        <Heading
          id={id}
          className={cn(
            displayFont,
            "leading-[1.05] text-balance",
            sizes[Heading]
          )}
        >
          {title}
        </Heading>
        {description && (
          <p className="text-base text-pretty text-muted-foreground sm:text-lg">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
