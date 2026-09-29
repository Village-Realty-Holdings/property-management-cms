"use server"

import { headers } from "next/headers"

import {
  getProperty,
  submit as storeSubmission,
  SubmissionError,
  type SubmissionInput,
} from "@workspace/content"

import {
  fieldForCmsPath,
  HONEYPOT,
  isPropertySlug,
  isSubmissionKind,
  readFields,
  validateSubmission,
  type FieldErrors,
  type FormState,
} from "@workspace/site-views/forms/validation"
import type { InquiryProperty } from "@workspace/site-views/forms/actions"

/**
 * Server Actions for the Site's forms (ADR-0014). Anyone can POST to them, so
 * every input is checked here; the CMS checks again when it stores the
 * Submission.
 */

const sent: FormState = { status: "sent", errors: {}, values: {} }

const todayUtc = () => new Date().toISOString().slice(0, 10)

/** The page the form was sent from (the browser's Referer), when http(s). */
async function sourceUrl(): Promise<string | undefined> {
  const referer = (await headers()).get("referer")
  if (!referer || referer.length > 2048) return undefined
  try {
    const url = new URL(referer)
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined
  } catch {
    return undefined
  }
}

/**
 * Stores a form entry as a Submission of `kind` (bound by the form). Returns
 * field errors for the form to show, or `sent`. A filled-in honeypot gets the
 * same `sent` as a person, and nothing is stored.
 */
export async function submit(
  kind: unknown,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  if (!isSubmissionKind(kind)) {
    return {
      status: "failed",
      errors: {},
      values: {},
      message: "This form can't be sent. Reload the page and try again.",
    }
  }

  const values = readFields(kind, (name) => formData.get(name))
  const honeypot = formData.get(HONEYPOT)
  if (typeof honeypot === "string" && honeypot !== "") return sent

  const invalid = (errors: FieldErrors, message?: string): FormState => ({
    status: "invalid",
    errors,
    values,
    message: message ?? "Check the highlighted fields and send again.",
  })

  // The Property comes from the CMS by slug, never an ID from the client.
  const property =
    kind === "inquiry" && isPropertySlug(values.property)
      ? await getProperty(values.property)
      : null

  const result = validateSubmission(kind, values, todayUtc(), property)
  if (!result.ok) return invalid(result.errors)
  const input: SubmissionInput = {
    ...result.submission,
    sourceUrl: await sourceUrl(),
    website: "",
  }
  if (property) {
    input.propertyId = property.id
    input.payload = { ...input.payload, propertyName: property.name }
  }

  try {
    await storeSubmission(input)
    return sent
  } catch (error) {
    if (error instanceof SubmissionError) {
      // The CMS rejected the honeypot: answer as if it were stored.
      if (error.errors.some((e) => e.path === HONEYPOT)) return sent
      const errors: FieldErrors = {}
      for (const { path, message } of error.errors) {
        const field = fieldForCmsPath(kind, path)
        if (field) errors[field] ??= message
      }
      if (Object.keys(errors).length > 0) return invalid(errors)
    }
    console.error("Storing a Submission failed", error)
    return {
      status: "failed",
      errors: {},
      values,
      message:
        "We couldn't send your message just now. Try again in a minute, or call or email us instead.",
    }
  }
}

/**
 * The public details of the Property named by `?property=<slug>`, for the
 * inquiry form to show; null when unknown or Withdrawn.
 */
export async function findInquiryProperty(
  slug: unknown
): Promise<InquiryProperty | null> {
  if (!isPropertySlug(slug)) return null
  const property = await getProperty(slug)
  if (!property) return null
  return {
    slug: property.slug,
    name: property.name,
    location: property.location?.name ?? null,
    sleeps: property.sleeps,
    image: property.image
      ? {
          url: property.image.url,
          alt: property.image.alt,
          width: property.image.width,
          height: property.image.height,
        }
      : null,
  }
}
