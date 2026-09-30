"use client"

import { useEffect, useRef, useState } from "react"
import { PlusIcon, XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

import { uploadFonts } from "../../actions/fonts"
import { FONT_STYLES, FONT_WEIGHTS } from "../../../fonts/types"
import { MAX_UPLOAD_BYTES } from "../../fonts/forms"
import { faceLabel } from "../../fonts/labels"
import { InlineError } from "../../kit"
import { describedBy, FormField } from "../FormBits"
import { FontKindSelect } from "./FontKindSelect"
import { useFontForm } from "./useFontForm"

const FORM_ID = "upload-fonts"
const ACCEPT = ".woff2,.woff,.ttf,.otf"

/**
 * Upload files: a family name and kind, and one or more font files, each
 * with its own weight and style. The Font is stored with the files and the
 * Site serves them itself.
 */
export function UploadFontsSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <UploadFontsForm onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

function UploadFontsForm({ onDone }: { onDone: () => void }) {
  const { state, pending, submit, errors } = useFontForm(uploadFonts, onDone)
  // Rows are told apart by a key, not their place, so removing one keeps the
  // files chosen in the others.
  const [keys, setKeys] = useState([0])
  const nextKey = useRef(1)
  const grew = useRef(false)
  const addButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!grew.current) return
    grew.current = false
    document.getElementById(`upload-file-${keys[keys.length - 1]}`)?.focus()
  }, [keys])

  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SheetHeader>
        <SheetTitle>Upload font files</SheetTitle>
        <SheetDescription>
          WOFF2 files are the smallest. Choose the weight and style of each
          file. Up to {MAX_UPLOAD_BYTES / 1024 / 1024} MB in total.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
        {state.ok === false && state.message && (
          <InlineError>{state.message}</InlineError>
        )}
        <FormField
          id="upload-family"
          label="Font family"
          description="The name the Theme shows, such as Acme Sans."
          error={errors.family}
        >
          <Input
            id="upload-family"
            name="family"
            autoComplete="off"
            {...describedBy("upload-family", {
              description: true,
              error: errors.family,
            })}
          />
        </FormField>
        <FontKindSelect id="upload-kind" error={errors.kind} />

        <ul className="flex flex-col gap-3">
          {keys.map((key, index) => {
            const n = index + 1
            const fileError = errors[`files.${index}.file`]
            const weightError = errors[`files.${index}.weight`]
            const styleError = errors[`files.${index}.style`]
            return (
              <li
                key={key}
                className="flex flex-col gap-3 rounded-lg border p-3"
              >
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <FormField
                      id={`upload-file-${key}`}
                      label={`Font file ${n}`}
                      error={fileError}
                    >
                      <Input
                        id={`upload-file-${key}`}
                        name="file"
                        type="file"
                        accept={ACCEPT}
                        {...describedBy(`upload-file-${key}`, {
                          error: fileError,
                        })}
                      />
                    </FormField>
                  </div>
                  {keys.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove file ${n}`}
                      disabled={pending}
                      onClick={() => {
                        setKeys((current) => current.filter((k) => k !== key))
                        addButton.current?.focus()
                      }}
                    >
                      <XIcon />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    id={`upload-weight-${key}`}
                    label="Weight"
                    error={weightError}
                  >
                    <NativeSelect
                      id={`upload-weight-${key}`}
                      name="weight"
                      defaultValue="400"
                      aria-label={`Weight of file ${n}`}
                      className="w-full"
                      {...describedBy(`upload-weight-${key}`, {
                        error: weightError,
                      })}
                    >
                      {FONT_WEIGHTS.map((weight) => (
                        <NativeSelectOption key={weight} value={weight}>
                          {faceLabel({ weight, style: "normal" })}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FormField>
                  <FormField
                    id={`upload-style-${key}`}
                    label="Style"
                    error={styleError}
                  >
                    <NativeSelect
                      id={`upload-style-${key}`}
                      name="style"
                      defaultValue="normal"
                      aria-label={`Style of file ${n}`}
                      className="w-full"
                      {...describedBy(`upload-style-${key}`, {
                        error: styleError,
                      })}
                    >
                      {FONT_STYLES.map((style) => (
                        <NativeSelectOption key={style} value={style}>
                          {style === "normal" ? "Normal" : "Italic"}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FormField>
                </div>
              </li>
            )
          })}
        </ul>
        <div>
          <Button
            ref={addButton}
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              grew.current = true
              setKeys((current) => [...current, nextKey.current++])
            }}
          >
            <PlusIcon aria-hidden="true" /> Add another file
          </Button>
        </div>
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
          {pending ? "Uploading…" : "Upload font"}
        </Button>
      </SheetFooter>
    </form>
  )
}
