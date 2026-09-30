"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FileTextIcon,
  ImageIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  PaletteIcon,
  SearchIcon,
  StoreIcon,
  TypeIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { isNavItemActive, navGroups, type NavIcon } from "../navItems"

const icons: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboardIcon,
  layouts: LayoutTemplateIcon,
  pages: FileTextIcon,
  media: ImageIcon,
  brand: StoreIcon,
  seo: SearchIcon,
  theme: PaletteIcon,
  assets: TypeIcon,
}

/**
 * The Admin's sidebar navigation: the Dashboard, Content and Settings. The
 * current screen has `aria-current="page"`. Below the `md` breakpoint the
 * groups flow in a row above the content; the group names stay available to
 * screen readers.
 */
export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Admin"
      className="flex flex-row flex-wrap gap-x-6 gap-y-2 md:flex-col md:gap-y-5"
    >
      {navGroups.map((group, index) => (
        <div
          key={group.label ?? index}
          role="group"
          aria-label={group.label ?? undefined}
          className="flex flex-col gap-1"
        >
          {group.label && (
            <p
              aria-hidden="true"
              className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase max-md:hidden"
            >
              {group.label}
            </p>
          )}
          <ul className="flex flex-row flex-wrap gap-1 md:flex-col">
            {group.items.map((item) => {
              const Icon = icons[item.icon]
              const active = isNavItemActive(item, pathname)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      active && "bg-muted text-foreground"
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
