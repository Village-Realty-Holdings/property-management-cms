import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { Search } from '@/search/Component'
import PageClient from './page.client'
import { CardPostData } from '@/components/Card'
import { getSiteMeta } from '@/seo/generateMeta'

type Args = {
  searchParams: Promise<{
    q: string
  }>
}
export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { q: query } = await searchParamsPromise
  const payload = await getPayload({ config: configPromise })

  const posts = await payload.find({
    collection: 'search',
    depth: 1,
    limit: 12,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
    // pagination: false reduces overhead if you don't need totalDocs
    pagination: false,
    ...(query
      ? {
          where: {
            or: [
              {
                title: {
                  like: query,
                },
              },
              {
                'meta.description': {
                  like: query,
                },
              },
              {
                'meta.title': {
                  like: query,
                },
              },
              {
                slug: {
                  like: query,
                },
              },
            ],
          },
        }
      : {}),
  })

  return (
    <div className="pt-12 md:pt-20">
      <PageClient />
      <div className="container mb-12 md:mb-16">
        <div className="max-w-[44rem]">
          <h1 className="text-display">Search</h1>
          <div className="mt-8">
            <Search />
          </div>
        </div>
      </div>

      {posts.totalDocs > 0 ? (
        <CollectionArchive posts={posts.docs as CardPostData[]} />
      ) : (
        <div className="container">
          <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            {query ? `Nothing matched "${query}". Try a different word.` : 'Type to search the site.'}
          </p>
        </div>
      )}
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteMeta()
  return {
    title: ['Search', site.name].filter(Boolean).join(' | '),
  }
}
