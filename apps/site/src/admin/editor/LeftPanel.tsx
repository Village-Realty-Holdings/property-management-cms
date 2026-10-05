"use client"

import { useEffect, useRef, type ReactNode } from "react"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

/** One tab of the docked panel. `id` is what `tab` and `onTabChange` use. */
export type PanelTab = { id: string; label: string; content: ReactNode }

/**
 * The panel docked on the left of the canvas. Uncontrolled by default, opening
 * on the first tab; pass `tab` and `onTabChange` to let the editor switch tabs
 * itself (selecting a Block opens the Block tab).
 *
 * When the editor switches the tab under the User's focus (a row of
 * the Outline selected with a click or Enter), the focus would fall to the
 * page with the panel it was in: it goes to the new tab's panel instead.
 */
export function LeftPanel({
  tabs,
  tab,
  onTabChange,
}: {
  tabs: readonly PanelTab[]
  tab?: string
  onTabChange?: (id: string) => void
}) {
  const aside = useRef<HTMLElement>(null)
  const shown = useRef(tab)
  useEffect(() => {
    if (tab === shown.current) return
    shown.current = tab
    // The panel being left stays a moment, inert, while it fades out.
    const panels = [
      ...(aside.current?.querySelectorAll<HTMLElement>('[role="tabpanel"]') ??
        []),
    ]
    const current = panels.find((panel) => !panel.hasAttribute("inert"))
    const active = document.activeElement
    const lost =
      !active ||
      active === document.body ||
      panels.some((panel) => panel !== current && panel.contains(active))
    if (lost) current?.focus()
  }, [tab])
  return (
    <aside
      ref={aside}
      aria-label="Editor panel"
      className="flex w-80 shrink-0 flex-col overflow-hidden border-r bg-background max-md:w-64"
    >
      <Tabs
        {...(tab !== undefined
          ? { value: tab }
          : { defaultValue: tabs[0]?.id })}
        onValueChange={(value) => onTabChange?.(String(value))}
        className="min-h-0 flex-1 gap-0"
      >
        <TabsList variant="line" className="w-full shrink-0 border-b px-2">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent
            key={t.id}
            value={t.id}
            aria-label={t.label}
            className="min-h-0 overflow-y-auto"
          >
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </aside>
  )
}
