"use client"

import { useState, type Ref } from "react"
import { Monitor, Smartphone, Tablet } from "lucide-react"

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

/**
 * The canvas widths. Tablet and Mobile are real viewport widths, so the Site's
 * own media queries apply: Tablet is past the `md` breakpoint (768px), Mobile
 * is below it. Desktop fills the space beside the panel.
 */
export const CANVAS_WIDTHS = {
  desktop: { label: "Desktop", width: "100%", Icon: Monitor },
  tablet: { label: "Tablet", width: "820px", Icon: Tablet },
  mobile: { label: "Mobile", width: "375px", Icon: Smartphone },
} as const

export type CanvasWidth = keyof typeof CANVAS_WIDTHS

const ORDER: CanvasWidth[] = ["desktop", "tablet", "mobile"]

/**
 * The canvas: an iframe on the real Site route, in an editing mode, with width
 * toggles. A width wider than the space scrolls sideways instead of shrinking,
 * so the breakpoints stay real.
 */
export function CanvasFrame({
  src,
  title,
  frameRef,
}: {
  src: string
  /** Names the iframe for screen readers. */
  title: string
  frameRef?: Ref<HTMLIFrameElement>
}) {
  const [width, setWidth] = useState<CanvasWidth>("desktop")
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-center border-b bg-background py-1.5">
        <ToggleGroup
          aria-label="Canvas width"
          variant="outline"
          size="sm"
          spacing={0}
          value={[width]}
          onValueChange={(next) => {
            // One width is always chosen: pressing the pressed one keeps it.
            const chosen = next[0] as CanvasWidth | undefined
            if (chosen) setWidth(chosen)
          }}
        >
          {ORDER.map((key) => {
            const { label, Icon } = CANVAS_WIDTHS[key]
            return (
              <ToggleGroupItem
                key={key}
                value={key}
                aria-label={label}
                title={label}
              >
                <Icon aria-hidden />
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-muted/40">
        <iframe
          ref={frameRef}
          title={title}
          src={src}
          style={{ width: CANVAS_WIDTHS[width].width }}
          className="mx-auto block h-full max-w-none border-0 bg-white shadow-sm"
        />
      </div>
    </div>
  )
}
