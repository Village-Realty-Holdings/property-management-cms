"use client"

import type { Field } from "payload"
import { optionIsObject } from "payload/shared"

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
