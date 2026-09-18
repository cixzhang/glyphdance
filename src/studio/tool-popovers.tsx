import { useEffect, useMemo, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { IconButton } from '@astryxdesign/core/IconButton';
import { ToggleButton } from '@astryxdesign/core/ToggleButton';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { Carousel } from '@astryxdesign/core/Carousel';
import { IconClose } from './icons';
import {
  ASCII_GLYPHS,
  SYMBOL_GLYPHS,
  glyphName,
  searchGlyphs,
  type SymbolGlyph,
} from './glyphs.ts';
import {
  ET_SPRITES,
  CRITTER_SPRITES,
  NATURE_SPRITES,
  FACE_SPRITES,
  ITEM_SPRITES,
  OBJECT_SPRITES,
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
    // Bottom sheets need breathing room at the edges. The top padding
    // clears the drag handle.
    paddingInline: 16,
    paddingTop: 20,
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
  // Breathing room between the BG swatches and the transparent switch.
  transparentSwitch: {
    marginTop: 8,
  },
  // The glyph character inside the toggle button, in the code font.
  glyphChar: {
    fontFamily: 'var(--font-family-code)',
    fontSize: 14,
    lineHeight: 1,
  },
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
  // Stamp cards have fixed dimensions so rows don't shift as animated
  // previews cycle. The loop badge is pinned to the bottom.
  stampCard: {
    position: 'relative',
    width: 120,
    height: 148,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    flexShrink: 0,
  },
  // Frame-count badge pinned to the card bottom — doesn't move with the
  // animation above it.
  loopBadge: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  // Delete control on a custom stamp card: positioned overlay.
  customDel: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
});

export const FG = ['#4ade80', '#7cc7ff', '#ffd75e', '#ff8a8a', '#b48ce8', '#ff9f5a', '#d7dce2', '#8b94a0'];
export const BG = ['#0d0f12', '#1d2126', '#2b3a4a', '#3a2b4a', '#4a2b2b', '#2b4a2f', '#4a3d1e', '#101215'];

// ASCII glyphs as {ch, name} entries for the picker's ASCII section.
const ASCII_ENTRIES: readonly SymbolGlyph[] = [...ASCII_GLYPHS].map((ch) => ({
  ch,
  name: ch === ' ' ? 'space' : ch,
}));

/** Brush glyph picker: the full font repertoire, searchable by name or by
 *  typing the character itself — including the ones a normal keyboard
 *  can't easily produce (— … ❄ → █). */
export function GlyphPopoverContent({
  brush,
  onChange,
}: {
  brush: Brush;
  onChange: (patch: Partial<Brush>) => void;
}) {
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const results = useMemo(() => searchGlyphs(query), [query]);
  // Keep the current glyph visible even when it doesn't match the query,
  // so the selection never silently disappears from the picker.
  const shown = useMemo(() => {
    if (!searching || results.some((g) => g.ch === brush.glyph)) return results;
    return [{ ch: brush.glyph, name: glyphName(brush.glyph) }, ...results];
  }, [results, searching, brush.glyph]);

  const glyphButton = (g: SymbolGlyph) => (
    <ToggleButton
      key={g.ch}
      label={`Glyph ${g.name}`}
      tooltip={g.name}
      icon={<span {...stylex.props(styles.glyphChar)}>{g.ch}</span>}
      isIconOnly
      size="sm"
      isPressed={brush.glyph === g.ch}
      onPressedChange={(pressed) => {
        if (pressed) onChange({ glyph: g.ch });
      }}
    >
    </ToggleButton>
  );

  return (
    <div {...stylex.props(styles.pop)}>
      <Heading level={4}>Brush glyph</Heading>
      <TextInput
        label="Search glyphs"
        isLabelHidden
        size="sm"
        hasClear
        placeholder="Search name or character…"
        value={query}
        onChange={setQuery}
      />
      {searching ? (
        shown.length > 0 ? (
          <div {...stylex.props(styles.glyphGrid)} role="group" aria-label="Matching glyphs">
            {shown.map(glyphButton)}
          </div>
        ) : (
          <Text>No glyphs match &ldquo;{query.trim()}&rdquo;.</Text>
        )
      ) : (
        <>
          <Text type="label" color="disabled">
            Symbols · {SYMBOL_GLYPHS.length}
          </Text>
          <div {...stylex.props(styles.glyphGrid)} role="group" aria-label="Symbol glyphs">
            {SYMBOL_GLYPHS.map(glyphButton)}
          </div>
          <Text type="label" color="disabled">
            ASCII · {ASCII_ENTRIES.length}
          </Text>
          <div {...stylex.props(styles.glyphGrid)} role="group" aria-label="ASCII glyphs">
            {ASCII_ENTRIES.map(glyphButton)}
          </div>
        </>
      )}
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
          xstyle={styles.transparentSwitch}
        />
      </VStack>
    </div>
  );
}

