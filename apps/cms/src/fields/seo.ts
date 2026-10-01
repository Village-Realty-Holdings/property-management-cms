import type { GroupField } from "payload"

import { sameSite } from "./sameSite"

/** Recommended maximum lengths before search engines cut the text off. */
export const SEO_TITLE_MAX = 60
export const SEO_DESCRIPTION_MAX = 160

const characterCount = (max: number) => ({
  path: "/fields/CharacterCount#CharacterCount",
  clientProps: { max },
})

/**
 * SEO overrides for a public page: `seo.title`, `seo.description`,
 * `seo.image`. The group has no heading of its own (it usually sits in an
 * "SEO" tab, which already says so); each field's label says "SEO" instead.
 */
export function seoField(): GroupField {
  return {
    name: "seo",
    label: false,
    type: "group",
    admin: { hideGutter: true },
    fields: [
      {
        name: "title",
        label: "SEO title",
        type: "text",
        admin: {
          description:
            "Shown in search results and the browser tab. Defaults to the document title.",
          components: { afterInput: [characterCount(SEO_TITLE_MAX)] },
        },
      },
      {
        name: "description",
        label: "SEO description",
        type: "textarea",
        admin: {
          description: "The summary shown under the title in search results.",
          components: { afterInput: [characterCount(SEO_DESCRIPTION_MAX)] },
        },
      },
      {
        name: "image",
        label: "SEO image",
        type: "upload",
        relationTo: "media",
        // The multi-tenant plugin doesn't Site-filter upload fields (ADR-0010).
        filterOptions: sameSite,
        admin: {
          description: "Shown when the page is shared on social media.",
        },
      },
    ],
  }
}
