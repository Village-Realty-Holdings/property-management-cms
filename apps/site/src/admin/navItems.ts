export type NavIcon =
  | "dashboard"
  | "layouts"
  | "pages"
  | "media"
  | "brand"
  | "seo"
  | "theme"
  | "assets"
  | "replaceText"
  | "replaceImage"
  | "links"
  | "themes"
  | "starterKits"

export type NavItem = {
  label: string
  href: string
  icon: NavIcon
  /** Active on this path and everything below it (default: `href`). */
  section?: string
}

export type NavGroup = { label: string | null; items: NavItem[] }

/** The Admin sidebar: the Dashboard, then Content, Settings and Tools. */
export const navGroups: NavGroup[] = [
  {
    label: null,
    items: [{ label: "Dashboard", href: "/admin", icon: "dashboard" }],
  },
  {
    label: "Content",
    items: [
      { label: "Layouts", href: "/admin/layouts", icon: "layouts" },
      { label: "Pages", href: "/admin/pages", icon: "pages" },
      { label: "Media", href: "/admin/media", icon: "media" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Brand", href: "/admin/settings/brand", icon: "brand" },
      { label: "SEO", href: "/admin/settings/seo", icon: "seo" },
      { label: "Theme", href: "/admin/theme", icon: "theme" },
      {
        label: "Assets",
        href: "/admin/settings/assets/fonts",
        icon: "assets",
        section: "/admin/settings/assets",
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        label: "Replace Text",
        href: "/admin/tools/replace-text",
        icon: "replaceText",
      },
      {
        label: "Replace Image",
        href: "/admin/tools/replace-image",
        icon: "replaceImage",
      },
      { label: "Links", href: "/admin/tools/links", icon: "links" },
      { label: "Themes", href: "/admin/tools/themes", icon: "themes" },
      {
        label: "Starter Kits",
        href: "/admin/tools/starter-kits",
        icon: "starterKits",
      },
    ],
  },
]

/** Whether `pathname` is the item's screen or one inside it. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/admin") return pathname === "/admin"
  const section = item.section ?? item.href
  return pathname === section || pathname.startsWith(`${section}/`)
}
