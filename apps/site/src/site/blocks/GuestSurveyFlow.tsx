"use client"

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import type { GuestSurveyBlock } from "../../payload-types"
import { displayFont } from "../display"
import {
  FEEDBACK_FIELDS,
  MESSAGE_MAX,
  pathFor,
  phoneParts,
  ratingName,
  RATING_LABELS,
  validateFeedback,
  type FeedbackErrors,
  type FeedbackField,
  type FeedbackValues,
} from "../guestSurvey"
import { EditableText } from "./Editable"
import { type BlockContext, blockId, type BlockPlace } from "./types"

type Step =
  | "rating"
  | "positive"
  | "thanks"
  | "negative"
  | "success"
  | "failure"

/** One optional input: its label and how the browser fills it. */
const inputs: Record<
  FeedbackField,
  {
    label: string
    kind: "text" | "email" | "tel" | "date"
    autoComplete: string
  }
> = {
  name: { label: "Your name", kind: "text", autoComplete: "name" },
  email: { label: "Email", kind: "email", autoComplete: "email" },
  phone: { label: "Phone", kind: "tel", autoComplete: "tel" },
  reservation: {
    label: "Reservation or confirmation number",
    kind: "text",
    autoComplete: "off",
  },
  property: { label: "Property name", kind: "text", autoComplete: "off" },
  checkIn: { label: "Check-in date", kind: "date", autoComplete: "off" },
}

const STAR =
  "M12 2.6l2.85 6.1 6.65.8-4.9 4.55 1.3 6.6L12 17.4l-5.9 3.25 1.3-6.6-4.9-4.55 6.65-.8z"

function Star({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn("stroke-current stroke-[1.5]", className)}
      fill={filled ? "currentColor" : "none"}
      strokeLinejoin="round"
    >
      <path d={STAR} />
    </svg>
  )
}

