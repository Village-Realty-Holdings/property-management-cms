import type { ReactNode } from "react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"

import { displayFont } from "./display"

/**
 * Renders Payload Lexical rich text (the JSON `{ root: { children } }`):
 * paragraphs, headings, quotes, lists (bullet, number, check), links, line
 * breaks, horizontal rules and text formats. Unknown nodes render their
 * children. Ported from packages/site-views.
 */

type LexicalNode = {
  type?: string
  children?: LexicalNode[]
  [key: string]: unknown
}

// Lexical text format bits.
const BOLD = 1
const ITALIC = 1 << 1
const STRIKETHROUGH = 1 << 2
const UNDERLINE = 1 << 3
const CODE = 1 << 4
const SUBSCRIPT = 1 << 5
const SUPERSCRIPT = 1 << 6

/** Only http(s), mailto, tel and site-relative links are rendered as links. */
export function safeHref(url: unknown): string | null {
  if (typeof url !== "string") return null
  const href = url.trim()
  if (href.startsWith("/") && !href.startsWith("//")) return href
  if (href.startsWith("#")) return href
  return /^(https?:|mailto:|tel:)/i.test(href) ? href : null
}

function renderText(node: LexicalNode, key: number): ReactNode {
  const format = typeof node.format === "number" ? node.format : 0
  let out: ReactNode = typeof node.text === "string" ? node.text : ""
  if (format & CODE)
    out = (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
        {out}
      </code>
    )
  if (format & BOLD) out = <strong>{out}</strong>
  if (format & ITALIC) out = <em>{out}</em>
  if (format & UNDERLINE) out = <u>{out}</u>
  if (format & STRIKETHROUGH) out = <s>{out}</s>
  if (format & SUBSCRIPT) out = <sub>{out}</sub>
  if (format & SUPERSCRIPT) out = <sup>{out}</sup>
  return <span key={key}>{out}</span>
}

const headingSizes: Record<string, string> = {
  h1: "text-4xl",
  h2: "text-3xl",
  h3: "text-2xl",
  h4: "text-xl",
  h5: "text-lg",
  h6: "text-base",
}

function renderNodes(nodes: LexicalNode[] | undefined): ReactNode[] {
  return (nodes ?? []).map((node, key) => renderNode(node, key))
}

function renderNode(node: LexicalNode, key: number): ReactNode {
  const children = () => renderNodes(node.children)
  switch (node.type) {
    case "text":
      return renderText(node, key)
    case "linebreak":
      return <br key={key} />
    case "tab":
      return " "
    case "paragraph":
      return <p key={key}>{children()}</p>
    case "heading": {
      const tag =
        typeof node.tag === "string" && /^h[1-6]$/.test(node.tag)
          ? node.tag
          : "h2"
      const Heading = tag as "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
      return (
        <Heading
          key={key}
          className={cn(
            displayFont,
            "mt-4 leading-tight text-balance",
            headingSizes[tag]
          )}
        >
          {children()}
        </Heading>
      )
    }
    case "quote":
      return (
        <blockquote
          key={key}
          className="border-l-4 border-(--brand-accent) pl-4 text-lg italic"
        >
          {children()}
        </blockquote>
      )
    case "list": {
      const ordered = node.listType === "number" || node.tag === "ol"
      const List = ordered ? "ol" : "ul"
      return (
        <List
          key={key}
          className={cn(
            "flex flex-col gap-1 pl-6",
            ordered
              ? "list-decimal"
              : node.listType === "check"
                ? "list-none pl-0"
                : "list-disc"
          )}
        >
          {children()}
        </List>
      )
    }
    case "listitem": {
      if (typeof node.checked === "boolean") {
        return (
          <li key={key} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={node.checked}
              readOnly
              disabled
              className="mt-1.5 accent-(--brand-primary)"
            />
            <span>{children()}</span>
          </li>
        )
      }
      return <li key={key}>{children()}</li>
    }
    case "link":
    case "autolink": {
      const fields = (node.fields ?? {}) as { url?: unknown; newTab?: unknown }
      const href = safeHref(fields.url ?? node.url)
      const newTab = fields.newTab === true
      if (!href) return <span key={key}>{children()}</span>
      const className =
        "font-medium text-primary underline decoration-(--brand-accent) decoration-2 underline-offset-4 hover:decoration-primary"
      return href.startsWith("/") && !newTab ? (
        <Link key={key} href={href} className={className}>
          {children()}
        </Link>
      ) : (
        <a
          key={key}
          href={href}
          className={className}
          {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {children()}
        </a>
      )
    }
    case "horizontalrule":
      return <hr key={key} className="my-4 border-border" />
    default:
      return node.children ? <span key={key}>{children()}</span> : null
  }
}

/** True when the rich text has any visible text. */
export function hasText(data: unknown): boolean {
  const walk = (node: LexicalNode | undefined): boolean =>
    Boolean(
      node &&
      ((typeof node.text === "string" && node.text.trim() !== "") ||
        node.children?.some(walk))
    )
  return walk((data as { root?: LexicalNode } | null | undefined)?.root)
}

export function RichText({
  data,
  className,
}: {
  data: unknown
  className?: string
}) {
  const root = (data as { root?: LexicalNode } | null | undefined)?.root
  if (!root?.children?.length) return null
  return (
    <div
      className={cn(
        "flex max-w-prose flex-col gap-4 text-base leading-relaxed text-pretty",
        className
      )}
    >
      {renderNodes(root.children)}
    </div>
  )
}
