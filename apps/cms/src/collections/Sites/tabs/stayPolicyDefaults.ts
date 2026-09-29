import type { GroupField } from "payload"

import { stayPolicyFields } from "../../Properties/stayPolicy"
import { adminsOnly } from "../fieldAccess"

/**
 * The Site's default Stay Policy (`site.stayPolicyDefaults.*`), the same shape
 * as a Property's `stayPolicy`. Each field fills in where the Property Feed
 * has no value; see Properties/effectiveStayPolicy.ts.
 */
export const stayPolicyDefaultsGroup: GroupField = {
  name: "stayPolicyDefaults",
  type: "group",
  label: "Default Stay Policy",
  access: adminsOnly,
  admin: {
    description:
      "Check-in and check-out times, house rules, minimum age, and cancellation and deposit terms used where the Property Feed has none.",
  },
  fields: stayPolicyFields(),
}
