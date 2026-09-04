import React from 'react'
import { ChevronDown } from 'lucide-react'

import type { FAQBlock as FAQBlockProps } from '@/payload-types'

import RichText from '@/components/RichText'

type Props = FAQBlockProps & { disableInnerContainer?: boolean }

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

export const FAQBlock: React.FC<Props> = ({ heading, intro, items }) => {
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
      <div className="mx-auto max-w-3xl">
        {heading && <h2 className="text-3xl font-semibold">{heading}</h2>}
        {intro && <p className="mt-3 text-muted-foreground">{intro}</p>}

        <div className="mt-8">
          {list.map((item, i) => (
            <details key={item.id || i} className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-medium [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <ChevronDown
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="pb-4">
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
