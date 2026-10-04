import type { Block } from "payload"

import { surfaceFields } from "../fields/background"

/** Guest quotes, each with a name, a role line and a star rating. */
export const Testimonials: Block = {
  slug: "testimonials",
  interfaceName: "TestimonialsBlock",
  labels: { singular: "Testimonials", plural: "Testimonials" },
  fields: [
    { name: "heading", type: "text", required: true },
    {
      name: "variant",
      label: "Layout",
      type: "select",
      required: true,
      defaultValue: "carousel",
      options: [
        { label: "Carousel", value: "carousel" },
        { label: "Grid", value: "grid" },
      ],
    },
    {
      name: "testimonials",
      type: "array",
      required: true,
      minRows: 2,
      maxRows: 12,
      labels: { singular: "Testimonial", plural: "Testimonials" },
      defaultValue: [
        {
          quote:
            "A spotless home, a warm welcome and a view we still talk about.",
          name: "Alex Morgan",
          role: "Stayed for a week in June",
          rating: 5,
        },
        {
          quote: "Easy to book, and the team answered every question quickly.",
          name: "Sam Rivera",
          role: "Family trip",
          rating: 5,
        },
      ],
      fields: [
        { name: "quote", type: "textarea", required: true },
        { name: "name", type: "text", required: true },
        {
          name: "role",
          label: "Role line",
          type: "text",
          required: true,
          admin: {
            description: 'Under the name, such as "Stayed for a week in June".',
          },
        },
        {
          name: "rating",
          label: "Star rating",
          type: "number",
          required: true,
          min: 1,
          max: 5,
          defaultValue: 5,
          admin: { step: 1, description: "From 1 to 5 stars." },
        },
      ],
    },
    ...surfaceFields,
  ],
}
