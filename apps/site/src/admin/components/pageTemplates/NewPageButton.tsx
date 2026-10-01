"use client"

import { useState } from "react"
import Link from "next/link"
import { FileIcon, LayoutPanelTopIcon, PlusIcon } from "lucide-react"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import type { PageTemplateRow } from "../../pageTemplates"
import {
  blocksSummary,
  NEW_PAGE_HREF,
  newPageFromTemplateHref,
} from "./summary"

const CHOICE =
  "flex items-start gap-3 rounded-md border p-3 text-left outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

/**
 * New Page. With no Page Templates it goes straight to a blank Page; with
 * some, it asks first whether to start blank or from one of them.
 */
export function NewPageButton({
  templates,
}: {
  templates: readonly PageTemplateRow[]
}) {
  const [open, setOpen] = useState(false)
  if (templates.length === 0) {
    return (
      <Link href={NEW_PAGE_HREF} className={buttonVariants()}>
        <PlusIcon aria-hidden="true" /> New Page
      </Link>
    )
  }
  return (
    <>
      <Button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <PlusIcon aria-hidden="true" /> New Page
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Page</DialogTitle>
            <DialogDescription>
              Start blank, or from a copy of a Page Template&apos;s Blocks.
            </DialogDescription>
          </DialogHeader>
          <ul className="grid max-h-[60vh] gap-2 overflow-y-auto">
            <li>
              <Link href={NEW_PAGE_HREF} className={CHOICE}>
                <FileIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                <span className="grid min-w-0 gap-0.5">
                  <span className="font-medium">Blank Page</span>
                  <span className="text-xs text-muted-foreground">
                    Starts with a Hero.
                  </span>
                </span>
              </Link>
            </li>
            {templates.map((template) => (
              <li key={template.id}>
                <Link
                  href={newPageFromTemplateHref(template.id)}
                  className={CHOICE}
                >
                  <LayoutPanelTopIcon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {blocksSummary(template.blocks)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
