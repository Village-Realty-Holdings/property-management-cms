/**
 * The kinds of Submission (CONTEXT.md): an Inquiry from a prospective guest,
 * an Owner Lead from a property owner, or a general contact message. The
 * values are what `submissions.kind` and a Forwarding Destination's `kind`
 * store, so they never change; only the labels are for Staff Users.
 */
export const submissionKinds = ["inquiry", "ownerLead", "contact"] as const

export type SubmissionKind = (typeof submissionKinds)[number]

export type SubmissionKindOption = { label: string; value: SubmissionKind }

/** Labels by value, e.g. for list cells and notifications. */
export const submissionKindLabels: Record<SubmissionKind, string> = {
  inquiry: "Inquiry",
  ownerLead: "Owner Lead",
  contact: "Contact",
}

/** `options` for a `select` field of Submission kinds. */
export const submissionKindOptions: SubmissionKindOption[] =
  submissionKinds.map((value) => ({
    label: submissionKindLabels[value],
    value,
  }))

export type ForwardingKind = SubmissionKind | "all"

/**
 * `options` for a Forwarding Destination's `kind`: every kind (stored as
 * `"all"`), or one of them.
 */
export const forwardingKindOptions: { label: string; value: ForwardingKind }[] =
  [{ label: "All kinds", value: "all" }, ...submissionKindOptions]
