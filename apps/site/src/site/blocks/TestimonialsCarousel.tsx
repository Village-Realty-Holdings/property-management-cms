"use client"

import { useSyncExternalStore, type ReactNode } from "react"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel"

import { carouselOptions } from "./testimonials"

const query = "(prefers-reduced-motion: reduce)"

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {}
  const media = window.matchMedia(query)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

function snapshot() {
  return (
    typeof window.matchMedia === "function" && window.matchMedia(query).matches
  )
}

/** Whether the visitor asks for less motion. Motion is assumed until the browser says otherwise. */
function useReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}

/** Keeps a control in the row under the slides, not floating beside them. */
const control = "static inset-auto my-0"

/**
 * The Testimonials carousel: one slide per quote, three across from the
 * `lg` breakpoint, two from `sm`. Previous and Next are buttons (the arrow
 * keys work too), and it never moves by itself. The slides' contents are
 * rendered on the server and passed in.
 */
export function TestimonialsCarousel({
  label,
  slides,
}: {
  label: string
  slides: ReactNode[]
}) {
  const reducedMotion = useReducedMotion()
  return (
    <Carousel
      opts={carouselOptions(reducedMotion)}
      aria-label={label}
      className="grid gap-6"
    >
      <CarouselContent className="-ml-6">
        {slides.map((slide, i) => (
          <CarouselItem key={i} className="pl-6 sm:basis-1/2 lg:basis-1/3">
            {slide}
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="flex justify-end gap-2">
        <CarouselPrevious className={control} />
        <CarouselNext className={control} />
      </div>
    </Carousel>
  )
}
