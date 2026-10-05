"use client"

import { useEffect, useId, useState, type FormEvent } from "react"
// New Page is offered on the Admin's lists and Dashboard, which hold nothing
// unsaved, so this is the plain router, not the guarded one.
// eslint-disable-next-line no-restricted-imports
import { useRouter } from "next/navigation"
import { PlusIcon } from "lucide-react"

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
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"

import { checkPagePath, defaultPagePath } from "../../../collections/Pages/path"
import { pagePathTaken } from "../../actions/pages"
import { listPageTemplates } from "../../actions/pageTemplates"
import { InlineError } from "../../kit"
import type { PageTemplateRow } from "../../pageTemplates"
import { describedBy, FormField } from "../FormBits"
import { blocksSummary, newPageHref } from "./summary"

const BLANK = ""

/**
 * New Page: asks for the Title and the Path (which follows the Title until it
 * is edited by hand, and is checked as it is typed and for clashes on submit)
 * and whether to start blank or from a Page Template, then opens the Visual
 * Editor with those. The Page is still not created until its first Save.
 *
 * Every New Page entry point uses it. `templates` is what the caller already
 * has; without it the dialog looks the Page Templates up when it opens.
 * `initialTemplateId` starts it on one Page Template (the Page Templates list).
 */
export function NewPageButton({
  templates,
  initialTemplateId,
  label = "New Page",
  ariaLabel,
  variant,
  size,
}: {
  templates?: readonly PageTemplateRow[]
  initialTemplateId?: number
  label?: string
  ariaLabel?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm"
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
      >
        <PlusIcon aria-hidden="true" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <NewPageForm
            templates={templates}
            initialTemplateId={initialTemplateId}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

/** The dialog's body; it is only mounted while the dialog is open. */
function NewPageForm({
  templates: given,
  initialTemplateId,
}: {
  templates?: readonly PageTemplateRow[]
  initialTemplateId?: number
}) {
  const router = useRouter()
  const id = useId()
  const [looked, setLooked] = useState<readonly PageTemplateRow[]>([])
  const templates = given ?? looked
  const [title, setTitle] = useState("")
  const [path, setPath] = useState("")
  // Once the User writes the Path themselves it no longer follows the Title.
  const [pathEdited, setPathEdited] = useState(false)
  const [template, setTemplate] = useState(
    initialTemplateId === undefined ? BLANK : String(initialTemplateId)
  )
  const [titleError, setTitleError] = useState<string>()
  const [clash, setClash] = useState<string>()
  const [failure, setFailure] = useState<string>()
  const [pending, setPending] = useState(false)
  // An empty Path is only an error once the User has tried to continue.
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (given) return
    let current = true
    listPageTemplates().then(
      (rows) => current && setLooked(rows),
      () => undefined // Blank is still there to start from.
    )
    return () => {
      current = false
    }
  }, [given])

  const shape = path === "" && !tried ? true : checkPagePath(path)
  const pathError = clash ?? (shape === true ? undefined : shape)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const name = title.trim()
    const wanted = path
    setTried(true)
    if (name === "") setTitleError("A title is required.")
    if (name === "" || checkPagePath(wanted) !== true) {
      focusField(name === "" ? "title" : "path")
      return
    }
    setPending(true)
    setFailure(undefined)
    try {
      if (await pagePathTaken(wanted)) {
        setClash("Another Page uses this path.")
        setPending(false)
        focusField("path")
        return
      }
      const chosen = templates.some((row) => String(row.id) === template)
        ? Number(template)
        : null
      // Stays pending: the dialog goes away with the navigation, and a second
      // click meanwhile must not push again.
      router.push(
        newPageHref({ title: name, path: wanted, templateId: chosen })
      )
    } catch {
      setFailure("Something went wrong. Please try again.")
      setPending(false)
    }
  }

  const focusField = (field: "title" | "path") =>
    document.getElementById(`${id}-${field}`)?.focus()

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>New Page</DialogTitle>
        <DialogDescription>
          Name the Page and choose where it lives. It is not created until you
          save it.
        </DialogDescription>
      </DialogHeader>

      <FormField id={`${id}-title`} label="Title" error={titleError}>
        <Input
          id={`${id}-title`}
          value={title}
          autoFocus
          autoComplete="off"
          onChange={(event) => {
            const next = event.target.value
            setTitle(next)
            setTitleError(undefined)
            if (!pathEdited) {
              setPath(defaultPagePath(next) ?? "")
              setClash(undefined)
            }
          }}
          {...describedBy(`${id}-title`, { error: titleError })}
        />
      </FormField>

      <FormField
        id={`${id}-path`}
        label="Path"
        description='Where the Page lives on the Site: "/" for Home, "/about".'
        error={pathError}
      >
        <Input
          id={`${id}-path`}
          value={path}
          autoComplete="off"
          spellCheck={false}
          placeholder="/about"
          onChange={(event) => {
            setPath(event.target.value)
            setPathEdited(true)
            setClash(undefined)
          }}
          {...describedBy(`${id}-path`, {
            description: true,
            error: pathError,
          })}
        />
      </FormField>

      <FormField
        id={`${id}-template`}
        label="Start from"
        description={
          template === BLANK
            ? "A Hero, ready to fill in."
            : "A copy of the Page Template's Blocks and Layout choice."
        }
      >
        <NativeSelect
          id={`${id}-template`}
          className="w-full"
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
          {...describedBy(`${id}-template`, { description: true })}
        >
          <NativeSelectOption value={BLANK}>Blank Page</NativeSelectOption>
          {templates.map((row) => (
            <NativeSelectOption key={row.id} value={String(row.id)}>
              {`${row.name} (${blocksSummary(row.blocks)})`}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>

      {failure && <InlineError>{failure}</InlineError>}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Continue
        </Button>
      </DialogFooter>
    </form>
  )
}
