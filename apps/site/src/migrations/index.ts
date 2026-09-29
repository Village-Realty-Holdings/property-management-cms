import * as migration_20260929_230545_initial from './20260929_230545_initial';

export const migrations = [
  {
    up: migration_20260929_230545_initial.up,
    down: migration_20260929_230545_initial.down,
    name: '20260929_230545_initial'
  },
];
