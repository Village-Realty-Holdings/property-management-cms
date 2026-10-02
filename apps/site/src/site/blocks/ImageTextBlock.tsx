import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import type { ImageTextBlock as ImageTextBlockData } from "../../payload-types"
import { imageOf } from "../brand"
import { displayFont } from "../display"
import { BlockSection, surfaceOf } from "./BlockSection"
import { EditableText } from "./Editable"
import { IconList } from "./IconList"
import { type BlockContext, blockId } from "./types"

/**
 * Image + text: an image on the left or right beside text, with an optional
 * icon list and caption. On a phone the image stacks above the text
 * whichever side it is on. With no image the text takes the full width.
 */
export function ImageTextBlock({
  block,
  context,
}: {
  block: ImageTextBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const text = block.text?.trim()
  const caption = block.caption?.trim()
  const image = imageOf(block.image)
  const points = (block.points ?? []).map((point, index) => ({
    icon: point.icon,
    text: point.text,
    field: `points.${index}.text`,
  }))
  const id = blockId(context, "heading")
  return (
    <BlockSection
      background={surfaceOf(block.background, context)}
      labelledBy={id}
    >
      <div
        className={cn(
          "grid items-center gap-8 md:gap-12 lg:gap-16",
          image && "md:grid-cols-2"
        )}
      >
        {image && (
          <figure
            className={cn(
              "flex flex-col gap-3",
              block.imageSide === "right" && "md:order-last"
            )}
          >
            <div className="relative aspect-4/3 overflow-hidden rounded-(--card-radius) shadow-(--card-shadow)">
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            {caption && (
              <figcaption className="text-sm text-pretty">
                <EditableText field="caption" context={context}>
                  {caption}
                </EditableText>
              </figcaption>
            )}
          </figure>
        )}
        <div className="flex flex-col gap-6">
          <EditableText
            as="h2"
            field="heading"
            context={context}
            id={id}
            className={cn(displayFont, "text-3xl text-balance sm:text-4xl")}
          >
            {heading}
          </EditableText>
          {text && (
            <EditableText
              as="p"
              field="text"
              context={context}
              className="text-base text-pretty whitespace-pre-line sm:text-lg"
            >
              {text}
            </EditableText>
          )}
          <IconList
            items={points}
            background={surfaceOf(block.background, context)}
            context={context}
          />
        </div>
      </div>
    </BlockSection>
  )
}
