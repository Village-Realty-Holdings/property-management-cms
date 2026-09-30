import { cn } from "@workspace/ui/lib/utils"

import type { FeaturesBlock as FeaturesBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection } from "./BlockSection"
import { EditableText } from "./Editable"
import { IconBadge } from "./IconList"
import type { BlockContext } from "./types"

/**
 * Features: a grid of icon, title and text. The icon is a Lucide icon
 * picked by name; one that is no longer on the list leaves the feature as
 * its title and text.
 */
export function FeaturesBlock({
  block,
  context,
}: {
  block: FeaturesBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const intro = block.intro?.trim()
  const features = (block.features ?? [])
    .map((feature, index) => ({
      index,
      icon: feature.icon,
      title: feature.title?.trim() ?? "",
      text: feature.text?.trim() ?? "",
    }))
    .filter((feature) => feature.title || feature.text)
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
      {features.length > 0 && (
        <ul
          role="list"
          className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <li key={feature.index} className="flex flex-col items-start gap-4">
              <IconBadge
                name={feature.icon}
                background={block.background}
                className="size-12"
              />
              <div className="flex flex-col gap-2">
                {feature.title && (
                  <EditableText
                    as="h3"
                    field={`features.${feature.index}.title`}
                    context={context}
                    className={cn(displayFont, "text-xl text-balance")}
                  >
                    {feature.title}
                  </EditableText>
                )}
                {feature.text && (
                  <EditableText
                    as="p"
                    field={`features.${feature.index}.text`}
                    context={context}
                    className="text-base text-pretty"
                  >
                    {feature.text}
                  </EditableText>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </BlockSection>
  )
}
