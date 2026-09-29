"use client"

import { useActionState, useRef } from "react"
import { UploadIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

import { uploadMedia } from "../actions/media"
import { FormField, FormMessage, Section } from "./FormBits"

/** Uploads one image with its alt text. */
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
  const errors = state.fieldErrors ?? {}
  return (
    <Section title="Upload an image" description="JPEG, PNG, WebP or AVIF.">
      <form ref={form} action={action} className="flex flex-col gap-4">
        <FormMessage state={state} />
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
  )
}
