import { cn } from "@workspace/ui/lib/utils"

import type { Background } from "../../fields/background"
import { backgroundOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { Icon } from "./Icon"
import { isIconName } from "./icons"
import type { BlockContext } from "./types"

/**
 * The icon's badge on each background: a chip in the Theme's own pair of
 * colours, so the icon reads on every Theme. On a primary section the pair
 * is inverted (primary on primary would vanish). (Class names are written
 * out so Tailwind can see them.)
 */
const badges: Record<Background, string> = {
  default: "bg-primary text-primary-foreground",
  muted: "bg-primary text-primary-foreground",
  primary: "bg-primary-foreground text-primary",
  dark: "bg-surface-dark-foreground text-surface-dark",
}

/**
 * An icon in its badge. Decorative: the text beside it says what it means.
 * Renders nothing for an icon that is unset or no longer on the list.
 */
export function IconBadge({
  name,
  background,
  className,
}: {
  name: string | null | undefined
  background?: string | null
  className?: string
}) {
  if (!isIconName(name)) return null
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-(--card-radius)",
        badges[backgroundOf(background)],
        className
      )}
    >
      <Icon name={name} className="size-5" />
    </span>
  )
}

export type IconListItem = {
  icon?: string | null
  text: string
  /** The text's field in the Block, for the Visual Editor: "points.0.text". */
  field: string
}

/**
 * A list of short items, each with a Lucide icon: the list of an Image +
 * text Block and the icon variant of Amenities. An item with no text is
 * left out; an icon that is unset or no longer on the list leaves the item
 * as text alone. `columns` lays the items out one per row (`one`) or as a
 * grid that widens with the screen (`grid`).
 */
export function IconList({
  items,
  background,
  columns = "one",
  context,
  className,
}: {
  items: readonly IconListItem[]
  background?: string | null
  columns?: "one" | "grid"
  context: Pick<BlockContext, "index" | "editing">
  className?: string
}) {
  const shown = items
    .map((item) => ({ ...item, text: item.text?.trim() ?? "" }))
    .filter((item) => item.text)
  if (shown.length === 0) return null
  return (
    <ul
      role="list"
      className={cn(
        "grid gap-x-8 gap-y-4",
        columns === "grid" && "sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {shown.map((item) => (
        <li key={item.field} className="flex items-center gap-3">
          <IconBadge name={item.icon} background={background} />
          <EditableText
            as="span"
            field={item.field}
            context={context}
            className="text-base font-medium"
          >
            {item.text}
          </EditableText>
        </li>
      ))}
    </ul>
  )
}
