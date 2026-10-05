import { crc32 } from "node:zlib"

/**
 * A stable `registryUserId` for a test User made straight in this Site's
 * `users` collection, without a Registry User behind it. Tests that go
 * through the Local API with `overrideAccess: false` never ask the Registry.
 */
export const testRegistryUserId = (key: string) => (crc32(key) % 900_000) + 1000
