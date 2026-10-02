import { fileURLToPath } from "node:url"

import type { ThemeInputs } from "../theme"
import type { SeedModule } from "./index"
import type { PageData } from "./upsert"

/**
 * The seed of the `nxt_feedback_landing` Site: NXT Vacation's guest feedback
 * page. One Page, Home: the Guest feedback survey Block on NXT's navy, which
 * asks a guest how their stay was, sends a happy guest to leave a review and
 * gives the others a short form for guest care (ADR-0010). The Layout is the
 * logo, centred, above, and one line below: the copyright, the privacy
 * policy and the phone number.
 *
 * The words, colours and fonts are the reference page's
 * (https://nxt-guest-survey.vercel.app: `config.js`, `tokens.css`), which
 * took them from nxtvacation.com. The logo and the sun mark in
 * seed/nxt-feedback-landing/ are that page's files.
 */

const seedDir = fileURLToPath(
  new URL("../../seed/nxt-feedback-landing/", import.meta.url)
)

const BRAND = "NXT Vacation"
const PHONE = { display: "(619) 357-6854", tel: "+16193576854" }

/**
 * Where a happy guest is sent. The reference has a placeholder here; this is
 * the link nxtvacation.com gives for NXT Vacation on Google, which may be
 * the Business Profile and not the review form. NXT is to confirm it.
 */
const REVIEW_URL = "https://share.google/IS79HaqjI7S4fvblJ"

/**
 * NXT's navy and sun yellow, Josefin Sans headings over Cardo text, square
 * uppercase buttons. The navy is the primary and the dark surface; the yellow
 * is the accent, which paints the stars and the buttons.
 */
const theme = (josefin: string, cardo: string): ThemeInputs => ({
  primary: "#0e1a24",
  accent: "#e9ea72",
  third: "#559cd4",
  text: "#0e1a24",
  darkSurface: "#0e1a24",
  neutralTint: "cool",
  headingFont: josefin,
  bodyFont: cardo,
  headingWeight: "bold",
  headingCase: "normal",
  buttonCorners: "square",
  cardCorners: "square",
  spacing: "comfortable",
  shadows: "none",
  buttonStyle: "solid",
  buttonLetters: "uppercase",
  buttonWeight: "bold",
  buttonText: "auto",
  motion: "subtle",
})

function home(): PageData {
  return {
    path: "/",
    title: "How was your stay?",
    seo: {
      description:
        "Tell NXT Vacation how your stay was. It takes about ten seconds and helps us take better care of every guest.",
    },
    blocks: [
      {
        blockType: "guestSurvey",
        heading: "How was your stay with NXT?",
        intro:
          "This takes about ten seconds and helps us take better care of every guest.",
        reviewFrom: "4",
        phone: PHONE.display,
        positive: {
          heading: "We’re so glad you enjoyed your stay.",
          text: "Would you take a minute to share it on Google? It helps other travelers find us.",
          reviewUrl: REVIEW_URL,
          buttonLabel: "Leave a Google review",
          laterLabel: "Maybe later",
        },
        thanks: {
          heading: "Thanks for staying with NXT.",
          text: "We hope to welcome you back soon.",
        },
        negative: {
          heading: "We’re sorry your stay wasn’t what you expected.",
          text: "Tell us what happened and our guest care team will follow up.",
          messageLabel: "How could we have improved your stay?",
          // The reference asks for a name and an email, and nothing more.
          formFields: ["name", "email"],
          consentLabel: "It’s okay for NXT to contact me about this.",
          submitLabel: "Send feedback",
        },
        success: {
          heading:
            "Thank you. Our team has your feedback and will be in touch.",
          text: "Prefer to talk now? Call us at {phone}.",
        },
        failure: {
          heading: "We couldn’t send your feedback.",
          text: "Something went wrong on our end and nothing was sent. Your answers are saved for when you try again, or call us at {phone}.",
        },
        background: "dark",
        textColour: "auto",
      },
    ],
  }
}

export const seed: SeedModule = async (seed) => {
  // nxtvacation.com sets headings in Josefin Sans and text in Cardo.
  await seed.font({
    family: "Josefin Sans",
    kind: "sans",
    weights: [400, 600, 700],
  })
  await seed.font({ family: "Cardo", kind: "serif", weights: [400, 700] })
  await seed.theme(
    theme(await seed.fontKey("Josefin Sans"), await seed.fontKey("Cardo"))
  )

  const logo = await seed.media({
    file: `${seedDir}nxt-wordmark-navy.png`,
    alt: BRAND,
    credit: BRAND,
  })
  const sun = await seed.media({
    file: `${seedDir}nxt-sun-mark.png`,
    alt: `${BRAND} sun mark`,
    credit: BRAND,
  })

  await seed.brand({
    name: BRAND,
    logo: logo.id,
    contact: { phone: PHONE.display },
  })

  await seed.seo({
    titlePattern: "%s | {name}",
    description:
      "Tell NXT Vacation how your stay was. It takes about ten seconds and helps us take better care of every guest.",
    favicon: sun.id,
    // A survey guests are sent a link to: not for search engines.
    allowIndexing: false,
  })

  await seed.page(home())

  await seed.layout({
    name: "Default",
    isDefault: true,
    paths: [],
    header: [
      {
        // The logo, in the centre, with no line under it.
        blockType: "container",
        columns: "1",
        gap: "medium",
        align: "centre",
        justify: "centre",
        width: "page",
        background: "default",
        children: [{ blockType: "logo", size: "xlarge", showTagline: false }],
      },
    ],
    footer: [
      {
        // One line, in the centre, on the page's own white.
        blockType: "container",
        columns: "1",
        gap: "medium",
        align: "centre",
        justify: "centre",
        width: "page",
        background: "default",
        children: [
          {
            blockType: "legalBar",
            text: "© {year} {name}",
            links: [
              {
                label: "Privacy Policy",
                link: {
                  type: "url",
                  url: "https://www.nxtvacation.com/privacy/",
                },
              },
              {
                label: PHONE.display,
                link: { type: "url", url: `tel:${PHONE.tel}` },
              },
            ],
          },
        ],
      },
    ],
  })
}
