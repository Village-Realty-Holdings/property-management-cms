"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { useFormActions, type InquiryProperty } from "./actions"

import { ContactForm } from "./ContactForm"
import { InquiryForm } from "./InquiryForm"
import { isPropertySlug } from "./validation"

export type QueryAwareFormProps = {
  /** "contact" becomes an inquiry when the page names a Property. */
  kind: "inquiry" | "contact"
  submitLabel?: string
  successMessage?: string
}

/**
 * An inquiry (or contact) form that reads `?property=<slug>`: it sends the
 * slug with the inquiry and shows which Property it is about once looked up.
 * A contact form opened from a Property ("/contact?property=…") becomes an
 * inquiry form. Render inside <Suspense> (it reads the search params).
 */
export function QueryAwareForm({ kind, ...labels }: QueryAwareFormProps) {
  const { findInquiryProperty } = useFormActions()
  const raw = useSearchParams().get("property")
  const slug = isPropertySlug(raw) ? raw : null
  const [found, setFound] = useState<{
    slug: string
    property: InquiryProperty | null
  } | null>(null)

  useEffect(() => {
    if (!slug) return
    let current = true
    findInquiryProperty(slug).then(
      (property) => {
        if (current) setFound({ slug, property })
      },
      // Without the details the form still works; the server resolves the slug.
      () => {}
    )
    return () => {
      current = false
    }
  }, [slug, findInquiryProperty])

  if (kind === "contact" && !slug) return <ContactForm {...labels} />
  return (
    <InquiryForm
      {...labels}
      propertySlug={slug}
      property={found && found.slug === slug ? found.property : null}
    />
  )
}
