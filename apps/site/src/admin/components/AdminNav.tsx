"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileTextIcon, ImageIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

const items = [
  { href: "/admin/pages", label: "Pages", icon: FileTextIcon },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
]

/** The Admin's sidebar navigation. */
export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