/** Sends the feedback to the Site, which passes it on. True when it went. */
async function send(body: object): Promise<boolean> {
  try {
    const response = await fetch("/api/guest-feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * The Guest feedback survey's flow, the part of the Block that needs the browser. A
 * guest picks a rating out of five stars. A high one is asked for a review,
 * at the Block's link, or skips it; a lower one gets the feedback form, which
 * is sent to guest care and answered with the Sent or the Not sent step.
 *
 * A click on a star chooses it and moves on. From the keyboard the arrow keys
 * choose, and Enter moves on. Each step starts at its heading, so a screen
 * reader hears where the guest is. Ids come from the Block's position, not
 * `useId`, so the Visual Editor's canvas and the Site draw the same markup;
 * in the canvas nothing is sent.
 */
export function GuestSurveyFlow({
  block,
  first,
  context,
  submit = send,
}: {
  block: GuestSurveyBlock
  /** Whether the Block is the first on the Page, and so holds its h1. */
  first: boolean
  context: BlockPlace & Pick<BlockContext, "editing">
  /** How the feedback is sent; a test passes its own. */
  submit?: (body: object) => Promise<boolean>
}) {
  const [step, setStep] = useState<Step>("rating")
  const [rating, setRating] = useState(0)
  const [values, setValues] = useState<FeedbackValues>({ message: "" })
  const [consent, setConsent] = useState(false)
  const [trap, setTrap] = useState("")
  const [errors, setErrors] = useState<FeedbackErrors>({})
  const [pending, setPending] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const id = (name: string) => blockId(context, `survey-${name}`)
  const Heading = first ? "h1" : "h2"

  // A new step starts at its heading. Not on the first draw: the Page loads
  // with focus where the browser put it.
  const drawn = useRef(false)
  useEffect(() => {
    if (drawn.current) heading.current?.focus()
    else drawn.current = true
  }, [step])

  const shown = FEEDBACK_FIELDS.filter((field) =>
    (block.negative?.formFields ?? []).includes(field)
  )
  const consentLabel = block.negative?.consentLabel?.trim()
  const reviewUrl = block.positive?.reviewUrl?.trim()

  function choose(stars: number) {
    setRating(stars)
    setStep(pathFor(stars, block.reviewFrom))
  }

  async function deliver() {
    setPending(true)
    const sent = context.editing
      ? true
      : await submit({
          rating,
          ...values,
          consent,
          website: trap,
          page: window.location.pathname,
        })
    setPending(false)
    setStep(sent ? "success" : "failure")
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateFeedback(values)
    setErrors(found)
    const wrong = (["message", ...shown] as const).find((key) => found[key])
    if (wrong) {
      event.currentTarget
        .querySelector<HTMLElement>(`[id="${id(wrong)}"]`)
        ?.focus()
      return
    }
    void deliver()
  }

  const title = (words: string, extra?: string) => (
    <Heading
      ref={heading}
      tabIndex={-1}
      id={id("heading")}
      className={cn(
        displayFont,
        "text-3xl text-balance outline-none fit-sm:text-4xl",
        extra
      )}
    >
      {words}
    </Heading>
  )

  const lede = (words: ReactNode) =>
    words ? (
      <p className="text-lg text-pretty whitespace-pre-line">{words}</p>
    ) : null

  /** A step's text, with the guest care number as a link to call. */
  const withPhone = (words: string | null | undefined) => {
    const parts = phoneParts(words, block.phone)
    if (parts.length === 0) return null
    return parts.map((part, index) =>
      part === "{phone}" ? (
        <a
          key={index}
          href={`tel:${block.phone!.replace(/[^\d+]/g, "")}`}
          className="font-medium underline underline-offset-4"
        >
          {block.phone!.trim()}
        </a>
      ) : (
        part
      )
    )
  }

  const recap = (
    <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
      <span aria-hidden="true" className="flex text-accent">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} filled={n <= rating} className="size-5" />
        ))}
      </span>
      <span aria-hidden="true">{RATING_LABELS[rating - 1]}</span>
      <span className="sr-only">You chose {ratingName(rating)}.</span>
      <button
        type="button"
        onClick={() => setStep("rating")}
        className="rounded underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Change rating
      </button>
    </p>
  )

  if (step === "rating") {
    const heading = block.heading?.trim() ?? ""
    const intro = block.intro?.trim()
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <EditableText
          as={Heading}
          field="heading"
          context={context}
          id={id("heading")}
          className={cn(displayFont, "text-3xl text-balance fit-sm:text-4xl")}
        >
          {heading}
        </EditableText>
        {intro && (
          <EditableText
            as="p"
            field="intro"
            context={context}
            multiline
            className="text-lg text-pretty whitespace-pre-line"
          >
            {intro}
          </EditableText>
        )}
        <div
          role="radiogroup"
          aria-labelledby={id("heading")}
          className="mt-2 flex gap-1 fit-sm:gap-2"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              // A pointer chooses and moves on. The arrow keys also click the
              // radio they land on, with no pointer behind it (detail 0).
              onClick={(event) => {
                if (event.detail > 0) choose(n)
              }}
              className="cursor-pointer rounded-(--input-radius) p-1 text-accent transition-transform hover:scale-110 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name={id("rating")}
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && rating > 0) choose(rating)
                }}
                className="sr-only"
              />
              <Star filled={n <= rating} className="size-10 fit-sm:size-12" />
              <span className="sr-only">{ratingName(n)}</span>
            </label>
          ))}
        </div>
        {/* The height is kept, so choosing a star moves nothing. */}
        <p aria-hidden="true" className="min-h-6 text-sm">
          {rating > 0 && (
            <>
              <span className="font-medium">{RATING_LABELS[rating - 1]}</span>
              {" · "}Press Enter to continue
            </>
          )}
        </p>
        <p role="status" className="sr-only">
          {rating > 0 ? `${ratingName(rating)}. Press Enter to continue.` : ""}
        </p>
      </div>
    )
  }

  if (step === "positive") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        {recap}
        {title(block.positive?.heading?.trim() ?? "")}
        {lede(block.positive?.text?.trim())}
        <div className="mt-2 flex flex-col items-center gap-3">
          {reviewUrl && (
            <a
              href={reviewUrl}
              rel="noopener"
              className={buttonVariants({ variant: "accent", size: "lg" })}
            >
              {block.positive?.buttonLabel?.trim() || "Leave a review"}
            </a>
          )}
          <button
            type="button"
            onClick={() => setStep("thanks")}
            className="rounded text-sm underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {block.positive?.laterLabel?.trim() || "Maybe later"}
          </button>
        </div>
      </div>
    )
  }

  if (step === "thanks" || step === "success") {
    const words = step === "thanks" ? block.thanks : block.success
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        {title(words?.heading?.trim() ?? "")}
        {lede(withPhone(words?.text))}
      </div>
    )
  }

  if (step === "failure") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        {title(block.failure?.heading?.trim() ?? "")}
        {lede(withPhone(block.failure?.text))}
        <Button
          type="button"
          variant="accent"
          size="lg"
          disabled={pending}
          onClick={() => void deliver()}
        >
          {pending ? "Sending…" : "Try again"}
        </Button>
      </div>
    )
  }

  const problem = Object.keys(errors).length > 0
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {recap}
      <div className="flex flex-col gap-3 text-center">
        {title(block.negative?.heading?.trim() ?? "")}
        {lede(block.negative?.text?.trim())}
      </div>
      <form
        noValidate
        onSubmit={submitForm}
        aria-labelledby={id("heading")}
        className="flex flex-col gap-5 rounded-(--card-radius) bg-card p-4 text-card-foreground shadow-(--card-shadow) fit-sm:p-6"
      >
        {problem && (
          <p role="alert" className="text-sm text-destructive-text">
            Please fix the highlighted{" "}
            {Object.keys(errors).length === 1 ? "field" : "fields"} to continue.
          </p>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor={id("message")} className="text-sm font-medium">
            {block.negative?.messageLabel?.trim() || "Your feedback"}
          </label>
          <Textarea
            id={id("message")}
            name="message"
            rows={4}
            maxLength={MESSAGE_MAX}
            autoComplete="off"
            aria-required
            value={values.message}
            onChange={(event) =>
              setValues((v) => ({ ...v, message: event.target.value }))
            }
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={
              errors.message ? `${id("message")}-error` : undefined
            }
          />
          {errors.message && (
            <p
              id={`${id("message")}-error`}
              className="text-sm text-destructive-text"
            >
              {errors.message}
            </p>
          )}
        </div>
        {shown.map((field) => {
          const control = inputs[field]
          const error = errors[field]
          return (
            <div key={field} className="flex flex-col gap-2">
              <label htmlFor={id(field)} className="text-sm font-medium">
                {control.label}{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <Input
                id={id(field)}
                name={field}
                type={control.kind}
                autoComplete={control.autoComplete}
                value={values[field] ?? ""}
                onChange={(event) =>
                  setValues((v) => ({ ...v, [field]: event.target.value }))
                }
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id(field)}-error` : undefined}
              />
              {error && (
                <p
                  id={`${id(field)}-error`}
                  className="text-sm text-destructive-text"
                >
                  {error}
                </p>
              )}
            </div>
          )
        })}
        {consentLabel && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="consent"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 size-4 accent-(--primary)"
            />
            {consentLabel}
          </label>
        )}
        {/* A trap for scripts: people never see or reach it. */}
        <div aria-hidden="true" className="hidden">
          <label>
            Website
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={trap}
              onChange={(event) => setTrap(event.target.value)}
            />
          </label>
        </div>
        <div>
          <Button type="submit" variant="accent" size="lg" disabled={pending}>
            {pending
              ? "Sending…"
              : block.negative?.submitLabel?.trim() || "Send feedback"}
          </Button>
        </div>
      </form>
    </div>
  )
}