/** Stamp library picker for the stamp tool. */

/** Stamp artwork preview: multi-frame stamps cycle their art on a timer so
 *  the loop is visible before placement, with a frame-count badge. */
function StampArt({ frames, color }: { frames: string[][]; color: string }) {
  const animated = frames.length > 1;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!animated) return;
    const id = setInterval(() => setTick((t) => t + 1), 400);
    return () => clearInterval(id);
  }, [animated]);
  return (
    <>
      <pre
        {...stylex.props(styles.stampArt)}
        aria-hidden="true"
        style={{ color }}
      >
        {frames[animated ? tick % frames.length : 0].join('\n')}
      </pre>
      {animated && (
        <span {...stylex.props(styles.loopBadge)}>
          <Token
            label={`↻ ${frames.length}-frame loop`}
            size="sm"
            color="purple"
          />
        </span>
      )}
    </>
  );
}

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
  // placing the stamp paints: invaders in the theme's invader color, items
  // and objects in the player color, critters and faces pale. (Custom stamps
  // below keep their own fg.)
  const swatch = themeById(doc.themeId)[mode];
  const sections = [
    { title: 'Invaders', sprites: ET_SPRITES, color: swatch[kindSwatchKey('invader')] },
    { title: 'Critters', sprites: CRITTER_SPRITES, color: swatch[kindSwatchKey('critter')] },
    { title: 'Nature', sprites: NATURE_SPRITES, color: swatch[kindSwatchKey('nature')] },
    { title: 'Faces', sprites: FACE_SPRITES, color: swatch[kindSwatchKey('face')] },
    { title: 'Items', sprites: ITEM_SPRITES, color: swatch[kindSwatchKey('item')] },
    { title: 'Objects', sprites: OBJECT_SPRITES, color: swatch[kindSwatchKey('object')] },
  ];
  return (
    <div {...stylex.props(styles.pop)}>
      <Heading level={4}>Stamps</Heading>
      <Text type="supporting" color="disabled">
        Pick a stamp, then tap the canvas to place it. Multi-frame stamps
        animate — one tap paints the loop across your frames from here to the
        end. Drag to stamp repeatedly.
      </Text>
      <VStack gap={1}>
        <Text type="label" color="disabled">
          Yours{doc.stamps.length > 0 ? ` (${doc.stamps.length})` : ''}
        </Text>
        {doc.stamps.length === 0 ? (
          <Text type="supporting" color="disabled">
            No custom stamps yet. Ask the agent to make you one — e.g. "make
            me a cat stamp" — and it'll appear here.
          </Text>
        ) : (
          <Carousel aria-label="Your stamps" gap={2} hasButtons={false}>
            {doc.stamps.map((s) => {
              const selected =
                brush.tool === 'stamp' && brush.stampId === s.id;
              return (
                <SelectableCard
                  key={s.id}
                  label={`Stamp: ${s.id}${s.frames.length > 1 ? `, ${s.frames.length}-frame animated loop` : ''}`}
                  isSelected={selected}
                  onChange={(isSelected) => {
                    if (isSelected)
                      onBrushChange({ tool: 'stamp', stampId: s.id, fg: s.fg });
                  }}
                  xstyle={styles.stampCard}
                >
                  <StampArt frames={s.frames} color={s.fg} />
                  <span {...stylex.props(styles.stampName)}>
                    <Text type="label">{s.id}</Text>
                  </span>
                  <IconButton
                    label={`Delete stamp ${s.id}`}
                    icon={<IconClose />}
                    variant="ghost"
                    size="sm"
                    xstyle={styles.customDel}
                    onClick={() => dispatch({ type: 'deleteStamp', id: s.id })}
                  />
                </SelectableCard>
              );
            })}
          </Carousel>
        )}
      </VStack>
      {sections.map((sec) => (
        <VStack key={sec.title} gap={1} role="group" aria-label={`${sec.title} stamps`}>
          <Text type="label" color="disabled">
            {sec.title}
          </Text>
          <Carousel aria-label={`${sec.title} stamps`} gap={2} hasButtons={false}>
            {sec.sprites.map((s) => {
              const selected = brush.tool === 'stamp' && brush.stampId === s.id;
              return (
                <SelectableCard
                  key={s.id}
                  label={`Stamp: ${s.id}${s.frames.length > 1 ? `, ${s.frames.length}-frame animated loop` : ''}`}
                  isSelected={selected}
                  onChange={(isSelected) => {
                    if (isSelected) onBrushChange({ tool: 'stamp', stampId: s.id, fg: s.fg ?? sec.color });
                  }}
                  xstyle={styles.stampCard}
                >
                  <StampArt frames={s.frames} color={s.fg ?? sec.color} />
                  <span {...stylex.props(styles.stampName)}>
                    <Text type="label">{s.id}</Text>
                  </span>
                </SelectableCard>
              );
            })}
          </Carousel>
        </VStack>
      ))}
    </div>
  );
}
