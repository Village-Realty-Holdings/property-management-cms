import * as migration_20260904_122321_initial from './20260904_122321_initial';
import * as migration_20260904_124212_site_settings from './20260904_124212_site_settings';
import * as migration_20260904_132302_theme_preset from './20260904_132302_theme_preset';

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
    name: '20260904_132302_theme_preset'
  },
];
