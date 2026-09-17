// Scene card: pick ET's sprite, the player's sprite, and the palette.
// The demo scene's stand-in for real document settings — in Phase 1 these
// become user-editable stamps and palettes.

import * as stylex from '@stylexjs/stylex';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';
import {
  ET_SPRITES,
  PLAYER_SPRITES,
  SYNTAX_THEMES,
  themeById,
  type SceneConfig,
  type Sprite,
  type SyntaxTheme,
} from './scene.ts';

const styles = stylex.create({
  optionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  sprite: {
    appearance: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '6px 8px',
    backgroundColor: 'var(--gd-bg2)',
    border: '1px solid var(--gd-border)',
    borderRadius: 8,
    cursor: 'pointer',
  },
  spriteActive: {
    borderColor: 'var(--gd-accent)',
    backgroundColor: 'var(--gd-bg3)',
  },
  spriteArt: {
    fontFamily: 'var(--gd-mono)',
    fontSize: 5,
    lineHeight: 1.25,
    margin: 0,
    whiteSpace: 'pre',
  },
  theme: {
    appearance: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '6px 8px',
    backgroundColor: 'var(--gd-bg2)',
    border: '1px solid var(--gd-border)',
    borderRadius: 8,
    cursor: 'pointer',
    minWidth: 64,
  },
  themeActive: {
    borderColor: 'var(--gd-accent)',
    backgroundColor: 'var(--gd-bg3)',
  },
  themeChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '4px 7px',
    borderRadius: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    display: 'inline-block',
  },
});

function SpriteOption({
  sprite,
  fg,
  selected,
  onSelect,
}: {
  sprite: Sprite;
  fg: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      {...stylex.props(styles.sprite, selected && styles.spriteActive)}
      onClick={onSelect}
      title={sprite.name}
      aria-pressed={selected}
    >
      <pre {...stylex.props(styles.spriteArt)} style={{ color: fg }} aria-hidden="true">
        {sprite.frames[0].join('\n')}
      </pre>
      <Text type="label" size="3xs" color={selected ? 'accent' : 'secondary'}>
        {sprite.name}
      </Text>
    </button>
  );
}

function ThemeOption({
  theme,
  selected,
  onSelect,
}: {
  theme: SyntaxTheme;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      {...stylex.props(styles.theme, selected && styles.themeActive)}
      onClick={onSelect}
      title={theme.name}
      aria-pressed={selected}
    >
      <span
        {...stylex.props(styles.themeChip)}
        style={{ backgroundColor: theme.bg }}
        aria-hidden="true"
      >
        <span {...stylex.props(styles.dot)} style={{ backgroundColor: theme.invader }} />
        <span {...stylex.props(styles.dot)} style={{ backgroundColor: theme.player }} />
        <span {...stylex.props(styles.dot)} style={{ backgroundColor: theme.star }} />
      </span>
      <Text type="label" size="3xs" color={selected ? 'accent' : 'secondary'}>
        {theme.name}
      </Text>
    </button>
  );
}

export default function ScenePanel({
  scene,
  onChange,
}: {
  scene: SceneConfig;
  onChange: (patch: Partial<SceneConfig>) => void;
}) {
  const theme = themeById(scene.theme);
  return (
    <Card padding={3}>
      <VStack gap={2}>
        <Heading level={4}>Scene</Heading>
        <VStack gap={1}>
          <Text type="label" color="disabled">
            Invader
          </Text>
          <div {...stylex.props(styles.optionRow)} role="group" aria-label="Invader sprite">
            {ET_SPRITES.map((s) => (
              <SpriteOption
                key={s.id}
                sprite={s}
                fg={theme.invader}
                selected={scene.et === s.id}
                onSelect={() => onChange({ et: s.id })}
              />
            ))}
          </div>
        </VStack>
        <VStack gap={1}>
          <Text type="label" color="disabled">
            Player
          </Text>
          <div {...stylex.props(styles.optionRow)} role="group" aria-label="Player sprite">
            {PLAYER_SPRITES.map((s) => (
              <SpriteOption
                key={s.id}
                sprite={s}
                fg={theme.player}
                selected={scene.player === s.id}
                onSelect={() => onChange({ player: s.id })}
              />
            ))}
          </div>
        </VStack>
        <VStack gap={1}>
          <Text type="label" color="disabled">
            Syntax theme
          </Text>
          <div {...stylex.props(styles.optionRow)} role="group" aria-label="Syntax theme">
            {SYNTAX_THEMES.map((t) => (
              <ThemeOption
                key={t.id}
                theme={t}
                selected={scene.theme === t.id}
                onSelect={() => onChange({ theme: t.id })}
              />
            ))}
          </div>
        </VStack>
        <Text type="supporting" color="disabled">
          Demo actors & palette — real stamps and palettes arrive in Phase 1.
        </Text>
      </VStack>
    </Card>
  );
}
