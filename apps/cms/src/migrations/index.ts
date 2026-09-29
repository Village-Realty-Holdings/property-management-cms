import * as migration_20260925_141623_cp2_model from "./20260925_141623_cp2_model"
import * as migration_20260925_145103_cp3_site from "./20260925_145103_cp3_site"
import * as migration_20260925_153003_cp4_site_pages from "./20260925_153003_cp4_site_pages"
import * as migration_20260928_193644_cp5_admin_ux from "./20260928_193644_cp5_admin_ux"
import * as migration_20260929_013055_tuck_in from "./20260929_013055_tuck_in"
import * as migration_20260929_050448_preview_in_cms from "./20260929_050448_preview_in_cms"

export const migrations = [
  {
    up: migration_20260925_141623_cp2_model.up,
    down: migration_20260925_141623_cp2_model.down,
    name: "20260925_141623_cp2_model",
  },
  {
    up: migration_20260925_145103_cp3_site.up,
    down: migration_20260925_145103_cp3_site.down,
    name: "20260925_145103_cp3_site",
  },
  {
    up: migration_20260925_153003_cp4_site_pages.up,
    down: migration_20260925_153003_cp4_site_pages.down,
    name: "20260925_153003_cp4_site_pages",
  },
  {
    up: migration_20260928_193644_cp5_admin_ux.up,
    down: migration_20260928_193644_cp5_admin_ux.down,
    name: "20260928_193644_cp5_admin_ux",
  },
  {
    up: migration_20260929_013055_tuck_in.up,
    down: migration_20260929_013055_tuck_in.down,
    name: "20260929_013055_tuck_in",
  },
  {
    up: migration_20260929_050448_preview_in_cms.up,
    down: migration_20260929_050448_preview_in_cms.down,
    name: "20260929_050448_preview_in_cms",
  },
]
