import * as stylex from '@stylexjs/stylex';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { IconButton } from '@astryxdesign/core/IconButton';
import { IconClose } from './icons';
import {
  ET_SPRITES,
  PLAYER_SPRITES,
  CRITTER_SPRITES,
  SPACE_SPRITES,
  NATURE_SPRITES,
  PLAY_SPRITES,
  themeById,
} from './scene.ts';
import { kindSwatchKey } from './stamps.ts';
import type { DocState } from './document.ts';
import type { Action } from './actions.ts';
import type { Brush } from './brush.ts';

// Tool options live in popovers anchored to the toolbar now (brush glyph,
// colors, stamp library) instead of the side panel. Domain-specific
// pickers (glyph cells, color swatches, stamp thumbnails) have no Astryx
// equivalent — kept as plain buttons inside the Astryx Popover surface.
const styles = stylex.create({
  pop: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    // The stamp library is long: cap the popover and scroll inside it.
    maxHeight: 'min(70dvh, 520px)',
    overflowY: 'auto',
  },
  glyphGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: 4,
    minWidth: 264,
  },
  glyph: {
    appearance: 'none',
    border: '1px solid transparent',
    backgroundColor: 'var(--color-background-surface)',
    color: 'var(--color-text-secondary)',
    borderRadius: 6,
    fontFamily: 'var(--font-family-code)',
    fontSize: 14,
    height: 30,
    cursor: 'pointer',
    ':hover': { borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' },
  },
  glyphActive: { borderColor: 'var(--gd-invader)', color: 'var(--gd-invader)' },
  swatchRow: { display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' },
  swatch: {
    appearance: 'none',
    width: 22,
    height: 22,
    borderRadius: 6,
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    padding: 0,
  },
  swatchActive: { outline: '2px solid var(--color-text-primary)', outlineOffset: 1 },
  stampGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    minWidth: 280,
    // Mobile: 4-up so a whole category fits in a row or two.
    '@media (max-width: 760px)': {
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 6,
      minWidth: 0,
    },
  },
  stamp: {
    appearance: 'none',
    backgroundColor: 'var(--color-background-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: 8,
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    ':hover': { borderColor: 'var(--color-text-disabled)' },
    '@media (max-width: 760px)': {
      padding: 6,
      gap: 0,
      borderRadius: 6,
      alignItems: 'center',
    },
  },
  stampActive: {
    borderColor: 'var(--gd-accent)',
    boxShadow: '0 0 0 1px var(--gd-accent)',
  },
  stampArt: {
    fontFamily: 'var(--font-family-code)',
    fontSize: 11,
    lineHeight: 1.25,
    // Color comes from the section (theme actor color) or the custom stamp's
    // own fg, set inline — never a hardcoded token here.
    margin: 0,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'pre',
    '@media (max-width: 760px)': {
      fontSize: 8,
      lineHeight: 1.2,
      minHeight: 40,
    },
  },
  // Stamp id labels hide on mobile (4-up grid); the button keeps an
  // aria-label so the name is still announced.
  stampName: {
    '@media (max-width: 760px)': { display: 'none' },
  },
  // Delete control on a custom stamp card: positioned overlay.
  customDel: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
});

export const GLYPHS = ['█', '▓', '▒', '░', '·', '●', '◆', '✦', '◉', '+', '×', '/', '\\', '|', '(', ')', '[', ']', 'o', 'O', '#', '@', '<', '>'];
export const FG = ['#4ade80', '#7cc7ff', '#ffd75e', '#ff8a8a', '#b48ce8', '#ff9f5a', '#d7dce2', '#8b94a0'];
export const BG = ['#0d0f12', '#1d2126', '#2b3a4a', '#3a2b4a', '#4a2b2b', '#2b4a2f', '#4a3d1e', '#101215'];

