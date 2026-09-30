import type { BlockOf } from "../types"

/** Testimonials with four quotes, every field filled. */
export const testimonialsSample: BlockOf<"testimonials"> = {
  blockType: "testimonials",
  heading: "What our guests say about their stays",
  variant: "carousel",
  testimonials: [
    {
      quote:
        "A spotless home, a warm welcome and a view we still talk about months later.",
      name: "Alex Morgan",
      role: "Stayed for a week in June",
      rating: 5,
    },
    {
      quote:
        "Easy to book, and the team answered every question within the hour.",
      name: "Sam Rivera",
      role: "Family trip with three kids",
      rating: 5,
    },
    {
      quote:
        "Plenty of room for all twelve of us, and the kitchen was a dream.",
      name: "Jordan Lee",
      role: "Group reunion",
      rating: 4,
    },
    {
      quote: "Quiet, clean and close to the beach. We will be back next year.",
      name: "Casey Kim",
      role: "Long weekend for two",
      rating: 5,
    },
  ],
  background: "default",
}
