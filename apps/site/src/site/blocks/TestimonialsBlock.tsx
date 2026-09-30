import { Star } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import type { TestimonialsBlock as TestimonialsBlockData } from "../../payload-types"
import { displayFont } from "../display"
import { BlockSection } from "./BlockSection"
import { EditableText } from "./Editable"
import { maxStars, starsOf } from "./testimonials"
import { TestimonialsCarousel } from "./TestimonialsCarousel"
import type { BlockContext } from "./types"

type Testimonial = NonNullable<TestimonialsBlockData["testimonials"]>[number]

/** A rating as stars, with its text equivalent ("Rated 5 out of 5") for assistive technology. */
function StarRating({ rating }: { rating: number | null | undefined }) {
  const filled = starsOf(rating)
  return (
    <p className="flex items-center gap-0.5 text-primary">
      {Array.from({ length: maxStars }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn("size-5", i < filled ? "fill-current" : "opacity-40")}
        />
      ))}
      <span className="sr-only">
        Rated {filled} out of {maxStars}
      </span>
    </p>
  )
}

/** One guest's quote: stars, the quote, then the name and role line. */
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="flex h-full flex-col gap-4 rounded-(--card-radius) border bg-card p-6 text-card-foreground shadow-(--card-shadow)">
      <StarRating rating={testimonial.rating} />
      <blockquote className="flex-1 text-lg text-pretty">
        {testimonial.quote}
      </blockquote>
      <figcaption>
        <span className="block font-semibold">{testimonial.name}</span>
        <span className="block text-sm text-muted-foreground">
          {testimonial.role}
        </span>
      </figcaption>
    </figure>
  )
}

/**
 * Testimonials: guest quotes with a name, a role line and a star rating, in
 * a carousel or a grid. Nothing when it has no heading or no quotes.
 */
export function TestimonialsBlock({
  block,
  context,
}: {
  block: TestimonialsBlockData
  context: BlockContext
}) {
  const heading = block.heading?.trim()
  const testimonials = block.testimonials ?? []
  if (!heading || testimonials.length === 0) return null
  const id = `block-${context.index}-heading`
  const cards = testimonials.map((testimonial, i) => (
    <TestimonialCard key={testimonial.id ?? i} testimonial={testimonial} />
  ))
  return (
    <BlockSection
      background={block.background}
      labelledBy={id}
      className="grid gap-10"
    >
      <EditableText
        as="h2"
        field="heading"
        context={context}
        id={id}
        className={cn(displayFont, "text-3xl text-balance sm:text-4xl")}
      >
        {heading}
      </EditableText>
      {block.variant === "grid" ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <li key={i}>{card}</li>
          ))}
        </ul>
      ) : (
        <TestimonialsCarousel label="Guest testimonials" slides={cards} />
      )}
    </BlockSection>
  )
}
