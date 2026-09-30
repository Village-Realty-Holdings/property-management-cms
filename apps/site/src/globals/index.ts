import type { GlobalConfig } from "payload"

import { Brand } from "./Brand"
import { SEO } from "./SEO"

/** Every global registered with Payload. */
export const globals: GlobalConfig[] = [Brand, SEO]
