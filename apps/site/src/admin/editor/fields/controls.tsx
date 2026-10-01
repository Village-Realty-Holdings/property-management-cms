"use client"

import { useEffect, useRef, useState } from "react"
import type { Field } from "payload"
import { optionIsObject } from "payload/shared"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Field as FieldBox,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"

import { describedBy, FormField } from "../../components/FormBits"
import { MediaSelect } from "../../components/MediaSelect"
import { fieldId, useFields, type FieldsEnv } from "./context"
import { IconSelect } from "./IconSelect"
import { PageSelect } from "./PageSelect"
import { descriptionOf, isReadOnly, labelOf } from "./schema"
import type { Segment } from "./values"

/**
 * The controls for the leaf fields of a Block: one component per Payload
 * field type. Each shows its own label, description and error, and writes
 * through the Block tab's `write` the moment it changes.
 */

type LeafProps<F extends Field = Field> = {
  field: F
  path: readonly Segment[]
  /** The field's value, or its default when the Block has none stored. */
  value: unknown
  /** The problem to show, or null. */
  error: string | null
}

type Option = { label: string; value: string }

const toOptions = (options: readonly unknown[]): Option[] =>
  options.map((option) =>
    optionIsObject(option as never)
      ? {
          label: String((option as { label: unknown }).label),
          value: String((option as { value: unknown }).value),
        }
      : { label: String(option), value: String(option) }
  )

/** Wires a control to its change and blur, which mark the field as touched. */
function useControl(env: FieldsEnv, path: readonly Segment[]) {
  return {
    id: fieldId(env, path),
    change: (value: unknown) => {
      env.touch(path)
      env.write(path, value)
    },
    blur: () => env.touch(path),
  }
}

const textOf = (value: unknown) => (typeof value === "string" ? value : "")

export function TextControl({
  field,
  path,
  value,
  error,
}: LeafProps<Extract<Field, { type: "text" | "textarea" | "email" }>>) {
  const env = useFields()
  const { id, change, blur } = useControl(env, path)
  const description = descriptionOf(field)
  const placeholder = (field.admin as { placeholder?: unknown } | undefined)
    ?.placeholder
  const common = {
    id,
    value: textOf(value),
    disabled: isReadOnly(field),
    placeholder: typeof placeholder === "string" ? placeholder : undefined,
    onBlur: blur,
    ...describedBy(id, { description, error: error ?? undefined }),
  }
  return (
    <FormField
      id={id}
      label={labelOf(field)}
      description={description}
      error={error ?? undefined}
    >
      {field.type === "textarea" ? (
        <Textarea {...common} onChange={(e) => change(e.target.value)} />
      ) : (
        <Input
          {...common}
          type={field.type === "email" ? "email" : "text"}
          onChange={(e) => change(e.target.value)}
        />
      )}
    </FormField>
  )
}

/** A text field that picks a Lucide icon by name. */
export function IconControl({
  field,
  path,
  value,
  error,
}: LeafProps<Extract<Field, { type: "text" }>>) {
  const env = useFields()
  const { id, change } = useControl(env, path)
  const description = descriptionOf(field)
  return (
    <FormField
      id={id}
      label={labelOf(field)}
      description={description}
      error={error ?? undefined}
    >
      <IconSelect
        label={labelOf(field)}
        id={id}
        value={textOf(value)}
        required={field.required === true}
        disabled={isReadOnly(field)}
        onChange={change}
        {...describedBy(id, { description, error: error ?? undefined })}
      />
    </FormField>
  )
}

export function NumberControl({
  field,
  path,
  value,
  error,
}: LeafProps<Extract<Field, { type: "number" }>>) {
  const env = useFields()
  const { id, change, blur } = useControl(env, path)
  const description = descriptionOf(field)
  return (
    <FormField
      id={id}
      label={labelOf(field)}
      description={description}
      error={error ?? undefined}
    >
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={field.min}
        max={field.max}
        step={field.admin?.step}
        value={value === null || value === undefined ? "" : String(value)}
        disabled={isReadOnly(field)}
        onBlur={blur}
        onChange={(e) =>
          change(e.target.value === "" ? null : Number(e.target.value))
        }
        {...describedBy(id, { description, error: error ?? undefined })}
      />
    </FormField>
  )
}

