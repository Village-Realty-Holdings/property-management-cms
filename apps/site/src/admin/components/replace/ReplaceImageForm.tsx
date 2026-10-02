"use client"

import { useState, type FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"

import { applyImageReplace, previewImageReplace } from "../../actions/replace"
import { InlineError, notify, PageHeader } from "../../kit"
import type { ReplacePreview, ReplaceResult } from "../../replace/run"
import { FormField, Section } from "../FormBits"
import { MediaSelect, type MediaOption } from "../MediaSelect"
import { ReplaceOutcomes, ReplaceReview } from "./ReplaceReview"

const FORM = "replace-image"

/**
 * Replace Image: pick an image and the one to show instead (from Media, or
 * uploaded in the picker), see every place that shows the first, then swap
 * it. The first image stays in Media.
 */
export function ReplaceImageForm({ media }: { media: MediaOption[] }) {
  const [from, setFrom] = useState<number | null>(null)
  const [to, setTo] = useState<number | null>(null)
  const [includeTemplates, setIncludeTemplates] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const [preview, setPreview] = useState<ReplacePreview>()
  const [result, setResult] = useState<ReplaceResult>()

  const swap = { from, to, includeTemplates }
  const edit =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value)
      setPreview(undefined)
      setResult(undefined)
      setError(undefined)
    }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    setResult(undefined)
    try {
      const found = await previewImageReplace(swap)
      if (found.ok) setPreview(found.preview)
      else setError(found.message)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Replace Image"
        description="Swap one image for another everywhere it is shown."
        action={
          <Button type="submit" form={FORM} disabled={pending}>
            {pending ? "Looking…" : "Preview"}
          </Button>
        }
      />
      <div className="flex max-w-3xl flex-col gap-6">
        <form id={FORM} onSubmit={submit} noValidate>
          <Section
            title="Images"
            description="Pages, Layouts, the Brand and SEO are searched. The image you replace stays in Media."
          >
            <FormField id="replace-from" label="Replace">
              <MediaSelect
                id="replace-from"
                value={from}
                options={media}
                onChange={edit(setFrom)}
              />
            </FormField>
            <FormField id="replace-to" label="With">
              <MediaSelect
                id="replace-to"
                value={to}
                options={media}
                onChange={edit(setTo)}
              />
            </FormField>
            <div className="flex items-center gap-2">
              <Switch
                id="include-templates"
                checked={includeTemplates}
                onCheckedChange={(checked) =>
                  edit(setIncludeTemplates)(checked === true)
                }
                aria-describedby="include-templates-description"
              />
              <div>
                <Label htmlFor="include-templates">
                  Include Page Templates
                </Label>
                <p
                  id="include-templates-description"
                  className="text-sm text-muted-foreground"
                >
                  Off, Page Templates are left as they are.
                </p>
              </div>
            </div>
            {error && <InlineError>{error}</InlineError>}
          </Section>
        </form>
        {preview && !result && (
          <ReplaceReview
            preview={preview}
            unit="use"
            what="Replace this image everywhere?"
            onApply={(mode) => applyImageReplace(swap, mode)}
            onDone={(done) => {
              setResult(done)
              setPreview(undefined)
              if (done.ok) notify.success(done.message)
            }}
          />
        )}
        {result && <ReplaceOutcomes result={result} />}
      </div>
    </>
  )
}
