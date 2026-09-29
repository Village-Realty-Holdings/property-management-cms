/**
 * Awayday CMS branding for the admin: `graphics.Icon` (nav and breadcrumb
 * mark), `graphics.Logo` (login screen) and `beforeLogin`. Plain SVG and
 * text, no external assets; public/favicon.svg is the same mark.
 */

function Mark({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 32 32"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#0f766e" height="32" rx="8" width="32" />
      <path d="M9 19a7 7 0 0 1 14 0z" fill="#fbbf24" />
      <path
        d="M6 22.5h20"
        stroke="#fff"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M10.5 26h11"
        stroke="#fff"
        strokeLinecap="round"
        strokeOpacity=".7"
        strokeWidth="2"
      />
    </svg>
  )
}

export function Icon() {
  return <Mark size={24} />
}

export function Logo() {
  return (
    <div className="awayday-logo">
      <Mark size={44} />
      <span className="awayday-logo__name">Awayday</span>
      <span className="awayday-logo__product">CMS</span>
    </div>
  )
}

export function BeforeLogin() {
  return (
    <p className="awayday-login-intro">
      Sign in to edit Pages, Guides and Properties, and to answer Submissions
      for your Sites.
    </p>
  )
}