export function SelectControl({
  field,
  path,
  value,
  error,
}: LeafProps<Extract<Field, { type: "select" }>>) {
  const env = useFields()
  const { id, change, blur } = useControl(env, path)
  const description = descriptionOf(field)
  const current = textOf(value)
  const options = toOptions(field.options)
  return (
    <FormField
      id={id}
      label={labelOf(field)}
      description={description}
      error={error ?? undefined}
    >
      <NativeSelect
        id={id}
        className="w-full"
        value={current}
        disabled={isReadOnly(field)}
        onBlur={blur}
        onChange={(e) => change(e.target.value)}
        {...describedBy(id, { description, error: error ?? undefined })}
      >
        {(current === "" || field.required !== true) && (
          <NativeSelectOption value="">
            {field.required ? "Choose…" : "None"}
          </NativeSelectOption>
        )}
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </FormField>
  )
}

const valuesOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : []

/**
 * A select that takes many: a tick for each option, and, once two or more are
 * ticked, the chosen ones in a list that can be reordered. The order the
 * values are stored in is the order the Block uses them in.
 */
export function MultiSelectControl({
  field,
  path,
  value,
  error,
}: LeafProps<Extract<Field, { type: "select" }>>) {
  const env = useFields()
  const { id, change, blur } = useControl(env, path)
  const description = descriptionOf(field)
  const options = toOptions(field.options)
  const chosen = valuesOf(value)
  const label = labelOf(field)
  const disabled = isReadOnly(field)
  const root = useRef<HTMLFieldSetElement>(null)
  const pendingFocus = useRef<{ value: string; control: string } | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const nameOf = (v: string) => options.find((o) => o.value === v)?.label ?? v

  useEffect(() => {
    const focus = pendingFocus.current
    if (!focus) return
    pendingFocus.current = null
    const row = root.current?.querySelector(`[data-chosen="${focus.value}"]`)
    // A row moved to the top or bottom has one of its buttons disabled.
    const target =
      row?.querySelector<HTMLElement>(
        `[data-move="${focus.control}"]:not(:disabled)`
      ) ?? row?.querySelector<HTMLElement>("[data-move]:not(:disabled)")
    target?.focus()
  })

  const toggle = (option: string, on: boolean) =>
    change(on ? [...chosen, option] : chosen.filter((v) => v !== option))

  const move = (index: number, to: number) => {
    const next = [...chosen]
    const [moved] = next.splice(index, 1)
    next.splice(to, 0, moved!)
    change(next)
    setAnnouncement(
      `${nameOf(moved!)} moved to position ${to + 1} of ${chosen.length}.`
    )
    pendingFocus.current = {
      value: moved!,
      control: to < index ? "up" : "down",
    }
  }

  return (
    <FieldSet
      ref={root}
      data-invalid={error ? true : undefined}
      aria-describedby={
        describedBy(id, { description, error: error ?? undefined })[
          "aria-describedby"
        ]
      }
    >
      <FieldLegend variant="label">{label}</FieldLegend>
      <div className="grid gap-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={chosen.includes(option.value)}
              disabled={disabled}
              onBlur={blur}
              onChange={(e) => toggle(option.value, e.target.checked)}
              className="size-4 accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
      {chosen.length > 1 && (
        <ol
          aria-label={`${label} in this order`}
          className="flex flex-col gap-1 rounded-lg border p-2"
        >
          {chosen.map((option, index) => (
            <li
              key={option}
              data-chosen={option}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="px-1">{nameOf(option)}</span>
              <span className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  data-move="up"
                  aria-label={`Move ${nameOf(option)} up in ${label}`}
                  disabled={disabled || index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  data-move="down"
                  aria-label={`Move ${nameOf(option)} down in ${label}`}
                  disabled={disabled || index === chosen.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowDownIcon />
                </Button>
              </span>
            </li>
          ))}
        </ol>
      )}
      {description && (
        <FieldDescription id={`${id}-description`}>
          {description}
        </FieldDescription>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </FieldSet>
  )
}

export function RadioControl({
  field,
  path,
  value,
  error,
}: LeafProps<Extract<Field, { type: "radio" }>>) {
  const env = useFields()
  const { id, change, blur } = useControl(env, path)
  const description = descriptionOf(field)
  const horizontal =
    (field.admin as { layout?: string } | undefined)?.layout === "horizontal"
  return (
    <FieldSet
      aria-describedby={
        describedBy(id, { description, error: error ?? undefined })[
          "aria-describedby"
        ]
      }
      data-invalid={error ? true : undefined}
    >
      <FieldLegend variant="label">{labelOf(field)}</FieldLegend>
      <div
        className={horizontal ? "flex flex-wrap gap-x-4 gap-y-2" : "grid gap-2"}
      >
        {toOptions(field.options).map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={textOf(value) === option.value}
              disabled={isReadOnly(field)}
              onBlur={blur}
              onChange={() => change(option.value)}
              className="size-4 accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
      {description && (
        <FieldDescription id={`${id}-description`}>
          {description}
        </FieldDescription>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </FieldSet>
  )
}

export function CheckboxControl({
  field,
  path,
  value,
  error,
}: LeafProps<Extract<Field, { type: "checkbox" }>>) {
  const env = useFields()
  const { id, change, blur } = useControl(env, path)
  const description = descriptionOf(field)
  return (
    <div className="flex flex-col gap-1.5">
      <FieldBox
        orientation="horizontal"
        data-invalid={error ? true : undefined}
      >
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          disabled={isReadOnly(field)}
          onBlur={blur}
          onChange={(e) => change(e.target.checked)}
          className="size-4 accent-primary"
          {...describedBy(id, { description, error: error ?? undefined })}
        />
        <FieldLabel htmlFor={id}>{labelOf(field)}</FieldLabel>
      </FieldBox>
      {description && (
        <FieldDescription id={`${id}-description`}>
          {description}
        </FieldDescription>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  )
}

const idOf = (value: unknown): number | null =>
  typeof value === "number"
    ? value
    : typeof value === "object" && value !== null && "id" in value
      ? Number((value as { id: unknown }).id)
      : null

export function UploadControl({
  field,
  path,
  value,
  error,
}: LeafProps<Extract<Field, { type: "upload" }>>) {
  const env = useFields()
  const { id, change } = useControl(env, path)
  const description = descriptionOf(field)
  return (
    <FormField
      id={id}
      label={labelOf(field)}
      description={description}
      error={error ?? undefined}
    >
      <MediaSelect
        id={id}
        value={idOf(value)}
        options={[...env.media]}
        onChange={change}
        {...describedBy(id, { description, error: error ?? undefined })}
      />
    </FormField>
  )
}

export function PageControl({
  field,
  path,
  value,
  error,
}: LeafProps<Extract<Field, { type: "relationship" }>>) {
  const env = useFields()
  const { id, change } = useControl(env, path)
  const description = descriptionOf(field)
  return (
    <FormField
      id={id}
      label={labelOf(field)}
      description={description}
      error={error ?? undefined}
    >
      <PageSelect
        label={labelOf(field)}
        id={id}
        value={idOf(value)}
        pages={env.pages}
        required={field.required === true}
        disabled={isReadOnly(field)}
        onChange={change}
        {...describedBy(id, { description, error: error ?? undefined })}
      />
    </FormField>
  )
}

/** Stands in for a field this tab can't edit, so nothing is silently missing. */
export function Unsupported({ field, note }: { field: Field; note: string }) {
  const name = "name" in field ? labelOf(field) : field.type
  return (
    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{name}</span>: {note}
    </p>
  )
}
