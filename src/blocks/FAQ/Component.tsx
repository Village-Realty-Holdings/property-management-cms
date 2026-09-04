import React from 'react'
import { ChevronDown } from 'lucide-react'

import type { FAQBlock as FAQBlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { SectionHeader } from '@/components/SectionHeader'

type LexicalNode = { text?: string; children?: LexicalNode[] }

/** Flattens a lexical tree to plain text for structured data. */
const lexicalToText = (data: unknown): string => {
  const walk = (node: LexicalNode | undefined): string => {
    if (!node) return ''
    const own = typeof node.text === 'string' ? node.text : ''
    const kids = Array.isArray(node.children) ? node.children.map(walk).join('') : ''
    return own + kids
  }
  const root = (data as { root?: LexicalNode } | null)?.root
  return walk(root).replace(/\s+/g, ' ').trim()
}

export const FAQBlock: React.FC<FAQBlockProps> = ({ heading, intro, items }) => {
  const list = items || []

  // On the visual editor canvas, inline-editable text props arrive as React
  // nodes rather than strings (see `src/puck/fields.tsx`), and stringifying
  // them throws. Structured data is only for the public page anyway.
  const plainItems = list.filter((item) => typeof item.question === 'string')
  const jsonLd =
    plainItems.length === list.length && list.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: plainItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: lexicalToText(item.answer),
            },
          })),
        }
      : null

  return (
    <div className="container">
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <SectionHeader heading={heading} intro={intro} className="mb-0" />

        <div className="divide-y divide-border border-y border-border">
          {list.map((item, i) => (
            <details key={item.id || i} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-sm py-5 text-left text-lg font-medium [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <ChevronDown
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="pb-6 text-muted-foreground">
                <RichText data={item.answer} enableGutter={false} />
              </div>
            </details>
          ))}
        </div>
      </div>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
    </div>
  )
}
