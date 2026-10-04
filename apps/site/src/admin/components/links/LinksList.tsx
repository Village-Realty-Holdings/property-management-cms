"use client"

import { useMemo, useState, type FormEvent } from "react"
import Link from "next/link"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  RadioGroup,
  RadioGroupButton,
} from "@workspace/ui/components/radio-group"
import { Switch } from "@workspace/ui/components/switch"

import { applyLinkReplace, previewLinkReplace } from "../../actions/replace"
import { EmptyState, InlineError, notify, PageHeader } from "../../kit"
import { isBroken, type LinkRow } from "../../links/screen"
import type { ReplacePreview, ReplaceResult } from "../../replace/run"
import { describedBy, FormField, Section } from "../FormBits"
import { ReplaceOutcomes, ReplaceReview } from "../replace/ReplaceReview"

const FILTERS = ["All", "Internal", "External", "Broken"] as const
type Filter = (typeof FILTERS)[number]

const KINDS: Record<LinkRow["kind"], string> = {
  internal: "Internal",
  external: "External",
  contact: "Email or phone",
  anchor: "Anchor",
}

const STATUS: Record<LinkRow["status"], string> = {
  ok: "Works",
  unpublished: "Not published",
  missing: "Broken",
  unchecked: "Not checked",
}

const matches = (row: LinkRow, filter: Filter) =>
  filter === "All" ||
  (filter === "Internal" && row.kind === "internal") ||
  (filter === "External" && row.kind === "external") ||
  (filter === "Broken" && isBroken(row))

const plural = (count: number, one: string) =>
  `${count} ${count === 1 ? one : `${one}s`}`

/**
 * The Links tool: every link on the Site, one row per target, with where each
 * is used. The list filters by kind and by a search; a URL can be replaced
 * everywhere it is used, with the same preview and Draft-or-publish choice as
 * Replace Text.
 */
export function LinksList({ rows }: { rows: LinkRow[] }) {
  const [filter, setFilter] = useState<Filter>("All")
  const [search, setSearch] = useState("")
  const [replacing, setReplacing] = useState<LinkRow | null>(null)

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((name) => [
          name,
          rows.filter((row) => matches(row, name)).length,
        ])
      ) as Record<Filter, number>,
    [rows]
  )
  const shown = useMemo(() => {
    const words = search.trim().toLowerCase()
    return rows.filter(
      (row) =>
        matches(row, filter) &&
        (!words ||
          row.target.toLowerCase().includes(words) ||
          row.uses.some((use) => use.title.toLowerCase().includes(words)))
    )
  }, [rows, filter, search])

  return (
    <>
      <PageHeader
        title="Links"
        description="Every link on your Pages and Layouts: where it leads, where it is used, and whether it still works."
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No links yet"
          description="Links appear here when a Page or a Layout has a button, a menu item or a link in its text."
          action={
            <Link href="/admin/pages" className="underline underline-offset-4">
              Go to Pages
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {replacing && (
            <ReplaceLink
              key={replacing.key}
              row={replacing}
              onClose={() => setReplacing(null)}
            />
          )}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <RadioGroup
              aria-label="Show"
              value={filter}
              onValueChange={(value) => setFilter(value as Filter)}
              className="flex w-auto flex-wrap gap-2"
            >
              {FILTERS.map((name) => (
                <RadioGroupButton key={name} value={name}>
                  {name} ({counts[name]})
                </RadioGroupButton>
              ))}
            </RadioGroup>
            <div className="flex w-full max-w-xs flex-col gap-1.5">
              <Label htmlFor="links-search">Search</Label>
              <Input
                id="links-search"
                type="search"
                value={search}
                placeholder="A URL, or a Page or Layout"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            {plural(shown.length, "link")} shown
            {shown.length === rows.length ? "" : ` of ${rows.length}`}. Internal
            links are checked against your Pages; links that leave the Site are
            not checked.
          </p>
          {shown.length > 0 && (
            <div className="overflow-x-auto rounded-xl border bg-background">
              <table className="w-full text-sm">
                <caption className="sr-only">Links</caption>
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Link
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Used in
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b align-top last:border-0"
                    >
                      <th
                        scope="row"
                        className="max-w-xs px-4 py-3 text-left font-medium"
                      >
                        <span className="break-all">{row.target}</span>
                        <span className="block font-normal text-muted-foreground">
                          {KINDS[row.kind]}
                        </span>
                      </th>
                      <td className="px-4 py-3">
                        <Badge
                          variant={isBroken(row) ? "destructive" : "outline"}
                        >
                          {STATUS[row.status]}
                        </Badge>
                        {row.problem && (
                          <p className="mt-1 text-muted-foreground">
                            {row.problem}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <details>
                          <summary className="cursor-pointer">
                            {plural(row.uses.length, "place")}
                          </summary>
                          <ul className="mt-2 flex flex-col gap-1.5">
                            {row.uses.map((use, index) => (
                              <li key={index}>
                                <Link
                                  href={use.href}
                                  className="font-medium underline underline-offset-4"
                                >
                                  {use.title}
                                </Link>{" "}
                                <span className="text-muted-foreground">
                                  {use.kind}, {use.place}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.url !== null && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`Replace ${row.target}`}
                            onClick={() => setReplacing(row)}
                          >
                            Replace…
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}

/** Points every use of one URL at another: preview, then replace. */
function ReplaceLink({ row, onClose }: { row: LinkRow; onClose: () => void }) {
  const [to, setTo] = useState("")
  const [includeTemplates, setIncludeTemplates] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const [preview, setPreview] = useState<ReplacePreview>()
  const [result, setResult] = useState<ReplaceResult>()
  const swap = { from: row.url, to, includeTemplates }

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
      const found = await previewLinkReplace(swap)
      if (found.ok) setPreview(found.preview)
      else setError(found.message)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Section
      title="Replace a link"
      description="Every button, menu item and link in text that leads to the first link will lead to the second."
      actions={
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="text-sm">
          <span className="text-muted-foreground">Replace</span>{" "}
          <span className="font-medium break-all">{row.url}</span>
        </p>
        <FormField
          id="link-to"
          label="With"
          description='A Site path like "/about", or a full https:// URL.'
          error={error}
        >
          <Input
            id="link-to"
            value={to}
            autoFocus
            onChange={(event) => edit(setTo)(event.target.value)}
            {...describedBy("link-to", { description: true, error })}
          />
        </FormField>
        <div className="flex items-center gap-2">
          <Switch
            id="link-include-templates"
            checked={includeTemplates}
            onCheckedChange={(checked) =>
              edit(setIncludeTemplates)(checked === true)
            }
            aria-describedby="link-include-templates-description"
          />
          <div>
            <Label htmlFor="link-include-templates">
              Include Page Templates
            </Label>
            <p
              id="link-include-templates-description"
              className="text-sm text-muted-foreground"
            >
              Off, Page Templates are left as they are.
            </p>
          </div>
        </div>
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Looking…" : "Preview"}
          </Button>
        </div>
      </form>
      {preview && !result && (
        <ReplaceReview
          preview={preview}
          unit="use"
          what={`Replace “${row.url}” with “${to.trim()}”?`}
          onApply={(mode) => applyLinkReplace(swap, mode)}
          onDone={(done) => {
            setResult(done)
            setPreview(undefined)
            // The action refreshed the list: the rows above are already new.
            if (done.ok) notify.success(done.message)
          }}
        />
      )}
      {result && <ReplaceOutcomes result={result} />}
      {result && !result.ok && result.outcomes.length === 0 && (
        <InlineError>{result.message}</InlineError>
      )}
    </Section>
  )
}
