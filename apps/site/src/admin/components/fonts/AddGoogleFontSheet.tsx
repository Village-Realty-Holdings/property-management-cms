"use client"

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

import { addGoogleFont } from "../../actions/fonts"
import { FONT_WEIGHTS } from "../../../fonts/types"
import { faceLabel } from "../../fonts/labels"
import { InlineError } from "../../kit"
import { describedBy, FormField } from "../FormBits"
import { FontKindSelect } from "./FontKindSelect"
import { useFontForm } from "./useFontForm"

const FORM_ID = "add-google-font"
/** Regular and Bold, the pair most Sites use. */
const DEFAULT_WEIGHTS: readonly number[] = [400, 700]

/**
 * Add Google Font: the family's name as on Google Fonts, its kind and the
 * weights to keep. The server downloads the files once and stores them, so
 * the Site serves them itself.
 */
export function AddGoogleFontSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <AddGoogleFontForm onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

function AddGoogleFontForm({ onDone }: { onDone: () => void }) {
  const { state, pending, submit, errors } = useFontForm(addGoogleFont, onDone)
  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SheetHeader>
        <SheetTitle>Add Google Font</SheetTitle>
        <SheetDescription>
          The Site downloads the font from Google Fonts once and serves it
          itself. Visitors&apos; browsers never ask Google.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
        {state.ok === false && state.message && (
          <InlineError>{state.message}</InlineError>
        )}
        <FormField
          id="google-family"
          label="Font family"
          description="The name as it appears on fonts.google.com, such as Roboto Slab."
          error={errors.family}
        >
          <Input
            id="google-family"
            name="family"
            autoComplete="off"
            spellCheck={false}
            {...describedBy("google-family", {
              description: true,
              error: errors.family,
            })}
          />
        </FormField>
        <FontKindSelect id="google-kind" error={errors.kind} />

        <fieldset
          className="flex flex-col gap-2"
          aria-describedby={errors.weights ? "google-weights-error" : undefined}
        >
          <legend className="mb-1 text-sm font-medium">Weights</legend>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {FONT_WEIGHTS.map((weight) => (
              <label key={weight} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="weight"
                  value={weight}
                  defaultChecked={DEFAULT_WEIGHTS.includes(weight)}
                  className="size-4 accent-primary"
                />
                {faceLabel({ weight, style: "normal" })}
              </label>
            ))}
          </div>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="italic"
              className="size-4 accent-primary"
            />
            Include italics
          </label>
          {errors.weights && (
            <p id="google-weights-error" className="text-sm text-destructive">
              {errors.weights}
            </p>
          )}
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
          {pending ? "Adding…" : "Add font"}
        </Button>
      </SheetFooter>
    </form>
  )
}
