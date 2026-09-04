import * as migration_20260904_122321_initial from './20260904_122321_initial';
import * as migration_20260904_124212_site_settings from './20260904_124212_site_settings';

export const migrations = [
  {
    up: migration_20260904_122321_initial.up,
    down: migration_20260904_122321_initial.down,
    name: '20260904_122321_initial',
  },
  {
    up: migration_20260904_124212_site_settings.up,
    down: migration_20260904_124212_site_settings.down,
    name: '20260904_124212_site_settings'
  },
];
