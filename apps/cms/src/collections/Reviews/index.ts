import type { CollectionConfig } from "payload"

import {
  factsReadOnly,
  shownForReader,
  staffOfSite,
  syncOnly,
} from "../../access"
import { revalidationHooks, tagPresets } from "../../revalidation"
import { reviewAdminTitleField } from "./adminTitle"
import { applyModerationRule } from "./applyModerationRule"
import {
  recomputeRatingAfterChange,
  recomputeRatingAfterDelete,
} from "./recomputeRating"

const readOnly = { update: factsReadOnly }

// After the Rating recompute, whose Property write skips revalidation: the
// Review's tags (its Property's page and `properties`) cover it.
const revalidation = revalidationHooks(tagPresets.reviews)

/**
 * A guest's Review of a Property, mirrored from the Property Feed with any
 * manager's response (ADR-0001). Everything but Moderation is Feed-owned and
 * read-only. New Reviews get Moderation from the Site's rule
 * (./applyModerationRule.ts); every change recomputes the Property's Rating
 * (./recomputeRating.ts). One Review per (Site, Feed ID). `adminTitle`
 * (./adminTitle.ts) names it in lists, e.g. "★4 — Jane D. — Aspen Hideaway".
 *
 * Moderation: the list has quick views (All / Pending / Shown / Hidden,
 * ./ModerationFilters.tsx); select rows and use Edit to Show or Hide many.
 */
export const Reviews: CollectionConfig = {
  slug: "reviews",
  admin: {
    useAsTitle: "adminTitle",
    defaultColumns: ["adminTitle", "title", "moderation", "stayDate", "status"],
    listSearchableFields: ["adminTitle", "guestName", "title", "feedId"],
    pagination: { defaultLimit: 50 },
    components: {
      beforeListTable: [
        "/collections/Reviews/ModerationFilters#ModerationFilters",
      ],
    },
    group: "Properties",
  },
  access: {
    create: syncOnly,
    read: shownForReader,
    update: staffOfSite,
    delete: syncOnly,
    unlock: staffOfSite,
  },
  hooks: {
    beforeChange: [applyModerationRule],
    afterChange: [recomputeRatingAfterChange, ...revalidation.afterChange],
    afterDelete: [recomputeRatingAfterDelete, ...revalidation.afterDelete],
  },
  indexes: [{ fields: ["site", "feedId"], unique: true }],
  fields: [
    reviewAdminTitleField,
    {
      name: "moderation",
      label: "Moderation",
      type: "select",
      required: true,
      defaultValue: "pending",
      index: true,
      options: [
        { label: "Pending", value: "pending" },
        { label: "Shown", value: "shown" },
        { label: "Hidden", value: "hidden" },
      ],
      admin: {
        position: "sidebar",
        isClearable: false,
        description:
          "Only shown Reviews appear on the Site and count in the Rating. Pending Reviews wait for a decision.",
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Withdrawn", value: "withdrawn" },
      ],
      access: readOnly,
      admin: {
        position: "sidebar",
        description: "Follows the Property Feed. Withdrawn Reviews are hidden.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "feedId",
          label: "Feed ID",
          type: "text",
          required: true,
          index: true,
          access: readOnly,
        },
        { name: "source", type: "text", access: readOnly },
      ],
    },
    {
      name: "property",
      type: "relationship",
      relationTo: "properties",
      index: true,
      access: readOnly,
    },
    {
      type: "row",
      fields: [
        {
          name: "rating",
          type: "number",
          min: 0,
          max: 5,
          access: readOnly,
        },
        { name: "stayDate", type: "date", access: readOnly },
        {
          name: "guestName",
          type: "text",
          access: readOnly,
          admin: { description: "Display name only." },
        },
      ],
    },
    { name: "title", type: "text", access: readOnly },
    { name: "body", type: "textarea", access: readOnly },
    {
      name: "managerResponse",
      label: "Manager's response",
      type: "textarea",
      access: readOnly,
    },
  ],
}
