import type { GroupField } from "payload"

import { adminsOnly } from "../fieldAccess"

/**
 * The Site's Review Moderation rule, applied automatically to new Reviews
 * (collections/Reviews/applyModerationRule.ts). Stored under
 * `site.moderation.*`. Editors can still show or hide any Review afterwards.
 */
export const moderationGroup: GroupField = {
  name: "moderation",
  type: "group",
  label: "Review Moderation",
  access: adminsOnly,
  admin: {
    description:
      "The rule that decides whether new Reviews are shown or hidden.",
  },
  fields: [
    {
      name: "autoShowMinRating",
      label: "Automatically show Reviews rated at least",
      type: "number",
      min: 0,
      max: 5,
      admin: {
        step: 0.5,
        description:
          "New Reviews with this rating or higher are shown right away. Leave empty to hold every new Review as Pending.",
      },
    },
  ],
}
