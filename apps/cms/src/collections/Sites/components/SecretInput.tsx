"use client"

import {
  Button,
  FieldDescription,
  FieldError,
  FieldLabel,
  useField,
  withCondition,
} from "@payloadcms/ui"
import type { TextFieldClientProps } from "payload"
import { useId, useState } from "react"

/**
 * A text field for secrets (the revalidation and signing secrets): masked
 * like a password until "Show" is pressed, still editable by whoever may
 * update it. Registered as `admin.components.Field`; fields the user can't
 * read never reach the form.
 */
function SecretInputField({
  field,
  path: pathFromProps,
  readOnly,
}: TextFieldClientProps) {
  const { disabled, path, setValue, showError, value } = useField<string>({
    potentiallyStalePath: pathFromProps,
  })
  const [revealed, setRevealed] = useState(false)
  const inputId = useId()
  const locked = Boolean(readOnly || disabled)

  const classes = [
    "field-type",
    "text",
    showError && "error",
    locked && "read-only",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={classes}>
      <FieldLabel
        htmlFor={inputId}
        label={field.label}
        path={path}
        required={field.required}
      />
      <div className="field-type__wrap">
        <FieldError path={path} showError={showError} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            id={inputId}
            name={path}
            type={revealed ? "text" : "password"}
            autoComplete="new-password"
            spellCheck={false}
            disabled={locked}
            value={value ?? ""}
            onChange={(event) => setValue(event.target.value)}
            style={{ flex: 1, minWidth: 0 }}
          />
          <Button
            buttonStyle="secondary"
            size="small"
            margin={false}
            aria-pressed={revealed}
            onClick={() => setRevealed((shown) => !shown)}
          >
            {revealed ? "Hide" : "Show"}
          </Button>
        </div>
      </div>
      <FieldDescription description={field.admin?.description} path={path} />
    </div>
  )
}

export const SecretInput = withCondition(SecretInputField)
