import * as migration_20260930_081622_initial from './20260930_081622_initial';

export const migrations = [
  {
    up: migration_20260930_081622_initial.up,
    down: migration_20260930_081622_initial.down,
    name: '20260930_081622_initial'
  },
];
