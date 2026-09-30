import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import type { AmenitiesBlock as AmenitiesBlockData } from "../../payload-types"
import { imageOf } from "../brand"
import { displayFont } from "../display"
import { BlockSection } from "./BlockSection"
import { EditableText } from "./Editable"
import { Icon } from "./Icon"
import { IconList } from "./IconList"
import type { BlockContext } from "./types"

type Item = { index: number; label: string } & Pick<
  AmenitiesBlockData["items"][number],
  "icon" | "image"
>

/**
 * The mosaic's tiles: the first of every five is large from the tablet up,
 * so the photos make an uneven, magazine-style grid that fills its rows.
 */
const tileSizes = ["md:col-span-2 md:row-span-2", "", "", "", ""]

/**
 * A photo tile: the photo, filling the tile, with its label at the bottom
 * over a scrim. The scrim is the Theme's dark surface, strong where the
 * label sits (and solid beneath it), so the label reads against any photo at
 * AA. A tile with no photo is the dark surface itself, with its icon.
 */
function Tile({
  item,
  position,
  context,
}: {
  item: Item
  position: number
  context: BlockContext
}) {
  const image = imageOf(item.image)
  return (
    <li
      className={cn(
        "relative isolate overflow-hidden rounded-(--card-radius) bg-surface-dark text-surface-dark-foreground shadow-(--card-shadow)",
        tileSizes[position % tileSizes.length]
      )}
    >
      {image ? (
        <Image
          src={image.url}
          alt={image.alt}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          className="-z-10 object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center pb-10">
          <Icon name={item.icon} className="size-10" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-surface-dark/90 via-surface-dark/85 via-60% to-transparent px-4 pt-12 pb-4 text-surface-dark-foreground">
        <EditableText
          as="p"
          field={`items.${item.index}.label`}
          context={context}
          className="text-lg leading-tight font-medium text-balance"
        >
          {item.label}
        </EditableText>
      </div>
    </li>
  )
}

/**
 * Amenities: a photo-tile mosaic or an icon list. The mosaic is the default
 * for a variant the Site no longer has.
 */
export function AmenitiesBlock({
  block,
  context,
}: {
  block: AmenitiesBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const intro = block.intro?.trim()
  const items: Item[] = (block.items ?? [])
    .map((item, index) => ({
      index,
      label: item.label?.trim() ?? "",
      icon: item.icon,
      image: item.image,
    }))
    .filter((item) => item.label)
  const id = `block-${context.index}-heading`
  return (
    <BlockSection
      background={block.background}
      labelledBy={id}
      className="flex flex-col gap-10 sm:gap-12"
    >
      <div className="flex max-w-2xl flex-col gap-3">
        <EditableText
          as="h2"
          field="heading"
          context={context}
          id={id}
          className={cn(displayFont, "text-3xl text-balance sm:text-4xl")}
        >
          {heading}
        </EditableText>
        {intro && (
          <EditableText
            as="p"
            field="intro"
            context={context}
            className="text-base text-pretty whitespace-pre-line sm:text-lg"
          >
            {intro}
          </EditableText>
        )}
      </div>
      {items.length > 0 &&
        (block.variant === "icons" ? (
          <IconList
            columns="grid"
            background={block.background}
            context={context}
            items={items.map((item) => ({
              icon: item.icon,
              text: item.label,
              field: `items.${item.index}.label`,
            }))}
          />
        ) : (
          <ul
            role="list"
            className="grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] sm:gap-4 md:grid-cols-4"
          >
            {items.map((item, position) => (
              <Tile
                key={item.index}
                item={item}
                position={position}
                context={context}
              />
            ))}
          </ul>
        ))}
    </BlockSection>
  )
}
