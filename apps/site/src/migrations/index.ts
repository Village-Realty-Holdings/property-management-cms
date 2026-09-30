import * as migration_20260930_082130_initial from './20260930_082130_initial';
import * as migration_20260930_122835_theme from './20260930_122835_theme';
import * as migration_20260930_173446_layouts_collection from './20260930_173446_layouts_collection';
import * as migration_20260930_174400_page_layout_field from './20260930_174400_page_layout_field';
import * as migration_20260930_174953_background from './20260930_174953_background';

export const migrations = [
  {
    up: migration_20260930_082130_initial.up,
    down: migration_20260930_082130_initial.down,
    name: '20260930_082130_initial',
  },
  {
    up: migration_20260930_122835_theme.up,
    down: migration_20260930_122835_theme.down,
    name: '20260930_122835_theme',
  },
  {
    up: migration_20260930_173446_layouts_collection.up,
    down: migration_20260930_173446_layouts_collection.down,
    name: '20260930_173446_layouts_collection',
  },
  {
    up: migration_20260930_174400_page_layout_field.up,
    down: migration_20260930_174400_page_layout_field.down,
    name: '20260930_174400_page_layout_field',
  },
  {
    up: migration_20260930_174953_background.up,
    down: migration_20260930_174953_background.down,
    name: '20260930_174953_background'
  },
];
