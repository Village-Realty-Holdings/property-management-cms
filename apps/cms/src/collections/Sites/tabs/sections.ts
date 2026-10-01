import type { CheckboxField, GroupField } from "payload"

import { sectionLabels, sectionNames, type Section } from "../../../sections"
import { adminsOnly } from "../fieldAccess"

const descriptions: Record<Section, string> = {
  properties: "Properties, Locations, Specials and Reviews.",
  inbox: "Submissions from the Site's forms.",
  guides: "Editorial articles.",
  curatedLists: "Themed sets of Properties.",
}

/**
 * Which Sections the Site uses (src/sections). Stored under
 * `site.sections.*`, one checkbox each, on by default. A Tuck-In Site has
 * them all off. Admins edit them; Editors read them.
 */
export const sectionsGroup: GroupField = {
  name: "sections",
  type: "group",
  label: "Sections",
  admin: {
    description:
      "The parts of the CMS this Site uses. Pages, Media and Site Settings are always on. Turning a Section off hides it in the admin; nothing is deleted.",
  },
  fields: [
    {
      type: "row",
      fields: sectionNames.map(
        (name): CheckboxField => ({
          name,
          label: sectionLabels[name],
          type: "checkbox",
          defaultValue: true,
          access: adminsOnly,
          admin: { description: descriptions[name] },
        })
      ),
    },
  ],
}
