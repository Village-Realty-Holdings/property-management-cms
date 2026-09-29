import type { CollectionBeforeDeleteHook, CollectionConfig } from "payload"

import { isSuperAdmin, sitesRead, sitesUpdate } from "../../access"
import { revalidationHooks, tagPresets } from "../../revalidation"
import { wrapTabs } from "./components/fields"
import { siteEndpoints } from "./endpoints"
import { amenityPresentationGroup } from "./tabs/amenityPresentation"
import { brandingTab } from "./tabs/branding"
import { forwardingGroup } from "./tabs/forwarding"
import { siteTab } from "./tabs/site"
import { moderationGroup } from "./tabs/moderation"
import { propertyTypeLabelsGroup } from "./tabs/propertyTypeLabels"
import { stayPolicyDefaultsGroup } from "./tabs/stayPolicyDefaults"
import { customVariablesField } from "./tabs/variables"
import { isSectionOn, whenSectionOn } from "../../sections"

/** A Site's SiteReaders can't outlive it (their `site` is required). */
const deleteSiteReaders: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: "site-readers",
    where: { site: { equals: id } },
    req,
  })
}

/**
 * The tenant collection of the multi-tenant plugin (ADR-0010). Site Settings
 * live here, not in globals, because globals can't be scoped to a Site.
 *
 * Five tabs. Each settings area is its own file under ./tabs, as a named
 * group (or, for Branding, a named tab). Names are storage paths
 * (`site.amenityPresentation.*`, columns `amenity_presentation_*`) read by
 * apps/site through @workspace/content: move an area between tabs freely,
 * but never rename it or nest it under another name. Unnamed tabs and
 * collapsibles are layout only.
 *
 * Field access (./fieldAccess.ts): Editors and SiteReaders read everything
 * except secrets; only Admins write; only Super Admins change the slug.
 */
export const Sites: CollectionConfig = {
  slug: "sites",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "domain"],
    group: "Settings",
  },
  access: {
    create: isSuperAdmin,
    read: sitesRead,
    update: sitesUpdate,
    delete: isSuperAdmin,
    unlock: sitesUpdate,
  },
  hooks: {
    beforeDelete: [deleteSiteReaders],
    ...revalidationHooks(tagPresets.sites),
  },
  endpoints: siteEndpoints,
  fields: [
    {
      type: "tabs",
      tabs: [
        siteTab,
        brandingTab,
        {
          label: "Properties",
          description:
            "How this Site presents Properties: search filters, Property Type names and the default Stay Policy.",
          admin: { condition: whenSectionOn("properties") },
          fields: [
            amenityPresentationGroup,
            propertyTypeLabelsGroup,
            stayPolicyDefaultsGroup,
          ],
        },
        {
          label: "Reviews & Submissions",
          description:
            "How new Reviews are moderated, and where Submissions are forwarded.",
          // Each group belongs to a Section: hidden when it's off.
          admin: {
            condition: (data) =>
              isSectionOn(data?.sections, "properties") ||
              isSectionOn(data?.sections, "inbox"),
          },
          fields: [
            {
              ...moderationGroup,
              admin: {
                ...moderationGroup.admin,
                condition: whenSectionOn("properties"),
              },
            },
            {
              ...forwardingGroup,
              admin: {
                ...forwardingGroup.admin,
                condition: whenSectionOn("inbox"),
              },
            },
          ],
        },
        {
          label: "Variables",
          description:
            "Values Editors can write into Pages and Guides as {key}, next to the built-in Variables from these Settings.",
          fields: [customVariablesField],
        },
      ],
    },
    // Layout only (no data): lets the tab bar wrap at phone widths.
    { name: "wrapTabs", type: "ui", admin: { components: wrapTabs } },
  ],
}
