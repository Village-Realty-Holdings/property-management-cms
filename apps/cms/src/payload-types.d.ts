import type { Config } from "@workspace/cms-types"

// The generated types live in packages/cms-types (typescript.declare: false),
// so the package stays free of a `payload` dependency. This augmentation
// gives apps/cms typed collection slugs and documents.
declare module "payload" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface GeneratedTypes extends Config {}
}
