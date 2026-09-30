import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  // Component tests import .tsx files; tsconfig keeps JSX for Next to compile.
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
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    // Each test file starts Payload and pushes the schema to a new database.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
})
