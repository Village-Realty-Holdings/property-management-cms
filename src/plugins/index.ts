import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { Plugin } from 'payload'
import { revalidateRedirects } from './hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { Page, Post } from '@/payload-types'
import { getServerSideURL } from '@/lib/getURL'
import { isSuperAdminUser } from '@/access/isSuperAdmin'

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Payload Website Template` : 'Payload Website Template'
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

const basePlugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formOverrides: {
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
  }),
  searchPlugin({
    collections: ['posts'],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
    },
  }),
  mcpPlugin({
    collections: {
      pages: {
        description: 'Website pages built from layout blocks',
        enabled: true,
      },
      posts: {
        description: 'Blog posts with rich text content and categories',
        enabled: true,
      },
      categories: {
        description: 'Nested categories used to group posts',
        enabled: true,
      },
      media: {
        description: 'Uploaded images and files',
        enabled: { find: true },
      },
      header: {
        description: 'Per-tenant site header navigation',
        enabled: { find: true },
      },
      footer: {
        description: 'Per-tenant site footer navigation',
        enabled: { find: true },
      },
    },
  }),
]

// Applied last so it also scopes the collections the plugins above add (forms, redirects, search).
const tenantScoping = multiTenantPlugin({
  collections: {
    pages: {},
    posts: {},
    media: {},
    categories: {},
    forms: {},
    'form-submissions': {},
    redirects: {},
    search: {},
    header: { isGlobal: true },
    footer: { isGlobal: true },
  },
  tenantsSlug: 'tenants',
  userHasAccessToAllTenants: isSuperAdminUser,
})

export const plugins: Plugin[] = [...basePlugins, tenantScoping]
