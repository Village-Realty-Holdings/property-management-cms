"use client"

import { useEffect, useRef, useState } from "react"
import type { Field } from "payload"
import { fieldAffectsData } from "payload/shared"
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  FieldDescription,
  FieldError,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"

import { fieldId, useFields } from "./context"
import {
  CheckboxControl,
  IconControl,
  NumberControl,
  PageControl,
  RadioControl,
  SelectControl,
  TextControl,
  Unsupported,
  UploadControl,
} from "./controls"
import {
  descriptionOf,
  isIconField,
  isVisible,
  labelOf,
  valueOrDefault,
} from "./schema"
import { validateField } from "./validate"
import { emptyRowFor, type Segment } from "./values"

type Values = Record<string, unknown>

const asValues = (value: unknown): Values =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Values)
    : {}

/**
 * The settings form for a list of Payload fields: one control per field, in
 * order, skipping those whose condition says they do not apply. `path` is
 * where the fields live in the Block; `sibling` is the values stored there.
 */
export function FieldList({
  fields,
  path,
  sibling,
}: {
  fields: readonly Field[]
  path: readonly Segment[]
  sibling: Values
}) {
  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => (
        <FieldItem
          key={"name" in field ? field.name : `${field.type}-${index}`}
          field={field}
          path={path}
          sibling={sibling}
        />
      ))}
    </div>
  )
}

function FieldItem({
  field,
  path,
  sibling,
}: {
  field: Field
  path: readonly Segment[]
  sibling: Values
}) {
  const env = useFields()
  if (!isVisible(field, env.block, sibling)) return null

  if (!fieldAffectsData(field)) {
    if (field.type === "row") {
      return <FieldList fields={field.fields} path={path} sibling={sibling} />
    }
    if (field.type === "collapsible") {
      return (
        <Group
          label={typeof field.label === "string" ? field.label : ""}
          description={undefined}
        >
          <FieldList fields={field.fields} path={path} sibling={sibling} />
        </Group>
      )
    }
    if (field.type === "ui") return null
    return (
      <Unsupported
        field={field}
        note="this kind of field can't be edited in the Block tab."
      />
    )
  }

  const fieldPath = [...path, field.name]
  const value = valueOrDefault(field, sibling[field.name])
  const touched = env.touched.has(fieldPath.join("."))
  const error = touched
    ? validateField(field, value, { data: env.block, siblingData: sibling })
    : null
  const leaf = { path: fieldPath, value, error }

  switch (field.type) {
    case "text":
      return isIconField(field) ? (
        <IconControl field={field} {...leaf} />
      ) : (
        <TextControl field={field} {...leaf} />
      )
    case "textarea":
    case "email":
      return <TextControl field={field} {...leaf} />
    case "number":
      return <NumberControl field={field} {...leaf} />
    case "select":
      return <SelectControl field={field} {...leaf} />
    case "radio":
      return <RadioControl field={field} {...leaf} />
    case "checkbox":
      return <CheckboxControl field={field} {...leaf} />
    case "upload":
      return field.relationTo === "media" ? (
        <UploadControl field={field} {...leaf} />
      ) : (
        <Unsupported field={field} note="only Media can be picked here." />
      )
    case "relationship":
      return field.relationTo === "pages" && !field.hasMany ? (
        <PageControl field={field} {...leaf} />
      ) : (
        <Unsupported field={field} note="only one Page can be picked here." />
      )
    case "group":
      return (
        <Group label={labelOf(field)} description={descriptionOf(field)}>
          <FieldList
            fields={field.fields}
            path={fieldPath}
            sibling={asValues(value)}
          />
        </Group>
      )
    case "array":
      return <ArrayControl field={field} {...leaf} />
    case "richText":
      return (
        <p className="text-sm text-muted-foreground">
          {labelOf(field)} is edited on the page itself: click the text.
        </p>
      )
    default:
      return (
        <Unsupported
          field={field}
          note="this kind of field can't be edited in the Block tab."
        />
      )
  }
}

function Group({
  label,
  description,
  children,
}: {
  label: string
  description: string | undefined
  children: React.ReactNode
}) {
  return (
    <FieldSet className="gap-3 rounded-lg border p-3">
      {label && (
        <FieldLegend variant="label" className="px-1">
          {label}
        </FieldLegend>
      )}
      {description && <FieldDescription>{description}</FieldDescription>}
      {children}
    </FieldSet>
  )
}

type ArrayField = Extract<Field, { type: "array" }>

