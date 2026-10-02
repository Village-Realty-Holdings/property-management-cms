import * as migration_20260930_082130_initial from './20260930_082130_initial';
import * as migration_20260930_122835_theme from './20260930_122835_theme';
import * as migration_20260930_173446_layouts_collection from './20260930_173446_layouts_collection';
import * as migration_20260930_174400_page_layout_field from './20260930_174400_page_layout_field';
import * as migration_20260930_174953_background from './20260930_174953_background';
import * as migration_20260930_180319_block_schemas_a from './20260930_180319_block_schemas_a';
import * as migration_20260930_181401_block_schemas_b from './20260930_181401_block_schemas_b';
import * as migration_20260930_184444_media_attribution from './20260930_184444_media_attribution';
import * as migration_20261001_230649_page_is_template from './20261001_230649_page_is_template';
import * as migration_20261002_000500_rich_text_width from './20261002_000500_rich_text_width';
import * as migration_20261002_005526_container_blocks from './20261002_005526_container_blocks';
import * as migration_20261002_012541_button_image_blocks from './20261002_012541_button_image_blocks';
import * as migration_20261002_162507_saved_themes from './20261002_162507_saved_themes';
import * as migration_20261002_180704_guest_survey_block from './20261002_180704_guest_survey_block';
import * as migration_20261002_204427_region_containers from './20261002_204427_region_containers';
import * as migration_20261002_210426_theme_button_text from './20261002_210426_theme_button_text';

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
    name: '20260930_174953_background',
  },
  {
    up: migration_20260930_180319_block_schemas_a.up,
    down: migration_20260930_180319_block_schemas_a.down,
    name: '20260930_180319_block_schemas_a',
  },
  {
    up: migration_20260930_181401_block_schemas_b.up,
    down: migration_20260930_181401_block_schemas_b.down,
    name: '20260930_181401_block_schemas_b',
  },
  {
    up: migration_20260930_184444_media_attribution.up,
    down: migration_20260930_184444_media_attribution.down,
    name: '20260930_184444_media_attribution',
  },
  {
    up: migration_20261001_230649_page_is_template.up,
    down: migration_20261001_230649_page_is_template.down,
    name: '20261001_230649_page_is_template',
  },
  {
    up: migration_20261002_000500_rich_text_width.up,
    down: migration_20261002_000500_rich_text_width.down,
    name: '20261002_000500_rich_text_width',
  },
  {
    up: migration_20261002_005526_container_blocks.up,
    down: migration_20261002_005526_container_blocks.down,
    name: '20261002_005526_container_blocks',
  },
  {
    up: migration_20261002_012541_button_image_blocks.up,
    down: migration_20261002_012541_button_image_blocks.down,
    name: '20261002_012541_button_image_blocks',
  },
  {
    up: migration_20261002_162507_saved_themes.up,
    down: migration_20261002_162507_saved_themes.down,
    name: '20261002_162507_saved_themes',
  },
  {
    up: migration_20261002_180704_guest_survey_block.up,
    down: migration_20261002_180704_guest_survey_block.down,
    name: '20261002_180704_guest_survey_block',
  },
  {
    up: migration_20261002_204427_region_containers.up,
    down: migration_20261002_204427_region_containers.down,
    name: '20261002_204427_region_containers',
  },
  {
    up: migration_20261002_210426_theme_button_text.up,
    down: migration_20261002_210426_theme_button_text.down,
    name: '20261002_210426_theme_button_text'
  },
];
