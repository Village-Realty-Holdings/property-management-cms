"use client"

import { useState, type FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { applyTextReplace, previewTextReplace } from "../../actions/replace"
import { notify, PageHeader } from "../../kit"
import type { ReplacePreview, ReplaceResult } from "../../replace/run"
import { FIND_MAX } from "../../replace/text"
import { describedBy, FormField, Section } from "../FormBits"
import { ReplaceOutcomes, ReplaceReview } from "./ReplaceReview"

const FORM = "replace-text"

/**
 * Replace Text: find a text on every Page and Layout, see where it is, then
 * replace it. The preview is of the text as typed: changing a field clears it.
 */
export function ReplaceTextForm() {
  const [find, setFind] = useState("")
  const [replaceWith, setReplaceWith] = useState("")
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const [preview, setPreview] = useState<ReplacePreview>()
  const [result, setResult] = useState<ReplaceResult>()

  const query = { find, replaceWith, caseSensitive, wholeWord }
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
      const found = await previewTextReplace(query)
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
        title="Replace Text"
        description="Change a word or phrase on every Page and Layout at once."
        action={
          <Button type="submit" form={FORM} disabled={pending}>
            {pending ? "Looking…" : "Preview"}
          </Button>
        }
      />
      <div className="flex max-w-3xl flex-col gap-6">
        <form id={FORM} onSubmit={submit} noValidate>
          <Section
            title="Text"
            description="Titles, headings, body text and button labels are searched. Paths, link URLs and the Brand and SEO settings are not."
          >
            <FormField id="find" label="Find" error={error}>
              <Input
                id="find"
                value={find}
                maxLength={FIND_MAX}
                onChange={(event) => edit(setFind)(event.target.value)}
                {...describedBy("find", { error })}
              />
            </FormField>
            <FormField
              id="replace-with"
              label="Replace with"
              description="Leave empty to remove the text."
            >
              <Input
                id="replace-with"
                value={replaceWith}
                maxLength={FIND_MAX}
                onChange={(event) => edit(setReplaceWith)(event.target.value)}
                {...describedBy("replace-with", { description: true })}
              />
            </FormField>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="case-sensitive"
                  checked={caseSensitive}
                  onCheckedChange={(checked) =>
                    edit(setCaseSensitive)(checked === true)
                  }
                />
                <Label htmlFor="case-sensitive">Match case</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="whole-word"
                  checked={wholeWord}
                  onCheckedChange={(checked) =>
                    edit(setWholeWord)(checked === true)
                  }
                />
                <Label htmlFor="whole-word">Whole words only</Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              In rich text, a match that is partly bold, italic or a link is not
              found.
            </p>
          </Section>
        </form>
        {preview && !result && (
          <ReplaceReview
            preview={preview}
            unit="match"
            what={
              replaceWith === ""
                ? `Remove “${find}”?`
                : `Replace “${find}” with “${replaceWith}”?`
            }
            onApply={(mode) => applyTextReplace(query, mode)}
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
