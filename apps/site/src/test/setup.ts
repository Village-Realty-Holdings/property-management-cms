import { config } from "dotenv"

// Same env as `next dev`: apps/site/.env. Variables already set win.
config({ quiet: true })

process.env.PAYLOAD_SECRET ||= "test-secret"

// Every getTestPayload() pushes the schema to a fresh database. Without this,
// Drizzle skips the push when the schema matches one already pushed in this
// process. Set here only, so it is not a turbo task input.
// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = "true"

// jsdom has no matchMedia, which sonner's Toaster asks for to follow the
// colour scheme. Every real browser has it.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

// jsdom has no IntersectionObserver or ResizeObserver, which Embla (the
// carousel Blocks) starts with. Nothing in jsdom has a layout to observe.
if (typeof window !== "undefined") {
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  Object.assign(globalThis, {
    IntersectionObserver: globalThis.IntersectionObserver ?? Observer,
    ResizeObserver: globalThis.ResizeObserver ?? Observer,
  })
}
