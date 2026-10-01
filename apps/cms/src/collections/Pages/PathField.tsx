"use client"

import { TextField, useField, useFormFields } from "@payloadcms/ui"
import type { TextFieldClientComponent } from "payload"
import { useEffect, useRef } from "react"

import { defaultPagePath } from "./defaultPath"

/**
 * Pages.path: fills in `"/" + slugify(title)` while the Editor types the
 * title, until they edit the path themselves (or it already had one).
 */
export const PagePathField: TextFieldClientComponent = (props) => {
  const { path } = props
  const { value, setValue } = useField<string>({ path })
  const title = useFormFields(([fields]) => fields.title?.value)
  // The last path filled in from the title: the path follows the title only
  // while it is empty or still equal to this.
  const suggested = useRef<string | null>(null)

  useEffect(() => {
    const next = defaultPagePath(title)
    if (!next || next === value) return
    if (value && value !== suggested.current) return
    suggested.current = next
    setValue(next)
  }, [title, value, setValue])

  return <TextField {...props} />
}
