"use client"

import { ContactFields, TextAreaField, TextField } from "./fields"
import { SubmissionForm } from "./SubmissionForm"

export type OwnerLeadFormProps = {
  submitLabel?: string
  successMessage?: string
  className?: string
}

/**
 * An owner asking about renting out their home: stored as an `ownerLead`
 * Submission, with the home's address and bedrooms in its `payload`.
 */
export function OwnerLeadForm({
  submitLabel = "Send details",
  successMessage = "Thanks for telling us about your home. Our owner team will be in touch soon.",
  className,
}: OwnerLeadFormProps) {
  return (
    <SubmissionForm
      kind="ownerLead"
      submitLabel={submitLabel}
      successMessage={successMessage}
      className={className}
    >
      {(formId, state) => (
        <>
          <ContactFields formId={formId} state={state} />
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_9rem]">
            <TextField
              formId={formId}
              state={state}
              name="propertyLocation"
              label="Property address or area"
              inputProps={{ autoComplete: "street-address", maxLength: 300 }}
            />
            <TextField
              formId={formId}
              state={state}
              name="bedrooms"
              label="Bedrooms"
              optional
              inputProps={{
                type: "number",
                inputMode: "numeric",
                min: 0,
                max: 50,
                step: 1,
              }}
            />
          </div>
          <TextAreaField
            formId={formId}
            state={state}
            name="message"
            label="Anything else we should know?"
            optional
            rows={4}
          />
        </>
      )}
    </SubmissionForm>
  )
}
