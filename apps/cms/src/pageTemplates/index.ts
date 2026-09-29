import type { CollectionBeforeValidateHook, SelectField } from "payload"

import type { Page } from "@workspace/cms-types"

import { lockedField } from "../access"
import { tuckInLayout, tuckInSeo } from "./tuckIn"

/**
 * Page Templates (CONTEXT.md): a starting layout, a fixed set of Blocks with
 * sample copy, chosen when a Page is created. The Page remembers it in
 * `template`, and apps/site renders a Tuck-In Page with its own chrome.
 *
 * To add one (Grow, Feedback): a file like ./tuckIn.ts, an entry below, and
 * the option in `pageTemplateField`.
 */
export type PageTemplate = NonNullable<Page["template"]>

type TemplateStart = {
  layout: () => NonNullable<Page["layout"]>
  seo?: { title: string; description: string }
}

export const pageTemplates: Record<PageTemplate, TemplateStart | null> = {
  blank: null,
  tuckIn: { layout: tuckInLayout, seo: tuckInSeo },
}

/** The Page's template: chosen on create, then read-only. */
export const pageTemplateField: SelectField = {
  name: "template",
  label: "Page Template",
  type: "select",
  // Not required: Pages from before templates have none (Blank).
  defaultValue: "blank",
  options: [
    { label: "Blank", value: "blank" },
    { label: "Tuck-In", value: "tuckIn" },
  ],
  // Chosen when the Page is created; changing it later would re-skin the Page.
  access: { update: lockedField },
  admin: {
    position: "sidebar",
    isClearable: false,
    description:
      "Tuck-In announces that this Site has joined its Client: saving the new Page fills in its Blocks with copy to edit.",
  },
}

/**
 * `beforeValidate` on Pages: a new Page with a template and no Blocks gets
 * the template's Blocks, and its SEO fields where they are empty.
 */
export const applyPageTemplate: CollectionBeforeValidateHook<Page> = ({
  data,
  operation,
}) => {
  if (operation !== "create" || !data) return data
  const start = pageTemplates[data.template ?? "blank"]
  if (!start || data.layout?.length) return data
  return {
    ...data,
    layout: start.layout(),
    ...(start.seo
      ? {
          seo: {
            ...data.seo,
            title: data.seo?.title || start.seo.title,
            description: data.seo?.description || start.seo.description,
          },
        }
      : {}),
  }
}
