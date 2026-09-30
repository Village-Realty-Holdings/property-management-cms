import type { GlobalConfig } from "payload"

import { Brand } from "./Brand"
import { SEO } from "./SEO"
import { Theme } from "./Theme"

/** Every global registered with Payload. */
export const globals: GlobalConfig[] = [Brand, SEO, Theme]
