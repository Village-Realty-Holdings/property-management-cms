"use client"

/** Where the skip link lands: `#admin-main` if the page has it, else `<main>`. */
export const MAIN_CONTENT_ID = "admin-main"

/**
 * "Skip to content": the first stop for keyboard users, hidden until focused.
 * Moves focus to the main region so the next Tab starts inside the page and
 * not back in the sidebar. Works with a plain `<main>`; give the region
 * `id="admin-main"` to be explicit.
 */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only rounded-lg bg-background px-4 py-2 text-sm font-medium text-foreground shadow-lg ring-2 ring-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]"
      onClick={(event) => {
        const main =
          document.getElementById(MAIN_CONTENT_ID) ??
          document.querySelector<HTMLElement>("main")
        if (!main) return
        event.preventDefault()
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1")
        main.focus()
        main.scrollIntoView?.()
      }}
    >
      Skip to content
    </a>
  )
}
