import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { Amenities } from '../../blocks/Amenities/config'
import { AreaGuide } from '../../blocks/AreaGuide/config'
import { AvailabilitySearch } from '../../blocks/AvailabilitySearch/config'
import { BookingSteps } from '../../blocks/BookingSteps/config'
import { Archive } from '../../blocks/ArchiveBlock/config'
import { CallToAction } from '../../blocks/CallToAction/config'
import { Content } from '../../blocks/Content/config'
import { FAQ } from '../../blocks/FAQ/config'
import { FormBlock } from '../../blocks/Form/config'
import { Gallery } from '../../blocks/Gallery/config'
import { Location } from '../../blocks/Location/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { Newsletter } from '../../blocks/Newsletter/config'
import { OwnerCta } from '../../blocks/OwnerCta/config'
import { Pricing } from '../../blocks/Pricing/config'
import { Promos } from '../../blocks/Promos/config'
import { PropertyDetail } from '../../blocks/PropertyDetail/config'
import { PropertyListing } from '../../blocks/PropertyListing/config'
import { ReviewsFeed } from '../../blocks/ReviewsFeed/config'
import { Section } from '../../blocks/Section/config'
import { Testimonials } from '../../blocks/Testimonials/config'
import { hero } from '@/heros/config'
import { slugField } from 'payload'
import { populatePublishedAt } from '../hooks/populatePublishedAt'
import { generatePreviewPath } from '@/seo/generatePreviewPath'
import { revalidateDelete, revalidatePage } from './hooks/revalidatePage'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  // This config controls what's populated by default when a page is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'pages'>
  defaultPopulate: {
    title: true,
    slug: true,
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    components: {
      views: {
        edit: {
          // Visual editor as a document tab: same layout data, same access rules.
          visual: {
            path: '/visual',
            Component: '@/components/admin/VisualEditorView#VisualEditorView',
            tab: { label: 'Visual editor', href: '/visual', order: 150 },
          },
        },
      },
    },
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'pages',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'pages',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [hero],
          label: 'Hero',
        },
        {
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [
                Section,
                Content,
                MediaBlock,
                CallToAction,
                FormBlock,
                Gallery,
                Amenities,
                Location,
                Pricing,
                Testimonials,
                FAQ,
                Archive,
                AvailabilitySearch,
                PropertyListing,
                PropertyDetail,
                ReviewsFeed,
                Promos,
                BookingSteps,
                OwnerCta,
                AreaGuide,
                Newsletter,
              ],
              required: true,
              admin: {
                initCollapsed: true,
              },
            },
          ],
          label: 'Content',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    slugField(),
  ],
  hooks: {
    afterChange: [revalidatePage],
    beforeChange: [populatePublishedAt],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
