"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent,
  type FormEvent,
} from "react"
import { ImageIcon, UploadIcon, XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { uploadMedia } from "../actions/media"
import { InlineError, notify } from "../kit"
import { describedBy, FormField } from "./FormBits"

export type MediaOption = { id: number; label: string; url: string | null }

/** What the Media collection accepts (src/collections/Media.ts). */
const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
]
const WRONG_TYPE = "Choose a JPEG, PNG, WebP, AVIF or SVG image."

// Images uploaded from a picker since the page loaded. The screen's own
// `options` were read on the server before that, so every picker on the
// screen adds these to its list.
let uploaded: readonly MediaOption[] = []
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const getUploaded = () => uploaded
function addUploaded(option: MediaOption) {
  uploaded = [option, ...uploaded]
  listeners.forEach((listener) => listener())
}

function useAllOptions(options: readonly MediaOption[]): MediaOption[] {
  const extra = useSyncExternalStore(subscribe, getUploaded, getUploaded)
  return useMemo(() => {
    const known = new Set(options.map((option) => option.id))
    return [...extra.filter((option) => !known.has(option.id)), ...options]
  }, [extra, options])
}

/**
 * Picks one Media image (or none). The field shows the choice; clicking it
 * opens a dialog with the Media library, where an image can also be uploaded
 * (by button or by dropping a file) and is chosen as soon as it is in.
 */
export function MediaSelect({
  id,
  value,
  options,
  onChange,
  "aria-describedby": describedById,
  "aria-invalid": invalid,
}: {
  id: string
  value: number | null
  options: MediaOption[]
  onChange: (value: number | null) => void
  /** From `describedBy()`: the FormField's description and error. */
  "aria-describedby"?: string
  "aria-invalid"?: true
}) {
  const all = useAllOptions(options)
  const [open, setOpen] = useState(false)
  const chosen = all.find((option) => option.id === value)
  const label =
    value === null ? "Choose image" : (chosen?.label ?? `Image #${value}`)
  return (
    <div className="flex max-w-sm items-center gap-2">
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-describedby={describedById}
        aria-invalid={invalid}
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-md border p-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive",
          value === null && "border-dashed text-muted-foreground"
        )}
      >
        <Thumbnail url={chosen?.url ?? null} className="size-12" />
        <span className="min-w-0 truncate">{label}</span>
      </button>
      {value !== null && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove image"
          onClick={() => onChange(null)}
        >
          <XIcon />
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <MediaPicker
            options={all}
            value={value}
            onPick={(picked) => {
              onChange(picked)
              setOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Thumbnail({
  url,
  className,
}: {
  url: string | null
  className?: string
}) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={cn("shrink-0 rounded-md border object-cover", className)}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border border-dashed bg-muted text-muted-foreground",
        className
      )}
    >
      <ImageIcon className="size-4" />
    </span>
  )
}

/** The dialog's contents: the library, or the upload step once a file is in. */
function MediaPicker({
  options,
  value,
  onPick,
}: {
  options: MediaOption[]
  value: number | null
  onPick: (id: number) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const take = (candidate: File | undefined) => {
    if (!candidate) return
    if (!IMAGE_TYPES.includes(candidate.type)) {
      setProblem(WRONG_TYPE)
      return
    }
    setProblem(null)
    setFile(candidate)
  }

  if (file) {
    return (
      <UploadStep
        file={file}
        onBack={() => setFile(null)}
        onUploaded={(media) => {
          addUploaded(media)
          onPick(media.id)
        }}
      />
    )
  }

  const needle = query.trim().toLowerCase()
  const shown = needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options
  const drop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    take(event.dataTransfer.files[0])
  }
  return (
    <div
      className="flex min-w-0 flex-col gap-4"
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
    >
      <DialogHeader>
        <DialogTitle>Choose an image</DialogTitle>
        <DialogDescription>
          Pick one from Media, or upload a new one. You can also drop a file
          here.
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-2 pr-8">
        <Input
          type="search"
          aria-label="Search images"
          placeholder="Search images"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="button" onClick={() => fileInput.current?.click()}>
          <UploadIcon /> Upload
        </Button>
        <input
          ref={fileInput}
          type="file"
          aria-label="Image to upload"
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            take(event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </div>
      {problem && <InlineError>{problem}</InlineError>}
      <div
        className={cn(
          "max-h-[55vh] min-h-40 overflow-y-auto rounded-md border p-2",
          dragging && "border-dashed border-ring bg-muted"
        )}
      >
        {shown.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {options.length === 0
              ? "No images yet. Upload one to get started."
              : `No images match “${query.trim()}”.`}
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {shown.map((option) => (
              <li key={option.id} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={option.id === value}
                  title={option.label}
                  onClick={() => onPick(option.id)}
                  className="flex w-full flex-col gap-1 rounded-md border border-transparent p-1 text-left outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-ring aria-pressed:bg-muted"
                >
                  <Thumbnail
                    url={option.url}
                    className="aspect-square w-full"
                  />
                  <span className="truncate text-xs">{option.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Asks for the alt text of a chosen file, then uploads it. */
function UploadStep({
  file,
  onBack,
  onUploaded,
}: {
  file: File
  onBack: () => void
  onUploaded: (media: MediaOption) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [state, setState] = useState<Awaited<ReturnType<typeof uploadMedia>>>(
    {}
  )
  useEffect(() => {
    const reader = new FileReader()
    reader.onload = () => setPreview(String(reader.result))
    reader.readAsDataURL(file)
    return () => reader.abort()
  }, [file])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // The dialog sits inside the screen's own form in some editors.
    event.stopPropagation()
    const formData = new FormData(event.currentTarget)
    formData.set("file", file)
    setPending(true)
    try {
      const result = await uploadMedia({}, formData)
      if (result.ok && result.media) {
        notify.success(result.message ?? "Uploaded.")
        onUploaded(result.media)
        return
      }
      setState(result)
    } catch {
      setState({ ok: false, message: "The upload failed. Please try again." })
    }
    setPending(false)
  }

  const errors = state.fieldErrors ?? {}
  const fileError = errors.file ?? (errors.alt ? undefined : state.message)
  return (
    <form onSubmit={submit} className="flex min-w-0 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Upload image</DialogTitle>
        <DialogDescription>{file.name}</DialogDescription>
      </DialogHeader>
      {state.ok === false && fileError && (
        <InlineError>{fileError}</InlineError>
      )}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Thumbnail url={preview} className="size-32" />
        <div className="min-w-0 flex-1">
          <FormField
            id="media-upload-alt"
            label="Alt text"
            description="Describe what the image shows for people who can't see it."
            error={errors.alt}
          >
            <Input
              id="media-upload-alt"
              name="alt"
              required
              autoFocus
              {...describedBy("media-upload-alt", {
                description: true,
                error: errors.alt,
              })}
            />
          </FormField>
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onBack}
        >
          Back
        </Button>
        <Button type="submit" disabled={pending}>
          <UploadIcon /> {pending ? "Uploading…" : "Upload"}
        </Button>
      </DialogFooter>
    </form>
  )
}
