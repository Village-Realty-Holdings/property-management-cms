"use client"

import { Keyboard } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"

import { SHORTCUT_HELP } from "./shortcuts"

/** A small popover in the top bar that lists the editor's keyboard shortcuts. */
export function ShortcutsHelp() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
          />
        }
      >
        <Keyboard aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle>Keyboard shortcuts</PopoverTitle>
          <PopoverDescription>
            Use Cmd in place of Ctrl on a Mac. They work with focus in the
            canvas too.
          </PopoverDescription>
        </PopoverHeader>
        <dl className="flex flex-col gap-1.5">
          {SHORTCUT_HELP.map(({ shortcut, keys, label }) => (
            <div
              key={shortcut}
              className="flex items-center justify-between gap-3"
            >
              <dt>{label}</dt>
              <dd>
                <kbd className="rounded border border-border px-1 font-mono text-xs">
                  {keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  )
}
