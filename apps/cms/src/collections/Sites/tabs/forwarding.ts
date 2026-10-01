import type { GroupField } from "payload"

import { adminsOnly, secretAccess } from "../fieldAccess"
import { secretInput } from "../components/fields"

/**
 * Forwarding Destinations: where each kind of Submission is sent after it is
 * stored (ADR-0014). Stored under `site.forwarding.destinations`; read by
 * src/forwarding. A Submission goes to every destination whose kind matches
 * it (or is `all`).
 */
export const forwardingGroup: GroupField = {
  name: "forwarding",
  type: "group",
  label: "Forwarding Destinations",
  access: adminsOnly,
  admin: {
    description:
      "Where Inquiries, Owner Leads and contact Submissions are forwarded.",
  },
  fields: [
    {
      name: "destinations",
      label: "Destinations",
      type: "array",
      labels: { singular: "Destination", plural: "Destinations" },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "kind",
              label: "Submission kind",
              type: "select",
              required: true,
              defaultValue: "all",
              options: [
                { label: "All kinds", value: "all" },
                { label: "Inquiry", value: "inquiry" },
                { label: "Owner Lead", value: "ownerLead" },
                { label: "Contact", value: "contact" },
              ],
            },
            {
              name: "type",
              type: "select",
              required: true,
              defaultValue: "webhook",
              options: [
                { label: "Webhook", value: "webhook" },
                { label: "Email", value: "email" },
              ],
            },
          ],
        },
        {
          name: "url",
          label: "Webhook URL",
          type: "text",
          admin: {
            condition: (_, siblingData) => siblingData?.type === "webhook",
            description: "Receives a JSON POST of each Submission.",
          },
          validate: (
            value: unknown,
            { siblingData }: { siblingData: unknown }
          ) =>
            (siblingData as { type?: string })?.type !== "webhook" ||
            isHttpUrl(value) ||
            "Enter an http(s) URL.",
        },
        {
          name: "secret",
          label: "Signing secret",
          type: "text",
          access: secretAccess,
          admin: {
            components: secretInput,
            condition: (_, siblingData) => siblingData?.type === "webhook",
            description:
              "When set, requests carry an X-Signature header: the hex HMAC-SHA256 of the body with this secret.",
          },
        },
        {
          name: "emailTo",
          label: "Email to",
          type: "email",
          admin: {
            condition: (_, siblingData) => siblingData?.type === "email",
          },
          validate: (
            value: unknown,
            { siblingData }: { siblingData: unknown }
          ) =>
            (siblingData as { type?: string })?.type !== "email" ||
            (typeof value === "string" && value.includes("@")) ||
            "Enter an email address.",
        },
      ],
    },
  ],
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false
  try {
    const { protocol } = new URL(value)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}
