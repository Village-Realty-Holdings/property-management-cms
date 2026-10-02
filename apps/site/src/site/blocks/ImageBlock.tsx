import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import type { ImageBlock as ImageBlockData } from "../../payload-types"
import { imageOf } from "../brand"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { type BlockContext, placeOf } from "./types"

/** The box an image is cropped to. (Written out so Tailwind can see them.) */
const crops: Record<Exclude<ImageBlockData["aspect"], "original">, string> = {
  "16x9": "aspect-video",
  "4x3": "aspect-4/3",
  "1x1": "aspect-square",
}

/**
 * A Block is at most the page's width, and often a column of it; the browser
 * is told the widest it can be.
 */
const sizes = "(min-width: 1280px) 1280px, 100vw"

/** The image's own size, when the Media has one. */
function sizeOf(value: ImageBlockData["image"]) {
  if (!value || typeof value !== "object") return null
  const { width, height } = value
  return width && height ? { width, height } : null
}

/**
 * Image: one Media image with its alt text, rounded by the Theme's card
 * radius, and an optional caption. It keeps its own shape, or is cropped to
 * 16:9, 4:3 or 1:1. An image whose size isn't known (an SVG) can't keep its
 * shape, and is drawn at 4:3. With no image it renders nothing on the Site;
 * in the Visual Editor it is a box of its shape that says to choose one, so
 * the Block can be seen and selected there.
 */
export function ImageBlock({
  block,
  context,
}: {
  block: ImageBlockData
  context: BlockContext
}) {
  const image = imageOf(block.image)
  if (!image && !context.editing) return null
  const caption = block.caption?.trim()
  const size = image && block.aspect === "original" ? sizeOf(block.image) : null
  const crop =
    block.aspect === "original"
      ? crops["4x3"]
      : (crops[block.aspect] ?? crops["4x3"])
  return (
    <BlockSection
      background={surfaceOf(undefined, context)}
      // The section is a region, so it needs a name: what the image shows.
      label={caption || image?.alt || `Section ${placeOf(context)}`}
      context={context}
    >
      <figure className="flex flex-col gap-3">
        <div
          className={cn(
            "relative overflow-hidden rounded-(--card-radius)",
            !size && crop
          )}
        >
          {!image ? (
            <p
              data-image-placeholder=""
              className="absolute inset-0 flex items-center justify-center rounded-(--card-radius) border border-dashed border-current/40 p-4 text-center text-sm"
            >
              Choose an image for this Block.
            </p>
          ) : size ? (
            <Image
              src={image.url}
              alt={image.alt}
              width={size.width}
              height={size.height}
              sizes={sizes}
              className="h-auto w-full"
            />
          ) : (
            <Image
              src={image.url}
              alt={image.alt}
              fill
              sizes={sizes}
              className="object-cover"
            />
          )}
        </div>
        {caption && (
          <figcaption className="text-sm text-pretty">
            <EditableText field="caption" context={context}>
              {caption}
            </EditableText>
          </figcaption>
        )}
      </figure>
    </BlockSection>
  )
}
