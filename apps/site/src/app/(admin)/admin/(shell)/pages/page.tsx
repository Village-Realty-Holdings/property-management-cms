import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"

import { requireStaff } from "@/admin/session"

export const metadata: Metadata = { title: "Pages" }

const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

/** Every Page, newest change first, with its path and status. */
export default async function PagesList() {
  const { payload, as } = await requireStaff()
  const { docs } = await payload.find({
    collection: "pages",
    sort: "-updatedAt",
    limit: 200,
    depth: 0,
    draft: true,
    ...as,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Pages</h1>
        <Link href="/admin/pages/new" className={buttonVariants()}>
          <PlusIcon /> New Page
        </Link>
      </div>
      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-background p-10 text-center">
          <p className="font-medium">No Pages yet</p>
          <p className="text-sm text-muted-foreground">
            Create the Home Page with the path &quot;/&quot; to start the Site.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((page) => (
                <tr
                  key={page.id}
                  className="border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pages/${page.id}`}
                      className="font-medium hover:underline"
                    >
                      {page.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{page.path}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        page._status === "published" ? "default" : "secondary"
                      }
                    >
                      {page._status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dateFormat.format(new Date(page.updatedAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
