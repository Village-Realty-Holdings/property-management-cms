import type { Block } from 'payload'

export const Newsletter: Block = {
  slug: 'newsletter',
  interfaceName: 'NewsletterBlock',
  labels: { singular: 'Newsletter Signup', plural: 'Newsletter Signups' },
  admin: {
    group: 'Capture',
    images: { thumbnail: '/admin/blocks/newsletter.svg' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Subscribe to our emails',
    },
    {
      name: 'text',
      type: 'textarea',
      defaultValue: 'Specials, new homes and local events, about twice a month. No spam.',
    },
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: true,
      admin: {
        description:
          'The form that receives the email. Create one with a single email field; submissions land in Form Submissions like any other form.',
      },
    },
    {
      name: 'buttonLabel',
      type: 'text',
      defaultValue: 'Subscribe',
    },
    {
      name: 'successMessage',
      type: 'text',
      defaultValue: 'Thanks! Check your inbox to confirm.',
    },
    {
      name: 'tone',
      type: 'select',
      defaultValue: 'band',
      options: [
        { label: 'Full-width band', value: 'band' },
        { label: 'Inline card', value: 'card' },
      ],
    },
  ],
}
