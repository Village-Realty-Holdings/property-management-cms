import type { BlockOf } from "../types"

/** Steps with four steps, every field filled. */
export const stepsSample: BlockOf<"steps"> = {
  blockType: "steps",
  heading: "How it works, in four steps",
  intro: "From first call to first guest, we take care of the work.",
  steps: [
    {
      title: "Tell us about your home",
      text: "Share a few details and we will arrange a visit.",
    },
    {
      title: "We set everything up",
      text: "Photos, a listing and pricing, all done for you.",
    },
    {
      title: "Welcome your guests",
      text: "We handle bookings, check-in and cleaning.",
    },
    {
      title: "Get paid every month",
      text: "A clear statement and the money in your account.",
    },
  ],
  background: "default",
}
