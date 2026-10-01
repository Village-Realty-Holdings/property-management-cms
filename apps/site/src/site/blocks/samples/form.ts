import type { BlockOf } from "../types"

/** A Form with every field it offers, every option filled. */
export const formSample: BlockOf<"form"> = {
  blockType: "form",
  heading: "Tell us about your home",
  intro: "Share a few details and our team will get back to you.",
  formFields: ["name", "email", "phone", "message", "propertyAddress", "dates"],
  submitLabel: "Send",
  successMessage:
    "Thank you. We have received your message and will be in touch soon.",
  background: "default",
}
