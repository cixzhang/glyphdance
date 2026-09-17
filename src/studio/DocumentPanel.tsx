// Document card: name the piece, pick the canvas theme, and reset to the
// demo scene. (The old Scene panel drove the demo renderer; the document is
// real now, so its actors live in cells and its sprites will become stamps.)

import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import {
  SYNTAX_THEMES,
  type SyntaxTheme,
  type ThemeSwatch,
} from './scene.ts';
import { seedDocument } from './seed.ts';
import { clearAutosavedDoc } from './persist.ts';
import {
  MAX_CANVAS_H,
  MAX_CANVAS_W,
  MIN_CANVAS_H,
  MIN_CANVAS_W,
  type DocState,
} from './document.ts';
import type { Action } from './actions.ts';

const styles = stylex.create({
  optionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  theme: {
    appearance: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '6px 8px',
    backgroundColor: 'var(--color-background-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    cursor: 'pointer',
    minWidth: 64,
  },
  themeActive: {
    borderColor: 'var(--gd-accent)',
    backgroundColor: 'var(--color-background-muted)',
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

function ThemeOption({
  theme,
  swatch,
  selected,
  onSelect,
}: {
  theme: SyntaxTheme;
  swatch: ThemeSwatch;
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
        style={{ backgroundColor: swatch.bg }}
        aria-hidden="true"
      >
        <span {...stylex.props(styles.dot)} style={{ backgroundColor: swatch.invader }} />
        <span {...stylex.props(styles.dot)} style={{ backgroundColor: swatch.player }} />
        <span {...stylex.props(styles.dot)} style={{ backgroundColor: swatch.star }} />
      </span>
      <Text type="label" size="3xs" color={selected ? 'accent' : 'secondary'}>
        {theme.name}
      </Text>
    </button>
  );
}

function CanvasSizeControl({
  doc,
  dispatch,
}: {
  doc: DocState;
  dispatch: (a: Action) => void;
}) {
  const [w, setW] = useState(doc.width);
  const [h, setH] = useState(doc.height);
  // Undo/redo or the agent can resize from outside these inputs.
  useEffect(() => {
    setW(doc.width);
    setH(doc.height);
  }, [doc.width, doc.height]);
  const inRange =
    Number.isInteger(w) &&
    Number.isInteger(h) &&
    w >= MIN_CANVAS_W &&
    w <= MAX_CANVAS_W &&
    h >= MIN_CANVAS_H &&
    h <= MAX_CANVAS_H;
  const changed = w !== doc.width || h !== doc.height;
  return (
    <VStack gap={1}>
      <Text type="label" color="disabled">
        Canvas size
      </Text>
      <HStack gap={2}>
        <NumberInput
          label="Width"
          value={w}
          onChange={setW}
          min={MIN_CANVAS_W}
          max={MAX_CANVAS_W}
          step={1}
          isIntegerOnly
        />
        <NumberInput
          label="Height"
          value={h}
          onChange={setH}
          min={MIN_CANVAS_H}
          max={MAX_CANVAS_H}
          step={1}
          isIntegerOnly
        />
        <Button
          label="Resize canvas"
          variant="secondary"
          size="sm"
          isDisabled={!inRange || !changed}
          onClick={() => {
            if (inRange && changed)
              dispatch({ type: 'resizeCanvas', width: w, height: h });
          }}
        >
          Resize
        </Button>
      </HStack>
      <Text type="supporting" color="disabled">
        Art stays centered; anything outside the new size is cropped. Undoable.
      </Text>
    </VStack>
  );
}

export default function DocumentPanel({
  doc,
  dispatch,
  mode,
}: {
  doc: DocState;
  dispatch: (a: Action) => void;
  mode: 'light' | 'dark';
}) {
  const [name, setName] = useState(doc.name);
  // Undoing a rename changes doc.name from outside the input.
  useEffect(() => setName(doc.name), [doc.name]);
  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== doc.name) dispatch({ type: 'rename', name: trimmed });
    else setName(doc.name);
  };

  return (
    <Card padding={3}>
      <VStack gap={2}>
        <Heading level={4}>Document</Heading>
        <TextInput
          label="Name"
          value={name}
          onChange={setName}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
        <CanvasSizeControl doc={doc} dispatch={dispatch} />
        <VStack gap={1}>
          <Text type="label" color="disabled">
            Canvas theme
          </Text>
          <div {...stylex.props(styles.optionRow)} role="group" aria-label="Canvas theme">
            {SYNTAX_THEMES.map((t) => (
              <ThemeOption
                key={t.id}
                theme={t}
                swatch={t[mode]}
                selected={doc.themeId === t.id}
                onSelect={() => dispatch({ type: 'setTheme', themeId: t.id })}
              />
            ))}
          </div>
        </VStack>
        <Text type="supporting" color="disabled">
          {doc.frames.length} frame{doc.frames.length === 1 ? '' : 's'} ·{' '}
          {doc.frames.reduce((n, f) => n + f.cells.filter((c) => c.ch !== ' ').length, 0)}{' '}
          marks
        </Text>
        <Button
          label="Reset to demo scene"
          variant="secondary"
          size="sm"
          onClick={() => {
            clearAutosavedDoc();
            dispatch({ type: 'load', doc: seedDocument(mode) });
          }}
        >
          Reset to demo scene
        </Button>
      </VStack>
    </Card>
  );
}
