import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import type { HeroBlock as HeroBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { imageOf } from "../brand"
import { BlockButton, linkOf } from "./BlockButton"
import { EditableText } from "./Editable"
import { container, type BlockContext } from "./types"

/**
 * Hero: the Page's opening statement. With an image it's a full-bleed photo
 * with the heading over a shade; without, the Site's primary colour with an
 * accent glow.
 */
export function HeroBlock({
  block,
  context,
}: {
  block: HeroBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  if (!heading) return null
  const subheading = block.subheading?.trim()
  const cta = linkOf(block.cta)
  const image = imageOf(block.image)
  const first = context.index === 0
  const Heading = first ? "h1" : "h2"
  const id = `block-${context.index}-heading`

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "relative isolate overflow-hidden",
        image
          ? "bg-surface-dark text-surface-dark-foreground"
          : "bg-primary text-primary-foreground"
      )}
    >
      {image ? (
        <>
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="100vw"
            preload={first}
            className="-z-20 object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-t from-surface-dark/80 via-surface-dark/45 to-surface-dark/10"
          />
        </>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-40 -z-10 size-[28rem] rounded-full bg-accent opacity-20 blur-3xl sm:size-[40rem]"
        />
      )}
      <div
        className={cn(
          container,
          "flex flex-col gap-8",
          image
            ? "min-h-[34rem] justify-end pt-[calc(var(--section-y)*3.2)] pb-[calc(var(--section-y)*1.4)] sm:min-h-[40rem] sm:pb-[calc(var(--section-y)*2)]"
            : "pt-[calc(var(--section-y)*1.6)] pb-[calc(var(--section-y)*1.4)] sm:pt-[calc(var(--section-y)*2.4)] sm:pb-[calc(var(--section-y)*2)]"
        )}
      >
        <EditableText
          as={Heading}
          field="heading"
          context={context}
          id={id}
          className={cn(
            displayFont,
            first ? "text-5xl sm:text-7xl lg:text-8xl" : "text-4xl sm:text-6xl",
            // After the sizes: tailwind-merge drops a leading-* that precedes a text-* size.
            "max-w-5xl leading-[0.95] text-balance"
          )}
        >
          {heading}
        </EditableText>
        {subheading && (
          <EditableText
            as="p"
            field="subheading"
            context={context}
            className="max-w-2xl text-xl text-pretty whitespace-pre-line sm:text-2xl"
          >
            {subheading}
          </EditableText>
        )}
        {cta && (
          <div>
            <BlockButton
              link={cta}
              tone="accent"
              surface={image ? "dark" : "primary"}
              editable={{ field: "cta.label", context }}
            />
          </div>
        )}
      </div>
    </section>
  )
}
