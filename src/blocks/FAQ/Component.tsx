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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: lexicalToText(item.answer),
      },
    })),
  }

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

      {list.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
    </div>
  )
}
