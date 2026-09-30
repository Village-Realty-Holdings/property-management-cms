"use client"

import { useActionState, useRef } from "react"
import { UploadIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

import { uploadMedia } from "../actions/media"
import { InlineError, useSaveToast } from "../kit"
import { FormField, Section } from "./FormBits"

/**
 * Uploads one image with its alt text. A toast confirms the upload; a failure
 * shows inline. Reachable at `#upload` from the Dashboard's Upload Media.
 */
export function UploadForm() {
  const form = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState(
    async (...args: Parameters<typeof uploadMedia>) => {
      const result = await uploadMedia(...args)
      if (result.ok) form.current?.reset()
      return result
    },
    {}
  )
  useSaveToast(state)
  const errors = state.fieldErrors ?? {}
  return (
    <div id="upload" className="scroll-mt-6">
      <Section title="Upload an image" description="JPEG, PNG, WebP or AVIF.">
        <form ref={form} action={action} className="flex flex-col gap-4">
          {state.ok === false && state.message && (
            <InlineError>{state.message}</InlineError>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="file" label="Image" error={errors.file}>
              <Input
                id="file"
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                required
              />
            </FormField>
            <FormField
              id="alt"
              label="Alt text"
              description="Describe what the image shows for people who can't see it."
              error={errors.alt}
            >
              <Input id="alt" name="alt" required />
            </FormField>
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              <UploadIcon /> {pending ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </Section>
    </div>
  )
}
