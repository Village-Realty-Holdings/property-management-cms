"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import type { StarterKit } from "../../../starterKits"
import { applyStarterKit, reviewStarterKit } from "../../actions/starterKits"
import { InlineError, notify, PageHeader } from "../../kit"
import type { ThemeCard } from "../../savedThemes"
import type { KitAnswers, KitResult, KitStep } from "../../starterKits"
import { describedBy, FormField, Section } from "../FormBits"
import { MediaSelect, type MediaOption } from "../MediaSelect"

const STEPS = ["Kit", "Brand", "SEO", "Theme", "Review"] as const
type Step = (typeof STEPS)[number]

const FAILED = "Something went wrong. Please try again."

/** The step a field error belongs to, from its key ("brand.name", "theme"). */
const stepOf = (key: string): Step =>
  key.startsWith("brand.") ? "Brand" : key.startsWith("seo.") ? "SEO" : "Theme"

/** What a kit shows of itself on its card: the form needs no Blocks. */
export type KitSummary = Pick<
  StarterKit,
  "id" | "name" | "blurb" | "includes" | "theme" | "questions"
>

/**
 * Starter Kits: sets a Site up in five steps. Choose a kit, give the Brand
 * and SEO details, pick a Theme, then review what will change before
 * anything is written. The review comes from the server, so it says what the
 * Site has now: what is replaced, and which Pages are skipped.
 */
