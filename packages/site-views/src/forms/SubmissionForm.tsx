"use client"

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  CircleAlertIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "../site/display"

import { useFormActions } from "./actions"
import { Honeypot } from "./fields"
import {
  initialFormState,
  type FormState,
  type SubmissionKind,
} from "./validation"

/** The confirmation's title, naming what the button sent. */
const sentTitles: Record<SubmissionKind, string> = {
  inquiry: "Inquiry sent",
  ownerLead: "Details sent",
  contact: "Message sent",
}

const anotherLabels: Record<SubmissionKind, string> = {
  inquiry: "Send another inquiry",
  ownerLead: "Tell us about another home",
  contact: "Send another message",
}

export type SubmissionFormProps = {
  kind: SubmissionKind
  /** The button's text. */
  submitLabel: string
  /** Shown once the Submission is stored. */
  successMessage: string
  /** The fields, given the form's id (for unique input ids) and state. */
  children: (formId: string, state: FormState) => ReactNode
  className?: string
}

/**
 * A form that stores a Submission of `kind` through the `submit` Server
 * Action: pending state, a summary of errors, and a confirmation that
 * replaces the form once sent. "Send another" starts a fresh form.
 */
export function SubmissionForm(props: SubmissionFormProps) {
  const [round, setRound] = useState(0)
  return (
    <FormRound key={round} {...props} onReset={() => setRound((n) => n + 1)} />
  )
}

function FormRound({
  kind,
  submitLabel,
  successMessage,
  children,
  className,
  onReset,
}: SubmissionFormProps & { onReset: () => void }) {
  const { submit } = useFormActions()
  const [state, action, pending] = useActionState(
    submit.bind(null, kind),
    initialFormState
  )
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const sentRef = useRef<HTMLHeadingElement>(null)

  // Move focus to what changed: the first invalid field, or the confirmation.
  useEffect(() => {
    if (state.status === "invalid") {
      formRef.current
        ?.querySelector<HTMLElement>("[aria-invalid='true']")
        ?.focus()
    } else if (state.status === "sent") {
      sentRef.current?.focus()
    }
  }, [state])

  if (state.status === "sent") {
    return (
      <div
        className={cn(
          "flex flex-col items-start gap-4 py-6 motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in",
          className
        )}
      >
        <CircleCheckIcon
          aria-hidden
          strokeWidth={1.5}
          className="size-10 text-(--brand-primary)"
        />
        <h3
          ref={sentRef}
          tabIndex={-1}
          className={cn(displayFont, "text-3xl leading-tight outline-none")}
        >
          {sentTitles[kind]}
        </h3>
        <p className="max-w-prose text-base text-pretty text-muted-foreground">
          {successMessage}
        </p>
        <Button variant="outline" size="lg" onClick={onReset} className="mt-2">
          {anotherLabels[kind]}
        </Button>
      </div>
    )
  }

  const summary = state.status === "invalid" || state.status === "failed"

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      aria-busy={pending}
      className={cn("relative flex flex-col gap-6", className)}
    >
      <div aria-live="polite" aria-atomic className="empty:-mb-6">
        {summary && state.message && (
          <p
            className={cn(
              "flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm",
              "border-destructive/30 bg-destructive/5 text-destructive"
            )}
          >
            <CircleAlertIcon aria-hidden className="mt-px size-4 shrink-0" />
            {state.message}
          </p>
        )}
      </div>

      {children(formId, state)}
      <Honeypot />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Every field is needed unless it says optional.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 min-w-40 px-6 text-base"
        >
          {pending && <LoaderCircleIcon aria-hidden className="animate-spin" />}
          {pending ? "Sending…" : submitLabel}
        </Button>
      </div>
    </form>
  )
}