/** Special-character picker for the brush tool. */
export function GlyphPopoverContent({
  brush,
  onChange,
}: {
  brush: Brush;
  onChange: (patch: Partial<Brush>) => void;
}) {
  return (
    <div {...stylex.props(styles.pop)}>
      <Heading level={4}>Brush glyph</Heading>
      <div {...stylex.props(styles.glyphGrid)} role="group" aria-label="Glyphs">
        {GLYPHS.map((g) => (
          <button
            key={g}
            {...stylex.props(styles.glyph, brush.glyph === g && styles.glyphActive)}
            onClick={() => onChange({ glyph: g })}
            title={`Glyph ${g}`}
            aria-pressed={brush.glyph === g}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Foreground/background color picker. */
export function ColorPopoverContent({
  brush,
  onChange,
}: {
  brush: Brush;
  onChange: (patch: Partial<Brush>) => void;
}) {
  const transparentBg = brush.bg === '';
  return (
    <div {...stylex.props(styles.pop)}>
      <Heading level={4}>Colors</Heading>
      <VStack gap={1}>
        <Text type="label" color="disabled">
          FG
        </Text>
        <div {...stylex.props(styles.swatchRow)}>
          {FG.map((c) => (
            <button
              key={c}
              {...stylex.props(styles.swatch, brush.fg === c && styles.swatchActive)}
              style={{ backgroundColor: c }}
              onClick={() => onChange({ fg: c })}
              title={`Foreground ${c}`}
              aria-label={`Foreground ${c}`}
              aria-pressed={brush.fg === c}
            />
          ))}
        </div>
      </VStack>
      <VStack gap={1}>
        <Text type="label" color="disabled">
          BG
        </Text>
        <div {...stylex.props(styles.swatchRow)}>
          {BG.map((c) => (
            <button
              key={c}
              {...stylex.props(styles.swatch, brush.bg === c && styles.swatchActive)}
              style={{ backgroundColor: c, opacity: transparentBg ? 0.35 : 1 }}
              onClick={() => onChange({ bg: c })}
              title={`Background ${c}`}
              aria-label={`Background ${c}`}
              aria-pressed={brush.bg === c && !transparentBg}
            />
          ))}
        </div>
        <Switch
          label="Transparent background"
          value={transparentBg}
          onChange={(v) => onChange({ bg: v ? '' : BG[0] })}
          size="sm"
        />
      </VStack>
    </div>
  );
}

/** Stamp library picker for the stamp tool. */
export function StampPopoverContent({
  brush,
  onBrushChange,
  doc,
  dispatch,
  mode,
}: {
  brush: Brush;
  onBrushChange: (patch: Partial<Brush>) => void;
  doc: DocState;
  dispatch: (a: Action) => void;
  mode: 'light' | 'dark';
}) {
  // Previews use the canvas theme's actor colors so what you see is what
  // placing the stamp paints: invaders in the theme's invader color, ships
  // in the player color. (Custom stamps below keep their own fg.)
  const swatch = themeById(doc.themeId)[mode];
  const sections = [
    { title: 'Invaders', sprites: ET_SPRITES, color: swatch[kindSwatchKey('invader')] },
    { title: 'Ships', sprites: PLAYER_SPRITES, color: swatch[kindSwatchKey('player')] },
    { title: 'Critters', sprites: CRITTER_SPRITES, color: swatch[kindSwatchKey('critter')] },
    { title: 'Space', sprites: SPACE_SPRITES, color: swatch[kindSwatchKey('space')] },
    { title: 'Nature', sprites: NATURE_SPRITES, color: swatch[kindSwatchKey('nature')] },
    { title: 'Play', sprites: PLAY_SPRITES, color: swatch[kindSwatchKey('play')] },
  ];
  return (
    <div {...stylex.props(styles.pop)}>
      <Heading level={4}>Stamps</Heading>
      <Text type="supporting" color="disabled">
        Pick a stamp, then tap the canvas to place it. Drag to stamp repeatedly.
      </Text>
      {sections.map((sec) => (
        <VStack key={sec.title} gap={1} role="group" aria-label={`${sec.title} stamps`}>
          <Text type="label" color="disabled">
            {sec.title}
          </Text>
          <div {...stylex.props(styles.stampGrid)}>
            {sec.sprites.map((s) => {
              const selected = brush.tool === 'stamp' && brush.stampId === s.id;
              return (
                <button
                  key={s.id}
                  {...stylex.props(styles.stamp, selected && styles.stampActive)}
                  onClick={() => onBrushChange({ tool: 'stamp', stampId: s.id })}
                  title={`Stamp: ${s.id} — tap the canvas to place`}
                  aria-label={`Stamp: ${s.id}`}
                  aria-pressed={selected}
                >
                  <pre
                    {...stylex.props(styles.stampArt)}
                    aria-hidden="true"
                    style={{ color: sec.color }}
                  >
                    {s.frames[0].join('\n')}
                  </pre>
                  <span {...stylex.props(styles.stampName)}>
                    <Text type="label">{s.id}</Text>
                  </span>
                </button>
              );
            })}
          </div>
        </VStack>
      ))}
      <VStack gap={1}>
        <Text type="label" color="disabled">
          Yours{doc.stamps.length > 0 ? ` (${doc.stamps.length})` : ''}
        </Text>
        {doc.stamps.length === 0 ? (
          <Text type="supporting" color="disabled">
            Ask the agent to create a stamp — e.g. "make me a cat stamp".
          </Text>
        ) : (
          <div {...stylex.props(styles.stampGrid)}>
            {doc.stamps.map((s) => {
              const selected =
                brush.tool === 'stamp' && brush.stampId === s.id;
              return (
                <div
                  key={s.id}
                  {...stylex.props(styles.stamp, selected && styles.stampActive)}
                  style={{ position: 'relative' }}
                >
                  <button
                    onClick={() =>
                      onBrushChange({ tool: 'stamp', stampId: s.id })
                    }
                    title={`Stamp: ${s.id} — tap the canvas to place`}
                    aria-label={`Stamp: ${s.id}`}
                    aria-pressed={selected}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      display: 'block',
                      width: '100%',
                    }}
                  >
                    <pre
                      {...stylex.props(styles.stampArt)}
                      aria-hidden="true"
                      style={{ color: s.fg }}
                    >
                      {s.frames[0].join('\n')}
                    </pre>
                    <span {...stylex.props(styles.stampName)}>
                      <Text type="label">{s.id}</Text>
                    </span>
                  </button>
                  <IconButton
                    label={`Delete stamp ${s.id}`}
                    icon={<IconClose />}
                    variant="ghost"
                    size="sm"
                    xstyle={styles.customDel}
                    onClick={() => dispatch({ type: 'deleteStamp', id: s.id })}
                  />
                </div>
              );
            })}
          </div>
        )}
      </VStack>
    </div>
  );
}
