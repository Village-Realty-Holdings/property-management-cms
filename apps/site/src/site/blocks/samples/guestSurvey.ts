import type { BlockOf } from "../types"

/** A Guest feedback survey with every field filled. */
export const guestSurveySample: BlockOf<"guestSurvey"> = {
  blockType: "guestSurvey",
  heading: "How was your stay with Seaglass?",
  intro:
    "This takes about ten seconds and helps us take better care of every guest.",
  reviewFrom: "4",
  phone: "+1 555 010 0100",
  positive: {
    heading: "We’re so glad you enjoyed your stay.",
    text: "Would you take a minute to share it on Google? It helps other travelers find us.",
    reviewUrl: "https://example.com/review",
    buttonLabel: "Leave a Google review",
    laterLabel: "Maybe later",
  },
  thanks: {
    heading: "Thanks for staying with us.",
    text: "We hope to welcome you back soon.",
  },
  negative: {
    heading: "We’re sorry your stay wasn’t what you expected.",
    text: "Tell us what happened and our guest care team will follow up.",
    messageLabel: "How could we have improved your stay?",
    formFields: [
      "name",
      "email",
      "phone",
      "reservation",
      "property",
      "checkIn",
    ],
    consentLabel: "It’s okay to contact me about this.",
    submitLabel: "Send feedback",
  },
  success: {
    heading: "Thank you. Our team has your feedback and will be in touch.",
    text: "Prefer to talk now? Call us at {phone}.",
  },
  failure: {
    heading: "We couldn’t send your feedback.",
    text: "Something went wrong on our end. Your answers are still here. Try again, or call us at {phone}.",
  },
  background: "default",
}
