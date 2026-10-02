import type { Block, Field } from "payload"

import { backgroundField } from "../fields/background"
import { validateHref } from "../fields/link"
import { LINK } from "../fields/prose"

/** A heading and a line of text for one step of the survey. */
const step = (
  name: string,
  label: string,
  defaults: { heading: string; text: string },
  more: Field[] = []
): Field => ({
  name,
  label,
  type: "group",
  fields: [
    {
      name: "heading",
      type: "text",
      required: true,
      defaultValue: defaults.heading,
    },
    { name: "text", type: "textarea", defaultValue: defaults.text },
    ...more,
  ],
})

/** The lowest rating that is asked for a public review. */
export const reviewFrom = ["4", "5"] as const

/**
 * A guest survey: a rating out of five stars, then one of two paths. A high
 * rating is asked for a public review, at a link. A lower one gets a feedback
 * form, whose answers are sent to the guest care team (see
 * src/site/guestFeedback.ts). Each step's words are the Block's.
 */
export const GuestSurvey: Block = {
  slug: "guestSurvey",
  interfaceName: "GuestSurveyBlock",
  labels: { singular: "Guest survey", plural: "Guest surveys" },
  fields: [
    {
      name: "heading",
      type: "text",
      required: true,
      defaultValue: "How was your stay?",
    },
    {
      name: "intro",
      type: "textarea",
      defaultValue:
        "This takes about ten seconds and helps us take better care of every guest.",
    },
    {
      name: "reviewFrom",
      label: "Ask for a review from",
      type: "select",
      required: true,
      defaultValue: "4",
      options: [
        { label: "4 stars", value: "4" },
        { label: "5 stars", value: "5" },
      ],
      admin: {
        description:
          "A rating this high is asked for a public review. A lower one gets the feedback form.",
      },
    },
    {
      name: "phone",
      label: "Guest care phone",
      type: "text",
      admin: {
        description:
          "Replaces {phone} in the Sent and Not sent texts, as a link guests can call.",
      },
    },
    step(
      "positive",
      "High rating",
      {
        heading: "We’re so glad you enjoyed your stay.",
        text: "Would you take a minute to share it on Google? It helps other travelers find us.",
      },
      [
        {
          name: "reviewUrl",
          label: "Review link",
          type: "text",
          validate: validateHref,
          custom: LINK,
          admin: {
            description:
              "Where a happy guest leaves a review, such as your Google review link. Without one, the button is not shown.",
          },
        },
        {
          name: "buttonLabel",
          label: "Button label",
          type: "text",
          required: true,
          defaultValue: "Leave a Google review",
        },
        {
          name: "laterLabel",
          label: "Skip label",
          type: "text",
          required: true,
          defaultValue: "Maybe later",
        },
      ]
    ),
    step("thanks", "After skipping the review", {
      heading: "Thanks for staying with us.",
      text: "We hope to welcome you back soon.",
    }),
    step(
      "negative",
      "Lower rating",
      {
        heading: "We’re sorry your stay wasn’t what you expected.",
        text: "Tell us what happened and our guest care team will follow up.",
      },
      [
        {
          name: "messageLabel",
          label: "Message label",
          type: "text",
          required: true,
          defaultValue: "How could we have improved your stay?",
        },
        {
          name: "formFields",
          label: "Optional fields",
          type: "select",
          hasMany: true,
          defaultValue: [
            "name",
            "email",
            "phone",
            "reservation",
            "property",
            "checkIn",
          ],
          options: [
            { label: "Name", value: "name" },
            { label: "Email", value: "email" },
            { label: "Phone", value: "phone" },
            { label: "Reservation number", value: "reservation" },
            { label: "Property name", value: "property" },
            { label: "Check-in date", value: "checkIn" },
          ],
          admin: {
            description:
              "The message is always asked. These are shown after it, in this order, and a guest may leave them empty.",
          },
        },
        {
          name: "consentLabel",
          label: "Consent label",
          type: "text",
          defaultValue: "It’s okay to contact me about this.",
          admin: { description: "Leave empty to show no checkbox." },
        },
        {
          name: "submitLabel",
          label: "Submit label",
          type: "text",
          required: true,
          defaultValue: "Send feedback",
        },
      ]
    ),
    step("success", "Sent", {
      heading: "Thank you. Our team has your feedback and will be in touch.",
      text: "Prefer to talk now? Call us at {phone}.",
    }),
    step("failure", "Not sent", {
      heading: "We couldn’t send your feedback.",
      text: "Something went wrong on our end. Your answers are still here. Try again, or call us at {phone}.",
    }),
    backgroundField,
  ],
}
