import { Phone } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import type { HeaderActionsBlock } from "../../payload-types"
import { linkOf } from "../blocks/BlockButton"
import { EditableText } from "../blocks/Editable"
import { telHref } from "../theme"
import { focusOutline, RegionLink } from "./RegionLink"
import type { RegionContext } from "./types"

/**
 * The Header's phone number (the Block's own, else the Brand's, as a `tel:`
 * link), a login link and a button. Each is left out when it has nothing to
 * show.
 */
export function HeaderActions({
  block,
  context,
}: {
  block: HeaderActionsBlock
  context: RegionContext
}) {
  const phone =
    block.showPhone === false
      ? null
      : block.phone?.trim() || context.brand.phone
  const button = linkOf(block.button)
  const login = linkOf(block.login)
  if (!phone && !button && !login) return null
  // In a Container on a Primary or Dark band the links take its text colour.
  const onColour = context.surface === "primary" || context.surface === "dark"
  return (
    <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
      {phone && (
        <a
          href={telHref(phone)}
          className={cn(
            "inline-flex items-center gap-2 text-sm font-medium whitespace-nowrap hover:underline",
            !onColour && "text-foreground",
            focusOutline.page
          )}
        >
          <Phone aria-hidden className="size-4" />
          {phone}
        </a>
      )}
      {login && (
        <RegionLink
          href={login.href}
          className={cn(
            "text-sm font-medium underline-offset-4 hover:underline",
            onColour ? "underline" : "text-link",
            focusOutline.page
          )}
        >
          <EditableText field="login.label" context={context}>
            {login.label}
          </EditableText>
        </RegionLink>
      )}
      {button && (
        <RegionLink
          href={button.href}
          className={buttonVariants({ variant: "default" })}
        >
          <EditableText field="button.label" context={context}>
            {button.label}
          </EditableText>
        </RegionLink>
      )}
    </div>
  )
}
