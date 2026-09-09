import * as migration_20260908_220302_initial from './20260908_220302_initial';

export const migrations = [
  {
    up: migration_20260908_220302_initial.up,
    down: migration_20260908_220302_initial.down,
    name: '20260908_220302_initial'
  },
];
