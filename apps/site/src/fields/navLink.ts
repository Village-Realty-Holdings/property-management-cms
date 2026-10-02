import type { Field, GroupField } from "payload"

import { validateHref } from "./link"
import { NOT_PROSE } from "./prose"

type Condition = NonNullable<GroupField["admin"]>["condition"]

/**
 * A menu link: to a Page (a relationship, so it follows the Page if its path
 * changes) or to a URL. `type` picks which. Like `linkGroup`, a link with no
 * target is allowed and the Site renders nothing for it.
 */
export function navLink(
  name = "link",
  options: { condition?: Condition } = {}
): GroupField {
  return {
    name,
    type: "group",
    ...(options.condition ? { admin: { condition: options.condition } } : {}),
    fields: [
      {
        name: "type",
        type: "radio",
        defaultValue: "page",
        options: [
          { label: "A Page", value: "page" },
          { label: "A URL", value: "url" },
        ],
        admin: { layout: "horizontal" },
      },
      {
        name: "page",
        type: "relationship",
        relationTo: "pages",
        admin: { condition: (_, sibling) => sibling?.type !== "url" },
      },
      {
        name: "url",
        label: "URL",
        type: "text",
        validate: validateHref,
        custom: NOT_PROSE,
        admin: {
          condition: (_, sibling) => sibling?.type === "url",
          description: 'A Site path like "/about", or a full URL.',
        },
      },
    ],
  }
}

/** A label and a link: the fields of a plain list of links. */
export function navLinkFields(): Field[] {
  return [{ name: "label", type: "text", required: true }, navLink("link")]
}
