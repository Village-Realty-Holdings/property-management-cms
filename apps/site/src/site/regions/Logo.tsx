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
} as const

/**
 * The Site's logo from the Brand (never chosen here): the Brand's logo image,
 * or its name as a wordmark when it has none. It links home.
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
  return (
    <div className="flex min-w-0 flex-col">
      <RegionLink
        href="/"
        className={cn(
          "inline-flex items-center gap-3 text-foreground",
          focusOutline.page
        )}
      >
        {brand.logo ? (
          <Image
            src={brand.logo.url}
            alt={brand.logo.alt || brand.name}
            width={160}
            height={48}
            className={cn(size.image, "w-auto object-contain")}
          />
        ) : (
          <span className={cn(displayFont, size.name)}>{brand.name}</span>
        )}
      </RegionLink>
      {block.showTagline && brand.tagline && (
        <span className="text-sm text-muted-foreground">{brand.tagline}</span>
      )}
    </div>
  )
}
