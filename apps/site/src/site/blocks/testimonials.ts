/** A star rating is out of this many stars. */
export const maxStars = 5

/**
 * How many of the `maxStars` stars to fill: a rating rounded to a whole
 * number and held between none and all of them. A missing or non-numeric
 * rating is no stars.
 */
export function starsOf(rating: number | null | undefined): number {
  if (typeof rating !== "number" || Number.isNaN(rating)) return 0
  return Math.min(maxStars, Math.max(0, Math.round(rating)))
}

/**
 * The Testimonials carousel's options: a slide starts at the left edge, and
 * Next and Previous glide briefly, or jump at once under reduced motion.
 */
export function carouselOptions(reducedMotion: boolean) {
  return { align: "start", duration: reducedMotion ? 0 : 12 } as const
}
