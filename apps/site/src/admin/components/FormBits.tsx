"use client"

import type { ReactNode } from "react"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"

/** A labelled form control with its description and error. */
export function FormField({
  id,
  label,
  description,
  error,
  children,
}: {
  id: string
  label: string
  description?: string
  error?: string
  children: ReactNode
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {description && (
        <FieldDescription id={`${id}-description`}>
          {description}
        </FieldDescription>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}

/**
 * The attributes that tie a control to its FormField's description and
 * error, so screen readers announce them with the control:
 *
 *   <FormField id="name" label="Name" error={e} description={d}>
 *     <Input id="name" {...describedBy("name", { description: d, error: e })} />
 *   </FormField>
 */
export function describedBy(
  id: string,
  {
    description,
    error,
    also = [],
  }: {
    /** Whether the FormField shows a description (its text is not needed). */
    description?: string | boolean
    error?: string
    /** Ids of other elements that describe the control (a live hint). */
    also?: string[]
  }
) {
  const ids = [
    description && `${id}-description`,
    ...also,
    error && `${id}-error`,
  ]
    .filter(Boolean)
    .join(" ")
  return {
    "aria-describedby": ids || undefined,
    "aria-invalid": error ? (true as const) : undefined,
  }
}

/** A titled group of fields. */
export function Section({
  title,
  description,
  children,
  actions,
}: {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}