export function StarterKitForm({
  kits,
  themes,
  media,
  defaults,
}: {
  kits: KitSummary[]
  themes: ThemeCard[]
  media: MediaOption[]
  defaults: Pick<KitAnswers, "brand" | "seo">
}) {
  const [step, setStep] = useState<Step>("Kit")
  const [answers, setAnswers] = useState<KitAnswers>({
    kit: "",
    ...defaults,
    theme: "",
    details: {},
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string>()
  const [review, setReview] = useState<KitStep[]>()
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<KitResult>()
  const heading = useRef<HTMLHeadingElement>(null)

  // Each step starts at its heading, for keyboard and screen reader users.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) first.current = false
    else heading.current?.focus()
  }, [step, result])

  const kit = kits.find((candidate) => candidate.id === answers.kit)
  const index = STEPS.indexOf(step)

  const setBrand = (patch: Partial<KitAnswers["brand"]>) =>
    setAnswers((a) => ({ ...a, brand: { ...a.brand, ...patch } }))
  const setSeo = (patch: Partial<KitAnswers["seo"]>) =>
    setAnswers((a) => ({ ...a, seo: { ...a.seo, ...patch } }))

  function chooseKit(id: string) {
    const chosen = kits.find((candidate) => candidate.id === id)
    setAnswers((a) => ({
      ...a,
      kit: id,
      // The kit suggests a Theme until the Staff User picks one.
      theme: chosen ? `preset:${chosen.theme}` : a.theme,
      details: {},
    }))
    setErrors({})
  }

  /** What stops this step, checked before the server sees anything. */
  function problems(): Record<string, string> {
    if (step === "Kit" && !kit) return { kit: "Choose a Starter Kit." }
    if (step === "Brand" && !answers.brand.name.trim()) {
      return { "brand.name": "Enter the Site name." }
    }
    if (step === "Theme" && !answers.theme) return { theme: "Choose a Theme." }
    return {}
  }

  async function next() {
    const found = problems()
    setErrors(found)
    setMessage(undefined)
    if (Object.keys(found).length > 0) return
    if (step !== "Theme") {
      setStep(STEPS[index + 1]!)
      return
    }
    setPending(true)
    try {
      const reviewed = await reviewStarterKit(answers)
      if (reviewed.ok) {
        setReview(reviewed.steps)
        setStep("Review")
      } else {
        showProblems(reviewed.message, reviewed.fieldErrors)
      }
    } catch {
      setMessage(FAILED)
    } finally {
      setPending(false)
    }
  }

  /** Goes to the first step with an error, where its field shows it. */
  function showProblems(text: string, fieldErrors?: Record<string, string>) {
    const keys = Object.keys(fieldErrors ?? {})
    setErrors(fieldErrors ?? {})
    setMessage(text)
    if (keys.length > 0) {
      setStep(STEPS.find((s) => keys.some((key) => stepOf(key) === s)) ?? step)
    }
  }

  async function apply() {
    setPending(true)
    setMessage(undefined)
    try {
      const applied = await applyStarterKit(answers)
      if (applied.outcomes.length === 0 && !applied.ok) {
        showProblems(applied.message, applied.fieldErrors)
        return
      }
      setResult(applied)
      if (applied.ok) notify.success(applied.message)
    } catch {
      setMessage(FAILED)
    } finally {
      setPending(false)
    }
  }

  const header = (
    <PageHeader
      title="Starter Kits"
      description="Set a Site up in one go: its Brand, SEO, Theme and first Pages."
    />
  )

  if (result) {
    return (
      <>
        {header}
        <div className="flex max-w-3xl flex-col gap-4">
          <h2
            ref={heading}
            tabIndex={-1}
            className="text-base font-semibold outline-none"
          >
            {result.message}
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {result.outcomes.map((outcome, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-lg border bg-background px-3 py-2",
                  !outcome.ok && "border-destructive/30 text-destructive-text"
                )}
              >
                {outcome.ok ? "" : "Failed: "}
                {outcome.text}{" "}
                {outcome.href && (
                  <Link href={outcome.href} className="underline">
                    Open {outcome.kind === "Page" ? "the Page" : outcome.kind}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      <div className="flex max-w-3xl flex-col gap-6">
        <nav aria-label="Steps">
          <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {STEPS.map((name, i) => (
              <li
                key={name}
                aria-current={name === step ? "step" : undefined}
                className={cn(
                  "text-muted-foreground",
                  name === step && "font-semibold text-foreground"
                )}
              >
                {i + 1}. {name}
              </li>
            ))}
          </ol>
        </nav>

        {message && <InlineError>{message}</InlineError>}

        {step === "Kit" && (
          <Section title="Choose a Starter Kit">
            <StepHeading ref={heading}>
              Step 1 of {STEPS.length}: choose a Starter Kit
            </StepHeading>
            <RadioGroup
              aria-label="Starter Kit"
              value={answers.kit}
              onValueChange={(value) => chooseKit(String(value))}
              className="gap-3"
            >
              {kits.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <RadioGroupItem
                    id={`kit-${candidate.id}`}
                    value={candidate.id}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-1 text-sm">
                    <Label htmlFor={`kit-${candidate.id}`}>
                      {candidate.name}
                    </Label>
                    <p className="text-muted-foreground">{candidate.blurb}</p>
                    <ul className="list-disc pl-5 text-muted-foreground">
                      {candidate.includes.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </RadioGroup>
            {errors.kit && <InlineError>{errors.kit}</InlineError>}
            {kit?.questions.map((question) => (
              <FormField
                key={question.key}
                id={`detail-${question.key}`}
                label={question.label}
                description={question.help}
              >
                <Input
                  id={`detail-${question.key}`}
                  value={answers.details[question.key] ?? ""}
                  maxLength={120}
                  onChange={(event) =>
                    setAnswers((a) => ({
                      ...a,
                      details: {
                        ...a.details,
                        [question.key]: event.target.value,
                      },
                    }))
                  }
                  {...describedBy(`detail-${question.key}`, {
                    description: true,
                  })}
                />
              </FormField>
            ))}
          </Section>
        )}

        {step === "Brand" && (
          <Section
            title="Brand"
            description="Your Site’s identity. It is saved to the Brand, where the rest of it (address, social links) lives."
          >
            <StepHeading ref={heading}>
              Step 2 of {STEPS.length}: Brand
            </StepHeading>
            <FormField
              id="kit-name"
              label="Site name"
              error={errors["brand.name"]}
            >
              <Input
                id="kit-name"
                value={answers.brand.name}
                onChange={(event) => setBrand({ name: event.target.value })}
                {...describedBy("kit-name", { error: errors["brand.name"] })}
              />
            </FormField>
            <FormField id="kit-tagline" label="Tagline">
              <Input
                id="kit-tagline"
                value={answers.brand.tagline}
                onChange={(event) => setBrand({ tagline: event.target.value })}
              />
            </FormField>
            <FormField id="kit-logo" label="Logo">
              <MediaSelect
                id="kit-logo"
                value={answers.brand.logo}
                options={media}
                onChange={(logo) => setBrand({ logo })}
              />
            </FormField>
            <FormField id="kit-phone" label="Phone">
              <Input
                id="kit-phone"
                type="tel"
                value={answers.brand.phone}
                onChange={(event) => setBrand({ phone: event.target.value })}
              />
            </FormField>
            <FormField
              id="kit-email"
              label="Email"
              error={errors["brand.email"]}
            >
              <Input
                id="kit-email"
                type="email"
                value={answers.brand.email}
                onChange={(event) => setBrand({ email: event.target.value })}
                {...describedBy("kit-email", { error: errors["brand.email"] })}
              />
            </FormField>
          </Section>
        )}

        {step === "SEO" && (
          <Section
            title="SEO"
            description="How your Site appears in search results and browser tabs."
          >
            <StepHeading ref={heading}>
              Step 3 of {STEPS.length}: SEO
            </StepHeading>
            <FormField
              id="kit-title-pattern"
              label="Title pattern"
              description="%s is the Page title and {name} the Site name."
              error={errors["seo.titlePattern"]}
            >
              <Input
                id="kit-title-pattern"
                value={answers.seo.titlePattern}
                onChange={(event) =>
                  setSeo({ titlePattern: event.target.value })
                }
                {...describedBy("kit-title-pattern", {
                  description: true,
                  error: errors["seo.titlePattern"],
                })}
              />
            </FormField>
            <FormField
              id="kit-description"
              label="Description"
              description="The summary shown under the title in search results."
              error={errors["seo.description"]}
            >
              <Textarea
                id="kit-description"
                rows={3}
                value={answers.seo.description}
                onChange={(event) =>
                  setSeo({ description: event.target.value })
                }
                {...describedBy("kit-description", {
                  description: true,
                  error: errors["seo.description"],
                })}
              />
            </FormField>
            <FormField id="kit-favicon" label="Favicon">
              <MediaSelect
                id="kit-favicon"
                value={answers.seo.favicon}
                options={media}
                onChange={(favicon) => setSeo({ favicon })}
              />
            </FormField>
          </Section>
        )}

        {step === "Theme" && (
          <Section
            title="Theme"
            description="The Theme your Site starts with. You can change it at any time."
          >
            <StepHeading ref={heading}>
              Step 4 of {STEPS.length}: Theme
            </StepHeading>
            <RadioGroup
              aria-label="Theme"
              value={answers.theme}
              onValueChange={(value) =>
                setAnswers((a) => ({ ...a, theme: String(value) }))
              }
              className="grid gap-3 sm:grid-cols-2"
            >
              {themes.map((card) => (
                <div
                  key={card.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <RadioGroupItem
                    id={`theme-${card.id}`}
                    value={card.id}
                    className="mt-0.5"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label htmlFor={`theme-${card.id}`}>{card.name}</Label>
                      {card.live && <Badge variant="outline">Live now</Badge>}
                      {kit && card.id === `preset:${kit.theme}` && (
                        <Badge variant="outline">Suggested</Badge>
                      )}
                    </div>
                    <div
                      aria-hidden="true"
                      className="flex h-6 overflow-hidden rounded border"
                    >
                      {card.swatches.map((swatch) => (
                        <span
                          key={swatch.name}
                          className="flex-1"
                          style={{ backgroundColor: swatch.hex }}
                        />
                      ))}
                    </div>
                    <p className="text-muted-foreground">{card.fonts}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
            {errors.theme && <InlineError>{errors.theme}</InlineError>}
          </Section>
        )}

        {step === "Review" && review && (
          <Section
            title="Review"
            description="Nothing has changed yet. This is what setting up will do."
          >
            <StepHeading ref={heading}>
              Step 5 of {STEPS.length}: review
            </StepHeading>
            <ul aria-label="What will change" className="flex flex-col gap-2">
              {review.map((line, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                    line.warning && "bg-muted"
                  )}
                >
                  <Badge variant="outline" className="shrink-0">
                    {line.kind}
                  </Badge>
                  <span>
                    {line.warning && (
                      <span className="font-medium">Check this: </span>
                    )}
                    {line.text}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={index === 0 || pending}
            onClick={() => {
              setMessage(undefined)
              setStep(STEPS[index - 1]!)
            }}
          >
            Back
          </Button>
          {step === "Review" ? (
            <Button type="button" disabled={pending} onClick={apply}>
              {pending ? "Setting up…" : "Set up Site"}
            </Button>
          ) : (
            <Button type="button" disabled={pending} onClick={next}>
              {pending ? "Checking…" : "Next"}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

/** Where focus lands when a step opens; read out, not shown. */
function StepHeading({
  ref,
  children,
}: {
  ref: React.Ref<HTMLHeadingElement>
  children: React.ReactNode
}) {
  return (
    <h3 ref={ref} tabIndex={-1} className="sr-only">
      {children}
    </h3>
  )
}
