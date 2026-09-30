import * as migration_20260930_082130_initial from './20260930_082130_initial';

export const migrations = [
  {
    up: migration_20260930_082130_initial.up,
    down: migration_20260930_082130_initial.down,
    name: '20260930_082130_initial'
  },
];
