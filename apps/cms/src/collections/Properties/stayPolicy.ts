import type { Field } from "payload"

/**
 * The shape of a Stay Policy, shared by the Property Fact
 * (`property.stayPolicy.*`) and the Site's default
 * (`site.stayPolicyDefaults.*`). See ./effectiveStayPolicy.ts for how the two
 * combine.
 */
export type StayPolicy = {
  checkIn: string | null
  checkOut: string | null
  houseRules: string | null
  cancellationPolicy: string | null
  minimumAge: number | null
}

export const stayPolicyKeys = [
  "checkIn",
  "checkOut",
  "houseRules",
  "cancellationPolicy",
  "minimumAge",
] as const satisfies readonly (keyof StayPolicy)[]

/** Stay Policy fields. A new field must also go in `StayPolicy` and `stayPolicyKeys`. */
export function stayPolicyFields(): Field[] {
  return [
    {
      type: "row",
      fields: [
        {
          name: "checkIn",
          label: "Check-in time",
          type: "text",
          admin: { description: "e.g. 16:00" },
        },
        {
          name: "checkOut",
          label: "Check-out time",
          type: "text",
          admin: { description: "e.g. 10:00" },
        },
        {
          name: "minimumAge",
          label: "Minimum age",
          type: "number",
          min: 0,
          admin: { description: "Minimum age of the lead guest." },
        },
      ],
    },
    { name: "houseRules", label: "House rules", type: "textarea" },
    {
      name: "cancellationPolicy",
      label: "Cancellation policy",
      type: "textarea",
      admin: { description: "Cancellation and deposit terms." },
    },
  ]
}
