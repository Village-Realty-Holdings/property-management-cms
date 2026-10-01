"use client"

import { useAllFormFields } from "@payloadcms/ui"
import { useMemo } from "react"

import {
  collectVariableIssues,
  type VariableValues,
} from "@workspace/content/shared"

/**
 * Live Variable problems in the form: unknown names (publishing will fail)
 * and empty values or stray braces (warnings).
 */
export function VariablesCheck({ values }: { values: VariableValues }) {
  const [fields] = useAllFormFields()
  const issues = useMemo(
    () =>
      Object.entries(fields).flatMap(([path, field]) =>
        path.startsWith("variablesHelp")
          ? []
          : collectVariableIssues(field?.value, values, path)
      ),
    [fields, values]
  )
  if (issues.length === 0) return null

  const messages = [
    ...new Set(
      issues.map((issue) =>
        issue.kind === "unknown"
          ? `Unknown {${issue.name}}: publishing is blocked until it's fixed.`
          : issue.kind === "empty"
            ? `{${issue.name}} is empty in Site Settings, so it shows as blank.`
            : `"${issue.text}" has braces that aren't a Variable.`
      )
    ),
  ]
  const blocking = issues.some((issue) => issue.kind === "unknown")

  return (
    <ul
      className={`variables-help__issues${blocking ? "variables-help__issues--error" : ""}`}
      role="status"
    >
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  )
}
