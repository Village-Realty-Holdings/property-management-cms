"use client"

import { ContactFields, TextAreaField } from "./fields"
import { SubmissionForm } from "./SubmissionForm"

export type ContactFormProps = {
  submitLabel?: string
  successMessage?: string
  className?: string
}

/** A general message to the Site's team: stored as a `contact` Submission. */
export function ContactForm({
  submitLabel = "Send message",
  successMessage = "Thanks for getting in touch. We'll reply by email as soon as we can.",
  className,
}: ContactFormProps) {
  return (
    <SubmissionForm
      kind="contact"
      submitLabel={submitLabel}
      successMessage={successMessage}
      className={className}
    >
      {(formId, state) => (
        <>
          <ContactFields formId={formId} state={state} />
          <TextAreaField
            formId={formId}
            state={state}
            name="message"
            label="Message"
          />
        </>
      )}
    </SubmissionForm>
  )
}
