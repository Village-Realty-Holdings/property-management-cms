"use client"

import { useTenantSelection } from "@payloadcms/plugin-multi-tenant/client"
import { useEffect } from "react"

type Props = {
  /** The open document's Site, when the plugin's Site field doesn't sync it. */
  documentSiteID?: number | string
}

const same = (a: unknown, b: unknown) =>
  a !== undefined && b !== undefined && String(a) === String(b)

/**
 * Header badge naming the selected Site ("All Sites" when none is), and the
 * document-open Site switch for collections without the plugin's Site field.
 * The switch only sets the `payload-tenant` cookie (no refresh), like the
 * plugin's own Site field does.
 */
export function ActiveSiteSync({ documentSiteID }: Props) {
  const { options, selectedTenantID, setTenant } = useTenantSelection()

  useEffect(() => {
    if (documentSiteID === undefined || same(documentSiteID, selectedTenantID))
      return
    const option = options.find(({ value }) => same(value, documentSiteID))
    if (option) setTenant({ id: option.value, refresh: false })
  }, [documentSiteID, options, selectedTenantID, setTenant])

  if (options.length === 0) return null
  const selected = options.find(({ value }) => same(value, selectedTenantID))
  const name = typeof selected?.label === "string" ? selected.label : undefined

  return (
    <div
      className="active-site"
      title="Lists, the dashboard and new documents use this Site."
    >
      <span className="active-site__label">Site</span>
      <span className="active-site__name">{name ?? "All Sites"}</span>
    </div>
  )
}
