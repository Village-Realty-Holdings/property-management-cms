import { Suspense } from "react"

import type { Block } from "@workspace/content/queries"
import { cn } from "@workspace/ui/lib/utils"

import { SectionHeading } from "../site/section-heading"

import { ContactForm } from "./ContactForm"
import { InquiryForm } from "./InquiryForm"
import { OwnerLeadForm } from "./OwnerLeadForm"
import { QueryAwareForm } from "./QueryAwareForm"
import { isSubmissionKind, type SubmissionKind } from "./validation"

/** The CMS `form` Block (apps/cms src/blocks/form.ts), as stored. */
export type FormBlockData = {
  blockType: "form"
  id?: string | null
  heading?: string | null
  intro?: string | null
  kind: SubmissionKind
  submitLabel?: string | null
  successMessage?: string | null
}

const defaultHeadings: Record<SubmissionKind, string> = {
  inquiry: "Ask about a stay",
  ownerLead: "Tell us about your home",
  contact: "Send us a message",
}

const text = (value: unknown) =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined

/**
 * A `form` Block: the heading and intro beside the form for its `kind`.
 * Inquiry forms, and contact forms opened with `?property=<slug>`, name that
 * Property (read on the client, so the page itself stays static).
 */
export function FormBlock({
  block,
  className,
}: {
  block: FormBlockData | Block
  className?: string
}) {
  const kind: SubmissionKind = isSubmissionKind(block.kind)
    ? block.kind
    : "contact"
  const heading = text(block.heading) ?? defaultHeadings[kind]
  const intro = text(block.intro)
  const labels = {
    submitLabel: text(block.submitLabel),
    successMessage: text(block.successMessage),
  }
  const headingId = `form-${text(block.id) ?? kind}-heading`

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:px-8",
        className
      )}
    >
      <SectionHeading
        id={headingId}
        title={heading}
        description={intro}
        className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start"
      />
      <div className="min-w-0 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-8 lg:col-span-7">
        {kind === "ownerLead" ? (
          <OwnerLeadForm {...labels} />
        ) : (
          <Suspense
            fallback={
              kind === "inquiry" ? (
                <InquiryForm {...labels} />
              ) : (
                <ContactForm {...labels} />
              )
            }
          >
            <QueryAwareForm kind={kind} {...labels} />
          </Suspense>
        )}
      </div>
    </section>
  )
}
