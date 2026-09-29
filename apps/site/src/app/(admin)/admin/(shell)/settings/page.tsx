import type { Metadata } from "next"

import { SettingsForm } from "@/admin/components/SettingsForm"
import { mediaOptions } from "@/admin/media"
import { mediaId } from "@/admin/pageForm"
import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "Site Settings" }

/** Site Settings: the Site's general details and branding. */
export default async function SettingsPage() {
  const staff = await requireStaff()
  const settings = await staff.payload.findGlobal({
    slug: "site-settings",
    depth: 0,
    ...staff.as,
  })
  return (
    <SettingsForm
      media={await mediaOptions(staff)}
      initial={{
        name: settings.name ?? "",
        tagline: settings.tagline ?? "",
        domain: settings.domain ?? "",
        contact: {
          phone: settings.contact?.phone ?? "",
          email: settings.contact?.email ?? "",
          address: settings.contact?.address ?? "",
        },
        branding: {
          logo: mediaId(settings.branding?.logo),
          primaryColor: settings.branding?.primaryColor ?? "",
          accentColor: settings.branding?.accentColor ?? "",
          fontPairing: settings.branding?.fontPairing ?? "classic",
        },
        social: (settings.social ?? []).map(({ platform, url }) => ({
          platform,
          url,
        })),
      }}
    />
  )
}
