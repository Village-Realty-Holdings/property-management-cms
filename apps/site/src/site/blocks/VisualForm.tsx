"use client"

import { useRef, useState, type FormEvent } from "react"
import { CircleCheck } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { EditableText } from "./Editable"
import {
  validateForm,
  type FormErrors,
  type FormFieldName,
  type FormValues,
} from "./formValidation"
import { type BlockContext, blockId, type BlockPlace } from "./types"

/** One input: its name in the form, its label, and how the browser fills it. */
type Control = {
  key: keyof FormValues
  label: string
  kind: "text" | "email" | "tel" | "date" | "textarea"
  autoComplete: string
  required?: boolean
  /** Spans the whole row rather than half of it. */
  wide?: boolean
}

/**
 * The inputs behind each field a Form can show. Autocomplete names follow
 * the HTML autofill tokens for what the visitor types about themselves; the
 * property address, the dates and the message are not that, so they opt out.
 */
const controls: Record<FormFieldName, Control[]> = {
  name: [
    {
      key: "name",
      label: "Your name",
      kind: "text",
      autoComplete: "name",
      required: true,
    },
  ],
  email: [
    {
      key: "email",
      label: "Email",
      kind: "email",
      autoComplete: "email",
      required: true,
    },
  ],
  phone: [{ key: "phone", label: "Phone", kind: "tel", autoComplete: "tel" }],
  message: [
    {
      key: "message",
      label: "Message",
      kind: "textarea",
      autoComplete: "off",
      required: true,
      wide: true,
    },
  ],
  propertyAddress: [
    {
      key: "propertyAddress",
      label: "Property address",
      kind: "text",
      autoComplete: "off",
      wide: true,
    },
  ],
  dates: [
    {
      key: "checkIn",
      label: "Check-in date",
      kind: "date",
      autoComplete: "off",
    },
    {
      key: "checkOut",
      label: "Check-out date",
      kind: "date",
      autoComplete: "off",
    },
  ],
}

const DEFAULT_FIELDS: FormFieldName[] = ["name", "email", "message"]

/** What the form holds now, by input name. */
function valuesOf(form: HTMLFormElement): FormValues {
  const data = new FormData(form)
  const values: Record<string, string> = {}
  for (const [key, value] of data.entries()) {
    if (typeof value === "string") values[key] = value
  }
  return values
}

/**
 * The Form Block's form, the only part of it that needs the browser. It is
 * visual-only: it checks the fields as a visitor fills them, and once they
 * are right it shows the success message and nothing else. No request is
 * made and nothing is stored. Field ids come from the Block's position, not
 * `useId`, so the Visual Editor's canvas and the Site draw the same markup.
 */
export function VisualForm({
  fields,
  submitLabel,
  successMessage,
  context,
}: {
  fields: readonly FormFieldName[]
  submitLabel: string
  successMessage: string
  context: BlockPlace & Pick<BlockContext, "editing">
}) {
  const shown = fields.length > 0 ? [...new Set(fields)] : DEFAULT_FIELDS
  const inputs = shown.flatMap((field) => controls[field] ?? [])
  const id = (key: string) => blockId(context, `form-${key}`)

  const [errors, setErrors] = useState<FormErrors>({})
  const [attempted, setAttempted] = useState(false)
  const [sent, setSent] = useState(false)
  const status = useRef<HTMLDivElement>(null)

  function check(form: HTMLFormElement) {
    const found = validateForm(shown, valuesOf(form))
    setErrors(found)
    return found
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setAttempted(true)
    const found = check(form)
    const first = inputs.find(({ key }) => found[key])
    if (first) {
      form.querySelector<HTMLElement>(`[id="${id(first.key)}"]`)?.focus()
      return
    }
    setSent(true)
    // The form is gone: move to the message, so focus is not lost.
    queueMicrotask(() => status.current?.focus())
  }

  return (
    <div className="max-w-3xl rounded-(--card-radius) bg-card p-4 text-card-foreground shadow-(--card-shadow) sm:p-6">
      {!sent && (
        <form
          noValidate
          onSubmit={submit}
          onChange={(event) => {
            if (attempted) check(event.currentTarget)
          }}
          className="grid gap-5 sm:grid-cols-2"
        >
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Fields marked with * are required.
          </p>
          {inputs.map((control) => {
            const error = errors[control.key]
            const common = {
              id: id(control.key),
              name: control.key,
              autoComplete: control.autoComplete,
              "aria-required": control.required || undefined,
              "aria-invalid": error ? true : undefined,
              "aria-describedby": error
                ? `${id(control.key)}-error`
                : undefined,
            }
            return (
              <div
                key={control.key}
                className={cn(
                  "flex flex-col gap-2",
                  control.wide && "sm:col-span-2"
                )}
              >
                <label
                  htmlFor={id(control.key)}
                  className="text-sm font-medium"
                >
                  {control.label}
                  {control.required && <span aria-hidden> *</span>}
                </label>
                {control.kind === "textarea" ? (
                  <Textarea {...common} rows={4} />
                ) : (
                  <Input {...common} type={control.kind} />
                )}
                {error && (
                  <p
                    id={`${id(control.key)}-error`}
                    className="text-sm text-destructive-text"
                  >
                    {error}
                  </p>
                )}
              </div>
            )
          })}
          <div className="sm:col-span-2">
            <Button type="submit" variant="accent" size="lg">
              <EditableText field="submitLabel" context={context}>
                {submitLabel}
              </EditableText>
            </Button>
          </div>
        </form>
      )}
      <div
        ref={status}
        role="status"
        aria-live="polite"
        tabIndex={-1}
        className="flex items-start gap-3 text-lg outline-none empty:hidden"
      >
        {sent && (
          <>
            <CircleCheck aria-hidden className="mt-0.5 size-6 shrink-0" />
            {successMessage}
          </>
        )}
      </div>
    </div>
  )
}
