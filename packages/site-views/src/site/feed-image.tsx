import Image from "next/image"
import { HouseIcon } from "lucide-react"

import type { Image as ContentImage } from "@workspace/content/queries"
import { cn } from "@workspace/ui/lib/utils"

export type FeedImageProps = {
  image: ContentImage | null
  /** The `sizes` attribute for this slot, e.g. "(min-width: 1024px) 33vw, 100vw". */
  sizes: string
  /** Overrides `image.alt`. Pass "" for a purely decorative image. */
  alt?: string
  /** Aspect ratio of the frame. @default "4/3" */
  aspect?: "4/3" | "3/2" | "16/9" | "1/1" | "3/4"
  /** Preload above-the-fold images (the first cards, a hero). */
  preload?: boolean
  className?: string
  /** Label for the placeholder when there is no photo. @default "Photo coming soon" */
  placeholderLabel?: string
}

const aspects = {
  "4/3": "aspect-4/3",
  "3/2": "aspect-3/2",
  "16/9": "aspect-video",
  "1/1": "aspect-square",
  "3/4": "aspect-3/4",
} as const

/**
 * A Feed photo or editorial Media image in a fixed-ratio frame (next/image,
 * `fill` + `object-cover`), so layouts don't shift. Without a photo it shows
 * a quiet branded placeholder instead of a broken image.
 */
export function FeedImage({
  image,
  sizes,
  alt,
  aspect = "4/3",
  preload = false,
  className,
  placeholderLabel = "Photo coming soon",
}: FeedImageProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        aspects[aspect],
        className
      )}
    >
      {image?.url ? (
        <Image
          src={image.url}
          alt={alt ?? image.alt ?? ""}
          fill
          sizes={sizes}
          preload={preload}
          className="object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={placeholderLabel}
          className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--brand-accent)_28%,transparent),transparent_60%),linear-gradient(160deg,color-mix(in_oklab,var(--brand-primary)_14%,white),color-mix(in_oklab,var(--brand-primary)_30%,white))]"
        >
          <HouseIcon
            aria-hidden
            strokeWidth={1.25}
            className="size-10 text-(--brand-primary) opacity-45"
          />
        </div>
      )}
    </div>
  )
}
