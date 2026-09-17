// Document card: name the piece, pick the canvas theme, and reset to the
// demo scene. (The old Scene panel drove the demo renderer; the document is
// real now, so its actors live in cells and its sprites will become stamps.)

import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/Stack';
import {
  SYNTAX_THEMES,
  type SyntaxTheme,
  type ThemeSwatch,
} from './scene.ts';
import { seedDocument } from './seed.ts';
import { clearAutosavedDoc } from './persist.ts';
import type { DocState } from './document.ts';
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
