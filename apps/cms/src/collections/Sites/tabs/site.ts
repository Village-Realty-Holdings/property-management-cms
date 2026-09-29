import type { Tab } from "payload"

import { secretInput } from "../components/fields"
import { adminsOnly, secretAccess, superAdminsOnly } from "../fieldAccess"
import { legacyUrlsGroup } from "./legacyUrls"
import { sectionsGroup } from "./sections"

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false
  try {
    const { protocol } = new URL(value)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Who the Site is, where its deployment lives, and the previous website's
 * URLs. Unnamed tab: its own fields are top-level on the Site (`site.name`,
 * `site.slug`, …); Legacy URLs keep their `site.legacyUrls.*` group.
 */
export const siteTab: Tab = {
  label: "Site",
  description:
    "The Site's name, domain and Client, the Sections it uses, its deployment and legacy URLs.",
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
          access: adminsOnly,
        },
        {
          name: "slug",
          type: "text",
          required: true,
          unique: true,
          index: true,
          access: superAdminsOnly,
          admin: {
            description:
              "The Site's key. The Site deployment's SITE env var must match it, so only Super Admins can change it.",
          },
        },
      ],
    },
    {
      name: "domain",
      type: "text",
      unique: true,
      access: adminsOnly,
      admin: {
        description: "Public domain, e.g. www.example.com",
        placeholder: "www.example.com",
      },
    },
    {
      name: "client",
      type: "group",
      label: "Client",
      admin: {
        description:
          "The rental company Awayday runs this Site for. For a Tuck-In, the company the Former Brand (this Site) joined. Used by the {client} and {client-url} Variables.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "name",
              label: "Client name",
              type: "text",
              access: adminsOnly,
              admin: { placeholder: "Forever Vacation Rentals" },
            },
            {
              name: "website",
              label: "Client website",
              type: "text",
              access: adminsOnly,
              validate: (value: unknown) =>
                value == null ||
                value === "" ||
                isHttpUrl(value) ||
                "Enter an http(s) URL.",
              admin: { placeholder: "https://www.example.com/" },
            },
          ],
        },
      ],
    },
    sectionsGroup,
    {
      type: "collapsible",
      label: "Deployment",
      admin: {
        description:
          "Where the Site deployment runs and where its Properties come from.",
      },
      fields: [
        {
          name: "deploymentUrl",
          label: "Deployment URL",
          type: "text",
          access: adminsOnly,
          admin: {
            description:
              "Base URL of the Site deployment. The CMS sends revalidation requests here.",
            placeholder: "https://www.example.com",
          },
        },
        {
          name: "revalidationSecret",
          type: "text",
          access: secretAccess,
          admin: {
            components: secretInput,
            description:
              "Shared secret for the Site deployment's revalidation endpoint. Must match the deployment's REVALIDATION_SECRET.",
          },
        },
        {
          name: "feedAccountRef",
          label: "Property Feed account",
          type: "text",
          access: adminsOnly,
          admin: {
            description:
              "The Property Feed account this Site's Sync reads from.",
          },
        },
      ],
    },
    legacyUrlsGroup,
  ],
}
