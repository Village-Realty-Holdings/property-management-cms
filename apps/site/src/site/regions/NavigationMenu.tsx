"use client"

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from "react"
import { ChevronDown, Menu } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"

import { focusOutline, RegionLink } from "./RegionLink"

/** A link of the menu, its href already resolved by the server. */
export type MenuLink = { key: string; label: string; href: string }

/** A column of a mega menu (with its heading), or the whole of a dropdown. */
export type MenuGroup = { heading: string | null; links: MenuLink[] }

export type MenuItem =
  | ({ kind: "link" } & MenuLink)
  | {
      kind: "dropdown" | "mega"
      key: string
      label: string
      groups: MenuGroup[]
    }

type Disclosure = Extract<MenuItem, { kind: "dropdown" | "mega" }>

const topClass = cn(
  "inline-flex items-center gap-1 rounded-sm py-2 text-sm font-medium text-foreground underline-offset-4 hover:underline",
  focusOutline.page
)

const panelLinkClass = cn(
  "block rounded-sm px-3 py-2 text-sm text-popover-foreground underline-offset-4 hover:bg-accent hover:text-accent-foreground",
  focusOutline.page
)

/**
 * The Header's menu. On a wide screen: top-level links and dropdowns, which
 * are disclosures (a button with `aria-expanded` that shows a panel of
 * links). Escape closes one and puts focus back on its button, and so does
 * leaving it by Tab or by clicking elsewhere; only one is open at a time. On
 * a small screen a Menu button opens the same links in a sheet.
 */
export function NavigationMenu({
  items,
  idBase,
}: {
  items: MenuItem[]
  /** Prefix of the ids the menu needs, which the server chooses so the Site and the Visual Editor agree. */
  idBase: string
}) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const nav = useRef<HTMLElement>(null)

  useEffect(() => {
    if (openKey === null) return
    const away = (event: PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) setOpenKey(null)
    }
    document.addEventListener("pointerdown", away)
    return () => document.removeEventListener("pointerdown", away)
  }, [openKey])

  return (
    <nav
      ref={nav}
      aria-label="Main"
      className="relative ml-auto min-w-0 md:ml-0 md:flex-1"
    >
      <ul className="hidden flex-wrap items-center gap-x-6 gap-y-1 md:flex">
        {items.map((item) =>
          item.kind === "link" ? (
            <li key={item.key}>
              <RegionLink href={item.href} className={topClass}>
                {item.label}
              </RegionLink>
            </li>
          ) : (
            <DesktopDisclosure
              key={item.key}
              item={item}
              id={`${idBase}-${item.key}`}
              open={openKey === item.key}
              onOpenChange={(open) => setOpenKey(open ? item.key : null)}
            />
          )
        )}
      </ul>
      <MobileMenu items={items} idBase={idBase} />
    </nav>
  )
}

/**
 * Keeps a panel inside the window: a panel that would run past the right
 * edge is moved left by the overflow.
 */
function useKeepOnScreen(ref: RefObject<HTMLElement | null>, open: boolean) {
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || !open) return
    element.style.translate = ""
    const margin = 16
    const { left, right } = element.getBoundingClientRect()
    const over = right - (document.documentElement.clientWidth - margin)
    if (over > 0) {
      element.style.translate = `${-Math.min(over, Math.max(0, left - margin))}px 0`
    }
  }, [ref, open])
}

function DesktopDisclosure({
  item,
  id: panelId,
  open,
  onOpenChange,
}: {
  item: Disclosure
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  useKeepOnScreen(panel, open)

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation()
      onOpenChange(false)
      button.current?.focus()
    }
  }
  // Tabbing out of the item closes it. (Losing focus to nothing, like a click
  // on text inside the panel, does not: the click handler covers clicks away.)
  const onBlur = (event: FocusEvent<HTMLLIElement>) => {
    const next = event.relatedTarget
    if (open && next instanceof Node && !event.currentTarget.contains(next)) {
      onOpenChange(false)
    }
  }

  const mega = item.kind === "mega"
  return (
    <li
      className={mega ? undefined : "relative"}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        className={cn(topClass, "cursor-pointer")}
      >
        {item.label}
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 transition-transform duration-(--duration)",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        ref={panel}
        id={panelId}
        hidden={!open}
        className={cn(
          "absolute top-full left-0 z-40 mt-2 max-w-[calc(100vw-2rem)] rounded-(--card-radius) bg-popover p-2 text-popover-foreground shadow-(--card-shadow) ring-1 ring-foreground/10",
          mega ? "w-max p-5" : "w-max min-w-48"
        )}
      >
        {mega ? (
          <MegaColumns groups={item.groups} idBase={panelId} />
        ) : (
          <LinkList links={item.groups.flatMap((group) => group.links)} />
        )}
      </div>
    </li>
  )
}

