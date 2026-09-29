import type { Page } from "@workspace/cms-types"

import { paragraph, richText } from "../lexical"

type Layout = NonNullable<Page["layout"]>

/**
 * The Tuck-In Page Template (CONTEXT.md): a Former Brand (the Site) joins a
 * Client. Copy adapted from pclodge-landing, written with Variables so it
 * fits any Site: `{site}` is the Former Brand, `{client}` and `{client-url}`
 * the Client. Editors rewrite it after the Page is created.
 */
export function tuckInLayout(): Layout {
  return [
    {
      blockType: "announcement",
      headline: "{site} Joins {client}!",
    },
    {
      blockType: "audience",
      audience: "owners",
      title: "What Owners Can Expect",
      intro: richText(
        "{client} is thrilled to welcome {site} to the {client} family. This partnership is designed to elevate your ownership experience while building on the service and care you already know.",
        "{client} is powered by passionate local teams who specialize in delivering exceptional stays. As an owner, you'll benefit from enhanced services, expanded marketing reach, and an unwavering focus on maximizing your property's revenue."
      ),
      points: [
        {
          title: "Proven Property Management",
          text: richText(
            paragraph(
              "Leverage {client}'s deep experience ",
              { label: "managing a robust portfolio", url: "{client-url}" },
              " of vacation rentals. Our dedicated operations team keeps your property guest-ready, protected, and performing at its best."
            )
          ),
        },
        {
          title: "More Visibility, More Bookings",
          text: richText(
            "Access powerful, combined marketing and a specialized revenue team focused on growing your occupancy and nightly rates. Your property will be showcased across top channels to attract more qualified guests and generate stronger returns."
          ),
        },
        {
          title: "Dedicated Owner Support",
          text: richText(
            "Work directly with {client}'s owner support team, who provide personalized support, proactive communication, and guidance to keep your property well-maintained and consistently profitable."
          ),
        },
      ],
      closing:
        "We're excited to begin this new chapter with you and to show how partnering with {client} can take your vacation rental business to the next level.",
      cta: { label: "Learn More", href: "{client-url}" },
    },
    {
      blockType: "audience",
      audience: "guests",
      title: "Welcome, Guests!",
      intro: richText(
        "{site} is now part of the {client} family, and we're excited to welcome you to this next chapter of your getaways."
      ),
      points: [
        {
          title: "What This Means for You",
          text: richText(
            "Your bookings are secure. All existing reservations are confirmed, and you'll continue to receive the reliable service you're used to."
          ),
        },
        {
          title: "The Same Experience You Love",
          text: richText(
            "{site} and {client} share a commitment to exceptional guest experiences, so you can expect the same comfort, cleanliness, and hospitality."
          ),
        },
        {
          title: "A Greater Selection of Stays",
          text: richText(
            paragraph(
              "Choose from a ",
              {
                label: "wide variety of homes and condos",
                url: "{client-url}",
              },
              " with the space, amenities, and style that fit your ideal vacation."
            )
          ),
        },
      ],
      cta: { label: "Explore Our Properties", href: "{client-url}" },
    },
    {
      blockType: "contact",
      title: "We're Here to Help",
      text: "Have questions about an existing or future stay? Reach us at",
      phone: "{phone}",
      email: "{email}",
    },
  ] as Layout
}

export const tuckInSeo = {
  title: "{site} Joins {client}",
  description:
    "{site} is now part of {client}. Owners and guests: here's what the change means for you.",
}
