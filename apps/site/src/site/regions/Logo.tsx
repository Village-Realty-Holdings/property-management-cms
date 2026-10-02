import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import type { LogoBlock } from "../../payload-types"
import { displayFont } from "../display"
import { focusOutline, RegionLink } from "./RegionLink"
import type { RegionContext } from "./types"

const sizes = {
  small: { image: "h-8", name: "text-xl" },
  medium: { image: "h-10", name: "text-2xl" },
  large: { image: "h-14", name: "text-3xl" },
  xlarge: { image: "h-20 sm:h-24", name: "text-4xl" },
} as const

/**
 * The Site's logo from the Brand (never chosen here): the Brand's logo image,
 * or its name as a wordmark when it has none. It links home. In a Container
 * on a Primary or Dark background it is the Brand's light logo, when there
 * is one, and the wordmark takes the band's text colour.
 */
export function Logo({
  block,
  context,
}: {
  block: LogoBlock
  context: RegionContext
}) {
  const { brand } = context
  const size = sizes[block.size] ?? sizes.medium
  const onColour = context.surface === "primary" || context.surface === "dark"
  const logo = (onColour && brand.logoLight) || brand.logo
  return (
    <div className="flex min-w-0 flex-col">
      <RegionLink
        href="/"
        className={cn(
          "inline-flex items-center gap-3",
          onColour
            ? focusOutline.primary
            : ["text-foreground", focusOutline.page]
        )}
      >
        {logo ? (
          <Image
            src={logo.url}
            alt={logo.alt || brand.name}
            // At the top of every page: the likeliest largest paint.
            preload
            width={160}
            height={48}
            className={cn(size.image, "w-auto object-contain")}
          />
        ) : (
          <span className={cn(displayFont, size.name)}>{brand.name}</span>
        )}
      </RegionLink>
      {block.showTagline && brand.tagline && (
        <span className={cn("text-sm", !onColour && "text-muted-foreground")}>
          {brand.tagline}
        </span>
      )}
    </div>
  )
}
