import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

import type { FooterColumnsBlock } from "../../payload-types"
import { EditableText } from "../blocks/Editable"
import { container, embeddedBox } from "../blocks/types"
import { displayFont } from "../display"
import { linksOf } from "./links"
import { focusOutline, RegionLink } from "./RegionLink"
import type { RegionContext } from "./types"

type Column = NonNullable<FooterColumnsBlock["columns"]>[number]

const list = "flex flex-col gap-2 text-sm"
const linkClass = cn(
  "underline-offset-4 hover:underline",
  focusOutline.secondary
)

/** A column's content, or null when it has nothing to show. */
function contentOf(column: Column, context: RegionContext): ReactNode {
  switch (column.content) {
    case "links": {
      const links = linksOf(column.links)
      if (links.length === 0) return null
      return (
        <ul className={list}>
          {links.map((link) => (
            <li key={link.key}>
              <RegionLink href={link.href} className={linkClass}>
                {link.label}
              </RegionLink>
            </li>
          ))}
        </ul>
      )
    }
    case "address": {
      const address = column.address?.trim() || context.brand.address
      if (!address) return null
      return (
        <address className="text-sm whitespace-pre-line not-italic">
          {address}
        </address>
      )
    }
    case "hours": {
      const lines = (column.hours ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
      if (lines.length === 0) return null
      return (
        <ul className={list}>
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )
    }
    case "social": {
      const { social } = context.brand
      if (social.length === 0) return null
      return (
        <ul className={list}>
          {social.map((link) => (
            <li key={link.url}>
              <RegionLink
                href={link.url}
                className={cn(linkClass, "capitalize")}
              >
                {link.platform}
              </RegionLink>
            </li>
          ))}
        </ul>
      )
    }
    default:
      return null
  }
}

/**
 * The Footer's columns. Each has a heading and one kind of content: links,
 * the address and social links (from the Brand, unless the column types its
 * own address) or opening hours. A column with nothing to show is left out.
 */
export function FooterColumns({
  block,
  context,
}: {
  block: FooterColumnsBlock
  context: RegionContext
}) {
  const columns = (block.columns ?? []).flatMap((column, index) => {
    const heading = column.heading?.trim()
    const content = contentOf(column, context)
    return heading && content
      ? [{ key: column.id ?? String(index), index, heading, content }]
      : []
  })
  if (columns.length === 0) return null
  return (
    <div
      className={cn(
        container,
        embeddedBox,
        "grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-x-8 gap-y-10 py-10 in-data-container:py-0"
      )}
    >
      {columns.map((column) => (
        <div key={column.key} className="flex min-w-0 flex-col gap-3">
          <EditableText
            as="h2"
            field={`columns.${column.index}.heading`}
            context={context}
            className={cn(displayFont, "text-base")}
          >
            {column.heading}
          </EditableText>
          {column.content}
        </div>
      ))}
    </div>
  )
}
