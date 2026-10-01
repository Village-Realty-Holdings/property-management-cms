import { redirect } from "next/navigation"

/** Assets is Fonts for now: its sidebar link goes straight there. */
export default function AssetsPage() {
  redirect("/admin/settings/assets/fonts")
}
