import { telHref } from "../theme/branding"

import { str } from "./lib"
import { tuckInLink } from "./tuck-in-cta"
import { tuckInContainer, type BlockRendererProps } from "./types"

/**
 * Contact: a title, a line of copy and the phone and email, usually
 * `{phone}` and `{email}` from Site Settings. Missing values are left out.
 */
export function ContactBlock({ block }: BlockRendererProps) {
  const title = str(block.title)
  const text = str(block.text)
  const phone = str(block.phone)
  const email = str(block.email)
  const phoneHref = phone ? telHref(phone) : null
  const hasPhone = phone && phoneHref && phoneHref !== "tel:"
  const hasEmail = email && email.includes("@")
  if (!title && !hasPhone && !hasEmail) return null

  return (
    <section className={`${tuckInContainer} pt-10 leading-relaxed`}>
      <p>
        {title && <strong className="block font-bold">{title}</strong>}
        {text}
        {(hasPhone || hasEmail) && " "}
        {hasPhone && (
          <a href={phoneHref} className={tuckInLink}>
            {phone}
          </a>
        )}
        {hasPhone && hasEmail && " or "}
        {hasEmail && (
          <a href={`mailto:${email}`} className={tuckInLink}>
            {email}
          </a>
        )}
        {(hasPhone || hasEmail) && "."}
      </p>
    </section>
  )
}
