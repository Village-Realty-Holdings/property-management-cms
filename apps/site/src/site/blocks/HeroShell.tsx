import type { ReactNode } from "react"
import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import type { Image as BrandImage } from "../brand"
import { displayFont } from "../display"
import { splitAccent } from "./accentWord"
import { EditableText } from "./Editable"
import { container, type BlockContext } from "./types"

/**
 * The Hero's heading text: with the accent word (when it is in the heading)
 * as a span in the Theme's accent colour. The accent is drawn as a fill with
 * its own derived text colour, which the Theme keeps at AA on any accent;
 * accent-coloured text would sit on the primary colour or the dark surface
 * at whatever contrast the two happen to have. `textContent` stays the
 * heading, so the Visual Editor still reads the field.
 */
function AccentHeading({
  heading,
  accentWord,
}: {
  heading: string
  accentWord: string | null | undefined
}) {
  const parts = splitAccent(heading, accentWord)
  if (!parts) return heading
  const [before, word, after] = parts
  return (
    <>
      {before}
      <span className="rounded-(--card-radius) bg-accent box-decoration-clone px-[0.14em] text-accent-foreground">
        {word}
      </span>
      {after}
    </>
  )
}

/**
 * What a Hero and a Search Hero share: the section, its image (a full-bleed
 * photo under a shade on the dark surface) or the primary colour with an
 * accent glow, and the eyebrow, heading and subheading. `children` is what
 * sits under the text (a button, a search); `foot` is fused to the section's
 * foot, full width (a trust strip).
 */
export function HeroShell({
  eyebrow,
  heading,
  accentWord,
  subheading,
  image,
  context,
  children,
  foot,
}: {
  eyebrow?: string | null
  heading: string
  accentWord?: string | null
  subheading?: string | null
  image: BrandImage | null
  context: BlockContext
  children?: ReactNode
  foot?: ReactNode
}) {
  const first = context.index === 0
  const Heading = first ? "h1" : "h2"
  const id = `block-${context.index}-heading`
  const eyebrowText = eyebrow?.trim()
  const subheadingText = subheading?.trim()

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
        <div className="flex flex-col gap-4">
          {eyebrowText && (
            <EditableText
              as="p"
              field="eyebrow"
              context={context}
              className="text-sm font-semibold tracking-[0.18em] uppercase"
            >
              {eyebrowText}
            </EditableText>
          )}
          <EditableText
            as={Heading}
            field="heading"
            context={context}
            id={id}
            className={cn(
              displayFont,
              first
                ? "text-5xl sm:text-7xl lg:text-8xl"
                : "text-4xl sm:text-6xl",
              // After the sizes: tailwind-merge drops a leading-* that precedes a text-* size.
              "max-w-5xl leading-[0.95] text-balance"
            )}
          >
            <AccentHeading heading={heading} accentWord={accentWord} />
          </EditableText>
        </div>
        {subheadingText && (
          <EditableText
            as="p"
            field="subheading"
            context={context}
            className="max-w-2xl text-xl text-pretty whitespace-pre-line sm:text-2xl"
          >
            {subheadingText}
          </EditableText>
        )}
        {children}
      </div>
      {foot && (
        <div
          className={
            image
              ? "border-t border-surface-dark-foreground/20 bg-surface-dark text-surface-dark-foreground"
              : "border-t border-primary-foreground/20"
          }
        >
          {foot}
        </div>
      )}
    </section>
  )
}
