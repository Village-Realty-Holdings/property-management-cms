"use client"

import type { DefaultCellComponentProps } from "payload"
import {
  Banner,
  Pill,
  useConfig,
  useFormFields,
  useTranslation,
} from "@payloadcms/ui"
import { formatDate } from "@payloadcms/ui/shared"

/** A Special has expired once its validity end date (`validTo`) has passed. */
export function isExpired(validTo: unknown, now = Date.now()): boolean {
  if (typeof validTo !== "string" && !(validTo instanceof Date)) return false
  const end = new Date(validTo).getTime()
  return Number.isFinite(end) && end < now
}

/** Specials list: the `validTo` date, with an "Expired" pill once it has passed. */
export function ValidToCell({ cellData }: DefaultCellComponentProps) {
  const { config } = useConfig()
  const { i18n } = useTranslation()
  if (!cellData) return <span>No end date</span>
  const date = cellData as Date | string
  return (
    <span style={{ alignItems: "center", display: "inline-flex", gap: 8 }}>
      {formatDate({ date, i18n, pattern: config.admin.dateFormat })}
      {isExpired(date) ? (
        <Pill pillStyle="warning" size="small">
          Expired
        </Pill>
      ) : null}
    </span>
  )
}

/** Special edit view (sidebar): a warning once the Special has expired. */
export function ExpiredNotice() {
  const validTo = useFormFields(([fields]) => fields.validTo?.value)
  if (!isExpired(validTo)) return null
  return (
    <Banner type="warning">
      Expired: its validity end date has passed, so guests no longer see it.
    </Banner>
  )
}
