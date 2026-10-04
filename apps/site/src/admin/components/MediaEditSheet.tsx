"use client"

import { useState } from "react"
import { PencilIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

import { updateMedia } from "../actions/media"
import type { FormState } from "../formState"
import { InlineError } from "../kit"
import { describedBy, FormField } from "./FormBits"
import { useFormAction } from "./useFormAction"

/** What the sheet shows and edits about one image. */
export type MediaDetails = {
  id: number
  filename: string
  url?: string | null
  alt: string
  caption?: string | null
  credit?: string | null
  author?: string | null
  sourceUrl?: string | null
  licence?: string | null
}

const FORM_ID = "edit-media"

/**
 * The edit button on a Media card, and the sheet it opens: alt text, caption,
 * credit and attribution. The file itself can't be replaced here; upload a new
 * image instead.
 */
export function MediaEditSheet({ media }: { media: MediaDetails }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${media.filename}`}
        onClick={() => setOpen(true)}
      >
        <PencilIcon />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <MediaEditForm media={media} onDone={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}

function MediaEditForm({
  media,
  onDone,
}: {
  media: MediaDetails
  onDone: () => void
}) {
  const { state, pending, submit, errors } = useFormAction(
    (_previous: FormState, data: FormData) => updateMedia(media.id, data),
    onDone
  )
  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SheetHeader>
        <SheetTitle>Edit image</SheetTitle>
        <SheetDescription>{media.filename}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
        {state.ok === false && state.message && (
          <InlineError>{state.message}</InlineError>
        )}
        {media.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt=""
            className="aspect-4/3 w-full rounded-lg bg-muted object-contain"
          />
        )}
        <FormField
          id="media-alt"
          label="Alt text"
          description="Describe what the image shows for people who can't see it, in a short sentence. Don't start with “Image of”."
          error={errors.alt}
        >
          <Input
            id="media-alt"
            name="alt"
            defaultValue={media.alt}
            required
            {...describedBy("media-alt", {
              description: true,
              error: errors.alt,
            })}
          />
        </FormField>
        <FormField id="media-caption" label="Caption" error={errors.caption}>
          <Input
            id="media-caption"
            name="caption"
            defaultValue={media.caption ?? ""}
            {...describedBy("media-caption", { error: errors.caption })}
          />
        </FormField>
        <FormField
          id="media-credit"
          label="Credit"
          description="Photographer or source, such as © Jane Doe."
          error={errors.credit}
        >
          <Input
            id="media-credit"
            name="credit"
            defaultValue={media.credit ?? ""}
            {...describedBy("media-credit", {
              description: true,
              error: errors.credit,
            })}
          />
        </FormField>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-sm font-medium">Attribution</legend>
          <p className="text-sm text-muted-foreground">
            For stock photos: who took it, where it came from.
          </p>
          <FormField
            id="media-author"
            label="Author"
            error={errors["attribution.author"]}
          >
            <Input
              id="media-author"
              name="author"
              defaultValue={media.author ?? ""}
              {...describedBy("media-author", {
                error: errors["attribution.author"],
              })}
            />
          </FormField>
          <FormField
            id="media-source-url"
            label="Source URL"
            error={errors["attribution.sourceUrl"]}
          >
            <Input
              id="media-source-url"
              name="sourceUrl"
              inputMode="url"
              placeholder="https://unsplash.com/photos/…"
              defaultValue={media.sourceUrl ?? ""}
              {...describedBy("media-source-url", {
                error: errors["attribution.sourceUrl"],
              })}
            />
          </FormField>
          <FormField
            id="media-licence"
            label="Licence"
            error={errors["attribution.licence"]}
          >
            <Input
              id="media-licence"
              name="licence"
              placeholder="Unsplash License"
              defaultValue={media.licence ?? ""}
              {...describedBy("media-licence", {
                error: errors["attribution.licence"],
              })}
            />
          </FormField>
        </fieldset>
      </div>

      <SheetFooter className="flex-row justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </SheetFooter>
    </form>
  )
}
