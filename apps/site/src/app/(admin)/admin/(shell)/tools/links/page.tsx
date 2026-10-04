import type { Metadata } from "next"

import { LinksList } from "@/admin/components/links/LinksList"
import { loadLinks } from "@/admin/links/screen"
import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "Links" }

/** Links: every link on the Site, where it is used, and whether it works. */
export default async function LinksPage() {
  const { payload, as } = await requireStaff()
  const rows = await loadLinks(payload, as, { siteUrl: process.env.SITE_URL })
  return <LinksList rows={rows} />
}
