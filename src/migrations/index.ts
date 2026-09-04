import * as migration_20260904_122321_initial from './20260904_122321_initial';

export const migrations = [
  {
    up: migration_20260904_122321_initial.up,
    down: migration_20260904_122321_initial.down,
    name: '20260904_122321_initial'
  },
];
