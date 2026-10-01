"use client"

import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"

import { FONT_KINDS } from "../../../fonts/types"
import { kindLabel } from "../../fonts/labels"
import { describedBy, FormField } from "../FormBits"

/** The Font's kind, chosen from serif, sans serif and slab serif. */
export function FontKindSelect({ id, error }: { id: string; error?: string }) {
  return (
    <FormField
      id={id}
      label="Kind"
      description="How the font looks, for grouping in the Theme's pickers."
      error={error}
    >
      <NativeSelect
        id={id}
        name="kind"
        defaultValue=""
        className="w-full"
        {...describedBy(id, { description: true, error })}
      >
        <NativeSelectOption value="" disabled>
          Choose a kind
        </NativeSelectOption>
        {FONT_KINDS.map((kind) => (
          <NativeSelectOption key={kind} value={kind}>
            {kindLabel(kind)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </FormField>
  )
}
