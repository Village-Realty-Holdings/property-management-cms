"use client"

import { useState, type FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { focusRings, type BlockSurface } from "./BlockButton"
import { EditableText } from "./Editable"
import { type BlockContext, blockId, type BlockPlace } from "./types"

const address = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * What is wrong with the address a visitor typed, in words they can act on,
 * or null when it is fine. The check is the plain shape (something, "@",
 * something, ".", something): the only way to know an address works is to
 * send to it, which this visual-only form never does.
 */
export function emailProblem(value: string): string | null {
  const email = value.trim()
  if (!email) return "Enter your email address."
  return address.test(email) ? null : "Enter a valid email address."
}

/** The chip a message sits in: on the page's own fill, so it reads on every background. */
const message =
  "w-fit rounded-(--input-radius) border border-border bg-background px-3 py-1.5 text-sm"

/**
 * The Newsletter's email form, the only part of it that needs the browser.
 * It is visual-only: a valid address shows a thank-you and clears the field;
 * nothing is sent, stored or navigated to. Field ids come from the Block's
 * position, not `useId`, so the Visual Editor's canvas and the Site draw the
 * same markup. The field and the messages sit on the Theme's background
 * colour, so they read on every Block background.
 */
export function NewsletterForm({
  placeholder,
  buttonLabel,
  surface,
  context,
}: {
  placeholder: string
  buttonLabel: string
  /** The coloured background the form sits on, when it is not the page. */
  surface?: Extract<BlockSurface, "primary" | "dark">
  context: BlockPlace & Pick<BlockContext, "editing">
}) {
  const [email, setEmail] = useState("")
  const [problem, setProblem] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const base = blockId(context, "newsletter")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = emailProblem(email)
    setProblem(found)
    setDone(found === null)
    if (found === null) setEmail("")
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-label="Newsletter sign-up"
      className="flex w-full flex-col gap-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`${base}-email`} className="sr-only">
          Email address
        </label>
        <Input
          id={`${base}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder={placeholder}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setProblem(null)
            setDone(false)
          }}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? `${base}-problem` : undefined}
          className={cn(
            "h-[calc(var(--btn-height)*1.125)] bg-background text-foreground sm:flex-1",
            surface && focusRings[surface]
          )}
        />
        <Button
          type="submit"
          variant={surface ? "accent" : "default"}
          size="lg"
          className={cn(surface && focusRings[surface])}
        >
          <EditableText field="buttonLabel" context={context}>
            {buttonLabel}
          </EditableText>
        </Button>
      </div>
      {problem && (
        <p
          id={`${base}-problem`}
          role="alert"
          className={cn(message, "text-destructive-text")}
        >
          {problem}
        </p>
      )}
      {/* Always in the page, so a screen reader hears it when it fills. */}
      <p
        role="status"
        className={cn(message, "text-foreground", !done && "hidden")}
      >
        {done ? "Thank you, you are on the list." : null}
      </p>
    </form>
  )
}
