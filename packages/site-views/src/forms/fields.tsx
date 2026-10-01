import type { ComponentProps, ReactNode } from "react"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { HONEYPOT, type FieldName, type FormState } from "./validation"

/** Taller, calmer controls than the admin-sized defaults. */
const control =
  "h-11 rounded-md bg-card px-3 text-base shadow-none md:text-base dark:bg-input/20"

type FieldProps = {
  /** The form's id, so each input id is unique on a page with two forms. */
  formId: string
  name: FieldName
  label: string
  state: FormState
  /** Marks the label "(optional)"; required fields carry no marker. */
  optional?: boolean
  description?: ReactNode
  className?: string
}

/** Ids and ARIA wiring for a field: its error and description. */
function wiring(
  { formId, name, state, description }: FieldProps,
  hasError: boolean
) {
  const id = `${formId}-${name}`
  const describedBy = [
    description ? `${id}-description` : null,
    hasError ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ")
  return {
    id,
    control: {
      id,
      name,
      defaultValue: state.values[name] ?? "",
      "aria-invalid": hasError || undefined,
      "aria-describedby": describedBy || undefined,
    },
  }
}

function FieldFrame({
  props,
  id,
  error,
  children,
}: {
  props: FieldProps
  id: string
  error: string | undefined
  children: ReactNode
}) {
  return (
    <Field
      data-invalid={Boolean(error) || undefined}
      className={props.className}
    >
      <FieldLabel htmlFor={id} className="text-foreground">
        {props.label}
        {props.optional && (
          <span className="font-normal text-muted-foreground">(optional)</span>
        )}
      </FieldLabel>
      {children}
      {props.description && (
        <FieldDescription id={`${id}-description`}>
          {props.description}
        </FieldDescription>
      )}
      {/* Announced through the form's summary, not one alert per field. */}
      <FieldError id={`${id}-error`} role={undefined}>
        {error}
      </FieldError>
    </Field>
  )
}

/** A labelled text input showing its server-side error. */
export function TextField({
  inputProps,
  ...props
}: FieldProps & {
  inputProps?: Omit<ComponentProps<"input">, "name" | "id" | "defaultValue">
}) {
  const error = props.state.errors[props.name]
  const { id, control: wired } = wiring(props, Boolean(error))
  return (
    <FieldFrame props={props} id={id} error={error}>
      <Input
        {...inputProps}
        {...wired}
        // Base UI controls warn when defaultValue changes; remount instead.
        key={wired.defaultValue}
        required={!props.optional}
        className={cn(control, inputProps?.className)}
      />
    </FieldFrame>
  )
}

/** A labelled multi-line input showing its server-side error. */
export function TextAreaField({
  rows = 5,
  ...props
}: FieldProps & { rows?: number; placeholder?: string }) {
  const error = props.state.errors[props.name]
  const { id, control: wired } = wiring(props, Boolean(error))
  return (
    <FieldFrame props={props} id={id} error={error}>
      <Textarea
        {...wired}
        rows={rows}
        maxLength={5000}
        placeholder={props.placeholder}
        required={!props.optional}
        className="min-h-32 rounded-md bg-card px-3 py-2.5 text-base shadow-none md:text-base dark:bg-input/20"
      />
    </FieldFrame>
  )
}

/**
 * The honeypot: an input people never see or reach, which bots fill in. A
 * filled-in value makes the Submission look sent while nothing is stored.
 */
export function Honeypot() {
  return (
    <div
      aria-hidden
      className="absolute -left-[10000px] h-px w-px overflow-hidden"
    >
      <label>
        Leave this field empty
        <input type="text" name={HONEYPOT} tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  )
}

/** Name, email and phone: the fields every form starts with. */
export function ContactFields({
  formId,
  state,
}: {
  formId: string
  state: FormState
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField
        formId={formId}
        state={state}
        name="name"
        label="Your name"
        inputProps={{ autoComplete: "name", maxLength: 120 }}
        className="sm:col-span-2"
      />
      <TextField
        formId={formId}
        state={state}
        name="email"
        label="Email"
        inputProps={{
          type: "email",
          autoComplete: "email",
          inputMode: "email",
          maxLength: 254,
        }}
      />
      <TextField
        formId={formId}
        state={state}
        name="phone"
        label="Phone"
        optional
        inputProps={{ type: "tel", autoComplete: "tel", maxLength: 40 }}
      />
    </div>
  )
}
