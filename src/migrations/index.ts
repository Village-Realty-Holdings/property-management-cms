import * as migration_20260904_122321_initial from './20260904_122321_initial';
import * as migration_20260904_124212_site_settings from './20260904_124212_site_settings';
import * as migration_20260904_132302_theme_preset from './20260904_132302_theme_preset';
import * as migration_20260908_163841_hero_block from './20260908_163841_hero_block';
import * as migration_20260908_170837_tenant_branding from './20260908_170837_tenant_branding';

export const migrations = [
  {
    up: migration_20260904_122321_initial.up,
    down: migration_20260904_122321_initial.down,
    name: '20260904_122321_initial',
  },
  {
    up: migration_20260904_124212_site_settings.up,
    down: migration_20260904_124212_site_settings.down,
    name: '20260904_124212_site_settings',
  },
  {
    up: migration_20260904_132302_theme_preset.up,
    down: migration_20260904_132302_theme_preset.down,
    name: '20260904_132302_theme_preset',
  },
  {
    up: migration_20260908_163841_hero_block.up,
    down: migration_20260908_163841_hero_block.down,
    name: '20260908_163841_hero_block',
  },
  {
    up: migration_20260908_170837_tenant_branding.up,
    down: migration_20260908_170837_tenant_branding.down,
    name: '20260908_170837_tenant_branding',
  },
];
