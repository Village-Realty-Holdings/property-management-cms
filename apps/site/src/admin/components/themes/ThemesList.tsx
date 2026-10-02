"use client"

import { useRef, useState, type FormEvent } from "react"
import Link from "next/link"

import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"

import {
  applyTheme,
  deleteSavedTheme,
  exportTheme,
  importTheme,
  renameSavedTheme,
  saveCurrentTheme,
} from "../../actions/savedThemes"
import type { FormState } from "../../formState"
import {
  ConfirmDialog,
  EmptyState,
  InlineError,
  notify,
  PageHeader,
} from "../../kit"
import { IMPORT_MAX_BYTES, NAME_MAX, type ThemeCard } from "../../savedThemes"
import { describedBy, FormField } from "../FormBits"

const FAILED = "Something went wrong. Please try again."

/** Hands the browser a file to save. */
function download(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

type Naming = { kind: "save" } | { kind: "rename"; card: ThemeCard }

/**
 * The Themes screen: the Saved Themes and the built-in presets as cards.
 * Applying one replaces the Site's Theme at once, so it asks first. A Theme
 * can be exported as a file and a file imported as a Saved Theme.
 */
export function ThemesList({ cards }: { cards: ThemeCard[] }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [applying, setApplying] = useState<ThemeCard | null>(null)
  const [deleting, setDeleting] = useState<ThemeCard | null>(null)
  const [naming, setNaming] = useState<Naming | null>(null)
  const [error, setError] = useState<string>()

  /** Runs an action from a button: a toast on success, the reason inline. */
  async function run(action: () => Promise<FormState>) {
    setError(undefined)
    try {
      const result = await action()
      if (result.ok) notify.success(result.message ?? "Done")
      else setError(result.message || FAILED)
    } catch {
      setError(FAILED)
    }
  }

  async function exportCard(card: ThemeCard) {
    setError(undefined)
    try {
      const result = await exportTheme(card.id)
      if (result.ok) download(result.filename, result.json)
      else setError(result.message)
    } catch {
      setError(FAILED)
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return
    if (file.size > IMPORT_MAX_BYTES) {
      setError("That file is too large to be a Theme.")
      return
    }
    const text = await file.text()
    await run(() => importTheme(text))
  }

  const groups = (["Saved", "General", "Brand"] as const)
    .map((kind) => ({
      kind,
      title:
        kind === "Saved"
          ? "Saved Themes"
          : kind === "General"
            ? "Built-in"
            : "Brand",
      cards: cards.filter((card) => card.kind === kind),
    }))
    .filter((group) => group.cards.length > 0 || group.kind === "Saved")

  return (
    <>
      <PageHeader
        title="Themes"
        description="Themes you can apply to your Site: the built-in ones and the ones you save."
        action={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInput.current?.click()}
            >
              Import
            </Button>
            <Button type="button" onClick={() => setNaming({ kind: "save" })}>
              Save current Theme
            </Button>
          </>
        }
      />
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        aria-label="Theme file to import"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          void importFile(file)
        }}
      />
      <div className="flex flex-col gap-8">
        {error && <InlineError>{error}</InlineError>}
        <p className="text-sm text-muted-foreground">
          Your Site has one Theme. Applying a Theme here replaces it, and the
          one before stays in the Theme’s history.{" "}
          <Link href="/admin/theme" className="underline underline-offset-4">
            Edit the Theme
          </Link>
        </p>
        {groups.map((group) => (
          <section
            key={group.kind}
            aria-labelledby={`themes-${group.kind}`}
            className="flex flex-col gap-3"
          >
            <h2 id={`themes-${group.kind}`} className="text-base font-semibold">
              {group.title}
            </h2>
            {group.cards.length === 0 ? (
              <EmptyState
                title="No Saved Themes yet"
                description="Keep your Site’s Theme here under a name, or import a Theme file."
                action={
                  <Button
                    type="button"
                    onClick={() => setNaming({ kind: "save" })}
                  >
                    Save current Theme
                  </Button>
                }
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.cards.map((card) => (
                  <li
                    key={card.id}
                    aria-label={card.name}
                    className="flex flex-col gap-3 rounded-xl border bg-background p-4"
                  >
                    <div className="flex h-10 overflow-hidden rounded-md border">
                      {card.swatches.map((swatch) => (
                        <span
                          key={swatch.name}
                          title={`${swatch.name} ${swatch.hex}`}
                          className="flex-1"
                          style={{ backgroundColor: swatch.hex }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{card.name}</h3>
                        {card.live && <Badge>Live</Badge>}
                      </div>
                      {card.blurb && (
                        <p className="text-sm text-muted-foreground">
                          {card.blurb}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {card.fonts}
                      </p>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2">
                      {card.live ? (
                        <Link
                          href="/admin/theme"
                          className={buttonVariants({ size: "sm" })}
                          aria-label={`Edit ${card.name}`}
                        >
                          Edit
                        </Link>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          aria-label={`Apply ${card.name}`}
                          onClick={() => setApplying(card)}
                        >
                          Apply
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Export ${card.name}`}
                        onClick={() => exportCard(card)}
                      >
                        Export
                      </Button>
                      {card.kind === "Saved" && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`Rename ${card.name}`}
                            onClick={() => setNaming({ kind: "rename", card })}
                          >
                            Rename
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`Delete ${card.name}`}
                            onClick={() => setDeleting(card)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={applying !== null}
        onOpenChange={(open) => !open && setApplying(null)}
        title={`Apply “${applying?.name}”?`}
        description="It replaces your Site’s Theme straight away. The Theme you have now stays in the Theme’s history, where it can be restored."
        showDependents={false}
        confirmLabel="Apply Theme"
        confirmVariant="default"
        onConfirm={async () => {
          const result = await applyTheme(applying!.id)
          if (result.ok) notify.success(result.message ?? "Applied")
          return result
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete the Saved Theme “${deleting?.name}”?`}
        description="This cannot be undone. Your Site’s Theme does not change."
        showDependents={false}
        confirmLabel="Delete Saved Theme"
        onConfirm={async () => {
          const result = await deleteSavedTheme(deleting!.id)
          if (result.ok) notify.success(result.message ?? "Deleted")
          return result
        }}
      />
      {naming && (
        <NameDialog
          key={naming.kind === "rename" ? naming.card.id : "save"}
          naming={naming}
          onClose={() => setNaming(null)}
        />
      )}
    </>
  )
}

/** Asks for a Saved Theme's name: to save the current Theme, or to rename one. */
function NameDialog({
  naming,
  onClose,
}: {
  naming: Naming
  onClose: () => void
}) {
  const renaming = naming.kind === "rename"
  const [name, setName] = useState(renaming ? naming.card.name : "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    try {
      const result = renaming
        ? await renameSavedTheme(naming.card.id, name)
        : await saveCurrentTheme(name)
      if (!result.ok) {
        setError(result.message || FAILED)
        return
      }
      notify.success(result.message ?? "Saved")
      onClose()
    } catch {
      setError(FAILED)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {renaming ? "Rename Saved Theme" : "Save current Theme"}
            </DialogTitle>
            <DialogDescription>
              {renaming
                ? "The name it has in this list."
                : "Keeps your Site’s Theme, as it is now, in this list."}
            </DialogDescription>
          </DialogHeader>
          <FormField id="theme-name" label="Name" error={error}>
            <Input
              id="theme-name"
              value={name}
              maxLength={NAME_MAX}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              {...describedBy("theme-name", { error })}
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : renaming ? "Rename" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
