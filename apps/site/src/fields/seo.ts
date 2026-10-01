import type { GroupField } from "payload"

/** Recommended maximum lengths before search engines cut the text off. */
export const SEO_TITLE_MAX = 60
export const SEO_DESCRIPTION_MAX = 160

/** SEO overrides for a Page: `seo.title`, `seo.description`, `seo.image`. */
export function seoField(): GroupField {
  return {
    name: "seo",
    label: "SEO",
    type: "group",
    fields: [
      {
        name: "title",
        label: "SEO title",
        type: "text",
        admin: {
          description: `Shown in search results and the browser tab. Defaults to the Page title. Up to ${SEO_TITLE_MAX} characters.`,
        },
      },
      {
        name: "description",
        label: "SEO description",
        type: "textarea",
        admin: {
          description: `The summary shown under the title in search results. Up to ${SEO_DESCRIPTION_MAX} characters.`,
        },
      },
      {
        name: "image",
        label: "SEO image",
        type: "upload",
        relationTo: "media",
        admin: {
          description: "Shown when the Page is shared on social media.",
        },
      },
    ],
  }
}