/** Where focus goes after the array changes: a row's control, or its Add button. */
type Focus = { row: number; control: "first" | "up" | "down" } | "add"

function ArrayControl({
  field,
  path,
  value,
  error,
}: {
  field: ArrayField
  path: readonly Segment[]
  value: unknown
  error: string | null
}) {
  const env = useFields()
  const rows = Array.isArray(value) ? (value as unknown[]) : []
  const id = fieldId(env, path)
  const rowLabel =
    typeof field.labels?.singular === "string" ? field.labels.singular : "Item"
  const max = field.maxRows
  const min = field.minRows ?? 0
  const description = descriptionOf(field)
  const label = labelOf(field)
  const root = useRef<HTMLFieldSetElement>(null)
  // Set with an edit; acted on once the edit has rendered.
  const pendingFocus = useRef<Focus | null>(null)
  const [announcement, setAnnouncement] = useState("")

  useEffect(() => {
    const focus = pendingFocus.current
    if (!focus) return
    pendingFocus.current = null
    const scope = root.current
    if (scope) {
      const row = focus === "add" ? "" : `[data-row="${id}-${focus.row}"] `
      const wanted =
        focus === "add"
          ? `[data-add="${id}"]`
          : focus.control === "first"
            ? `${row}:is(input, select, textarea, button[aria-haspopup])`
            : `${row}[data-row-control="${focus.control}"]:not(:disabled)`
      // A moved row may be first or last, which disables one of its buttons.
      const target =
        scope.querySelector<HTMLElement>(wanted) ??
        scope.querySelector<HTMLElement>(
          `${row}[data-row-control]:not(:disabled)`
        )
      target?.focus()
    }
  })

  const commit = (next: unknown[], message: string) => {
    env.touch(path)
    env.write(path, next)
    setAnnouncement(message)
  }

  const add = () => {
    commit(
      [...rows, emptyRowFor(field.fields)],
      `${rowLabel} ${rows.length + 1} added.`
    )
    pendingFocus.current = { row: rows.length, control: "first" }
  }
  const remove = (index: number) => {
    commit(
      rows.filter((_, i) => i !== index),
      `${rowLabel} ${index + 1} removed.`
    )
    pendingFocus.current = "add"
  }
  const move = (index: number, to: number) => {
    const next = [...rows]
    const [row] = next.splice(index, 1)
    next.splice(to, 0, row)
    commit(next, `${rowLabel} moved to position ${to + 1} of ${rows.length}.`)
    pendingFocus.current = { row: to, control: to < index ? "up" : "down" }
  }

  return (
    <FieldSet
      ref={root}
      className="gap-3"
      data-invalid={error ? true : undefined}
      aria-describedby={
        [description && `${id}-description`, error && `${id}-error`]
          .filter(Boolean)
          .join(" ") || undefined
      }
    >
      <FieldLegend variant="label">{label}</FieldLegend>
      {description && (
        <FieldDescription id={`${id}-description`}>
          {description}
        </FieldDescription>
      )}
      {rows.length > 0 && (
        <ol className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const rowValues = asValues(row)
            const rowPath = [...path, index]
            const name = `${rowLabel} ${index + 1}`
            return (
              <li
                key={typeof rowValues.id === "string" ? rowValues.id : index}
                data-row={`${id}-${index}`}
              >
                <FieldSet className="gap-3 rounded-lg border p-3">
                  <FieldLegend variant="label" className="mb-0 px-1">
                    {name}
                  </FieldLegend>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      data-row-control="up"
                      aria-label={`Move ${name} up in ${label}`}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      data-row-control="down"
                      aria-label={`Move ${name} down in ${label}`}
                      disabled={index === rows.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      data-row-control="remove"
                      aria-label={`Remove ${name} from ${label}`}
                      disabled={rows.length <= min}
                      onClick={() => remove(index)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  <FieldList
                    fields={field.fields}
                    path={rowPath}
                    sibling={rowValues}
                  />
                </FieldSet>
              </li>
            )
          })}
        </ol>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-add={id}
          aria-label={`Add ${rowLabel.toLowerCase()} to ${label}`}
          disabled={max != null && rows.length >= max}
          onClick={add}
        >
          <PlusIcon /> Add {rowLabel.toLowerCase()}
        </Button>
        <span className="text-xs text-muted-foreground">
          {rows.length}
          {max != null ? ` of ${max}` : ""}
          {min > 0 ? `, at least ${min}` : ""}
        </span>
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </FieldSet>
  )
}