function LinkList({
  links,
  labelledBy,
  onNavigate,
}: {
  links: MenuLink[]
  labelledBy?: string
  onNavigate?: () => void
}) {
  return (
    <ul aria-labelledby={labelledBy} className="flex flex-col">
      {links.map((link) => (
        <li key={link.key}>
          <RegionLink
            href={link.href}
            className={panelLinkClass}
            onClick={onNavigate}
          >
            {link.label}
          </RegionLink>
        </li>
      ))}
    </ul>
  )
}

/** The most links a column of a mega menu without headings holds. */
const COLUMN_LINKS = 4

/**
 * A mega menu's links with no heading would share one column, which a
 * plain dropdown already is: flow a long one into evenly filled columns of
 * at most four links, so the menu is columns even when staff give none a
 * heading. A group with a heading stays one column.
 */
function columnsOf(groups: MenuGroup[]): MenuGroup[] {
  return groups.flatMap((group) => {
    const count = group.links.length
    if (group.heading || count <= COLUMN_LINKS) return [group]
    const size = Math.ceil(count / Math.ceil(count / COLUMN_LINKS))
    return Array.from({ length: Math.ceil(count / size) }, (_, column) => ({
      heading: null,
      links: group.links.slice(column * size, (column + 1) * size),
    }))
  })
}

/** Columns with a heading each; links with no heading share the first. */
function MegaColumns({
  groups,
  idBase,
  onNavigate,
}: {
  groups: MenuGroup[]
  idBase: string
  onNavigate?: () => void
}) {
  return (
    <div className="grid auto-cols-[minmax(10rem,14rem)] grid-flow-col gap-x-8">
      {columnsOf(groups).map((group, index) => {
        const headingId = `${idBase}-col-${index}`
        return (
          <div key={index} className="flex flex-col gap-1">
            {group.heading && (
              <p
                id={headingId}
                className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {group.heading}
              </p>
            )}
            <LinkList
              links={group.links}
              labelledBy={group.heading ? headingId : undefined}
              onNavigate={onNavigate}
            />
          </div>
        )
      })}
    </div>
  )
}

function MobileMenu({ items, idBase }: { items: MenuItem[]; idBase: string }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        id={`${idBase}-menu`}
        className={cn(
          buttonVariants({ variant: "outline", size: "default" }),
          "md:hidden"
        )}
      >
        <Menu aria-hidden className="size-4" />
        Menu
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Main menu" className="px-4 pb-6">
          <ul className="flex flex-col">
            {items.map((item) =>
              item.kind === "link" ? (
                <li key={item.key}>
                  <RegionLink
                    href={item.href}
                    className={cn(panelLinkClass, "text-base")}
                    onClick={close}
                  >
                    {item.label}
                  </RegionLink>
                </li>
              ) : (
                <MobileDisclosure
                  key={item.key}
                  item={item}
                  id={`${idBase}-m-${item.key}`}
                  onNavigate={close}
                />
              )
            )}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

function MobileDisclosure({
  item,
  id: panelId,
  onNavigate,
}: {
  item: Disclosure
  id: string
  onNavigate: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={cn(
          panelLinkClass,
          "flex w-full cursor-pointer items-center justify-between text-left text-base"
        )}
      >
        {item.label}
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 transition-transform duration-(--duration)",
            open && "rotate-180"
          )}
        />
      </button>
      <div id={panelId} hidden={!open} className="pb-2 pl-3">
        {item.kind === "mega" ? (
          <MegaStack
            groups={item.groups}
            idBase={panelId}
            onNavigate={onNavigate}
          />
        ) : (
          <LinkList
            links={item.groups.flatMap((group) => group.links)}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </li>
  )
}

/** A mega menu's columns, one under the other on a small screen. */
function MegaStack({
  groups,
  idBase,
  onNavigate,
}: {
  groups: MenuGroup[]
  idBase: string
  onNavigate: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, index) => {
        const headingId = `${idBase}-col-${index}`
        return (
          <div key={group.heading ?? "none"} className="flex flex-col gap-1">
            {group.heading && (
              <p
                id={headingId}
                className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {group.heading}
              </p>
            )}
            <LinkList
              links={group.links}
              labelledBy={group.heading ? headingId : undefined}
              onNavigate={onNavigate}
            />
          </div>
        )
      })}
    </div>
  )
}
