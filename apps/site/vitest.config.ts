import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    // Each test file starts Payload and pushes the schema to a new database.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
})
