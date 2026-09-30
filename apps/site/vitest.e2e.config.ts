import { fileURLToPath } from "node:url"

import { BaseSequencer } from "vitest/node"
import { defineConfig } from "vitest/config"

/** Runs the spec files in name order (see e2e/theme/*.e2e.ts). */
class ByName extends BaseSequencer {
  override async sort(files: Parameters<BaseSequencer["sort"]>[0]) {
    return [...files].sort((a, b) => a.moduleId.localeCompare(b.moduleId))
  }
}

/**
 * The browser acceptance tests (e2e/**). They start the real Site against a
 * scratch schema and drive it with Chromium, so they are not part of
 * `pnpm check`: run them with `pnpm --filter site test:e2e` (see
 * e2e/theme/support/env.ts for what they need).
 */
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL("./src/test/serverOnly.ts", import.meta.url)
      ),
      "@payload-config": fileURLToPath(
        new URL("./src/payload.config.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "node",
    include: ["e2e/**/*.e2e.ts"],
    globalSetup: ["./e2e/theme/support/globalSetup.ts"],
    // One Site, one schema: the specs share it and run one after another.
    fileParallelism: false,
    sequence: { sequencer: ByName },
    // The first hit on a route compiles it.
    testTimeout: 180_000,
    hookTimeout: 300_000,
  },
})
