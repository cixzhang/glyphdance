import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { AsciiThumb } from './Canvas.tsx';

const styles = stylex.create({
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    height: '100%',
    padding: 10,
    backgroundColor: 'var(--gd-bg1)',
    borderLeft: '1px solid var(--gd-border)',
    overflowY: 'auto',
  },
  card: {
    backgroundColor: 'var(--gd-bg2)',
    border: '1px solid var(--gd-border)',
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '9px 12px',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  cardBody: { padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 },
  collapseBtn: {
    appearance: 'none',
    border: 'none',
    background: 'none',
    color: 'var(--gd-dim)',
    cursor: 'pointer',
    fontSize: 14,
    padding: '2px 6px',
    borderRadius: 4,
    ':hover': { color: 'var(--gd-text)', backgroundColor: 'var(--gd-bg3)' },
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#2b3a4a',
    color: 'var(--gd-text)',
    borderRadius: '12px 12px 3px 12px',
    fontSize: 12,
    padding: '7px 10px',
    maxWidth: '92%',
  },
  bubbleAgent: {
    alignSelf: 'flex-start',
    backgroundColor: 'var(--gd-bg3)',
    border: '1px solid var(--gd-border)',
    color: 'var(--gd-text)',
    borderRadius: '12px 12px 12px 3px',
    fontSize: 12,
    padding: '7px 10px',
    maxWidth: '94%',
  },
  agentName: { color: 'var(--gd-accent)', fontWeight: 600 },
  opLog: {
    fontFamily: 'var(--gd-mono)',
    fontSize: 10,
    color: 'var(--gd-dim)',
    marginTop: 4,
  },
  inputRow: { display: 'flex', gap: 6, marginTop: 2 },
  input: {
    flex: 1,
    backgroundColor: 'var(--gd-bg1)',
    border: '1px solid var(--gd-border)',
    borderRadius: 8,
    color: 'var(--gd-faint)',
    fontSize: 12,
    padding: '8px 10px',
    outline: 'none',
    cursor: 'not-allowed',
  },
  sendBtn: {
    appearance: 'none',
    border: '1px solid var(--gd-border)',
    backgroundColor: 'var(--gd-bg3)',
    color: 'var(--gd-faint)',
    borderRadius: 8,
    padding: '0 12px',
    cursor: 'not-allowed',
    fontSize: 14,
  },
  phaseNote: { fontSize: 10, color: 'var(--gd-faint)', lineHeight: 1.5 },
  glyphGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: 4,
  },
  glyph: {
    appearance: 'none',
    border: '1px solid transparent',
    backgroundColor: 'var(--gd-bg1)',
    color: 'var(--gd-dim)',
    borderRadius: 6,
    fontFamily: 'var(--gd-mono)',
    fontSize: 14,
    height: 30,
    cursor: 'pointer',
    ':hover': { borderColor: 'var(--gd-border)', color: 'var(--gd-text)' },
  },
  glyphActive: { borderColor: 'var(--gd-invader)', color: 'var(--gd-invader)' },
  swatchRow: { display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' },
  swatch: {
    appearance: 'none',
    width: 22,
    height: 22,
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.14)',
    cursor: 'pointer',
    padding: 0,
  },
  swatchActive: { outline: '2px solid var(--gd-text)', outlineOffset: 1 },
  swatchLabel: { fontSize: 10, color: 'var(--gd-faint)', width: 22, marginRight: 2 },
  stampGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  stamp: {
    appearance: 'none',
    backgroundColor: 'var(--gd-bg1)',
    border: '1px solid var(--gd-border)',
    borderRadius: 8,
    padding: 8,
    cursor: 'pointer',
    textAlign: 'left',
    ':hover': { borderColor: 'var(--gd-faint)' },
  },
  stampName: { fontSize: 11, fontWeight: 600, marginTop: 6 },
  stampTag: {
    display: 'inline-block',
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--gd-faint)',
    marginTop: 3,
  },
  stampTagAnim: { color: 'var(--gd-amber)' },
  stampArt: {
    fontFamily: 'var(--gd-mono)',
    fontSize: 11,
    lineHeight: 1.25,
    color: 'var(--gd-invader)',
    margin: 0,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'pre',
  },
  label: { fontSize: 10, color: 'var(--gd-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' },
});

const GLYPHS = ['█', '▓', '▒', '░', '·', '●', '◆', '★', '✧', '+', '×', '/', '\\', '|', '(', ')', '[', ']', 'o', 'O', '#', '@', '<', '>'];
const FG = ['#4ade80', '#7cc7ff', '#ffd75e', '#ff8a8a', '#b48ce8', '#ff9f5a', '#d7dce2', '#8b94a0'];
const BG = ['#0d0f12', '#1d2126', '#2b3a4a', '#3a2b4a', '#4a2b2b', '#2b4a2f', '#4a3d1e', '#101215'];

function AgentPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <section {...stylex.props(styles.card)} aria-label="Agent">
      <div {...stylex.props(styles.cardHead)}>
        <span>
          <span style={{ color: 'var(--gd-accent)' }}>✦</span> Agent
        </span>
        <button
          {...stylex.props(styles.collapseBtn)}
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? 'Collapse agent panel' : 'Expand agent panel'}
          title={open ? 'Collapse' : 'Expand'}
        >
          {open ? '–' : '+'}
        </button>
      </div>
      {open && (
        <div {...stylex.props(styles.cardBody)}>
          <div {...stylex.props(styles.bubbleUser)}>add a blink frame after frame 2</div>
          <div {...stylex.props(styles.bubbleAgent)}>
            <span {...stylex.props(styles.agentName)}>✓</span> Inserted frame 3 (blink
            variant of frame 2).
            <div {...stylex.props(styles.opLog)}>2 ops · undo available</div>
          </div>
          <div {...stylex.props(styles.inputRow)}>
            <input
              {...stylex.props(styles.input)}
              placeholder="Agent arrives in Phase 2…"
              disabled
              aria-label="Ask the agent (coming in Phase 2)"
            />
            <button {...stylex.props(styles.sendBtn)} disabled title="Coming in Phase 2">
              ↑
            </button>
          </div>
          <div {...stylex.props(styles.phaseNote)}>
            Sample exchange — the live co-pilot lands in Phase 2.
          </div>
        </div>
      )}
    </section>
  );
}

function GlyphColorPanel() {
  const [glyph, setGlyph] = useState('█');
  const [fg, setFg] = useState(FG[0]);
  const [bg, setBg] = useState(BG[0]);
  return (
    <section {...stylex.props(styles.card)} aria-label="Glyph and color">
      <div {...stylex.props(styles.cardHead)}>
        <span>Glyph & Color</span>
      </div>
      <div {...stylex.props(styles.cardBody)}>
        <div {...stylex.props(styles.glyphGrid)}>
          {GLYPHS.map((g) => (
            <button
              key={g}
              {...stylex.props(styles.glyph, glyph === g && styles.glyphActive)}
              onClick={() => setGlyph(g)}
              title={`Glyph ${g}`}
              aria-pressed={glyph === g}
            >
              {g}
            </button>
          ))}
        </div>
        <div>
          <div {...stylex.props(styles.label)}>FG</div>
          <div {...stylex.props(styles.swatchRow)}>
            {FG.map((c) => (
              <button
                key={c}
                {...stylex.props(styles.swatch, fg === c && styles.swatchActive)}
                style={{ backgroundColor: c }}
                onClick={() => setFg(c)}
                title={`Foreground ${c}`}
                aria-label={`Foreground ${c}`}
                aria-pressed={fg === c}
              />
            ))}
          </div>
        </div>
        <div>
          <div {...stylex.props(styles.label)}>BG</div>
          <div {...stylex.props(styles.swatchRow)}>
            {BG.map((c) => (
              <button
                key={c}
                {...stylex.props(styles.swatch, bg === c && styles.swatchActive)}
                style={{ backgroundColor: c }}
                onClick={() => setBg(c)}
                title={`Background ${c}`}
                aria-label={`Background ${c}`}
                aria-pressed={bg === c}
              />
            ))}
            <span {...stylex.props(styles.swatchLabel)} title="Transparent background">
              ∅
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const TREE = '  *\n ***\n*****\n  |';
const GHOST = ' .--.\n|o o|\n|___|';

function StampsPanel() {
  return (
    <section {...stylex.props(styles.card)} aria-label="Stamps">
      <div {...stylex.props(styles.cardHead)}>
        <span>Stamps</span>
      </div>
      <div {...stylex.props(styles.cardBody)}>
        <div {...stylex.props(styles.stampGrid)}>
          <button {...stylex.props(styles.stamp)} title="Stamp: invader (soon)">
            <AsciiThumb frameIndex={0} />
            <div {...stylex.props(styles.stampName)}>invader</div>
            <span {...stylex.props(styles.stampTag)}>static · soon</span>
          </button>
          <button {...stylex.props(styles.stamp)} title="Stamp: star (soon)">
            <pre {...stylex.props(styles.stampArt)}>★</pre>
            <div {...stylex.props(styles.stampName)}>star</div>
            <span {...stylex.props(styles.stampTag)}>static · soon</span>
          </button>
          <button {...stylex.props(styles.stamp)} title="Stamp: ghost, animated (soon)">
            <pre {...stylex.props(styles.stampArt)}>{GHOST}</pre>
            <div {...stylex.props(styles.stampName)}>ghost</div>
            <span {...stylex.props(styles.stampTag, styles.stampTagAnim)}>▶ animated · soon</span>
          </button>
          <button {...stylex.props(styles.stamp)} title="Stamp: tree (soon)">
            <pre {...stylex.props(styles.stampArt)}>{TREE}</pre>
            <div {...stylex.props(styles.stampName)}>tree</div>
            <span {...stylex.props(styles.stampTag)}>static · soon</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default function Inspector({
  agentOpen,
  onToggleAgent,
}: {
  agentOpen: boolean;
  onToggleAgent: () => void;
}) {
  return (
    <div {...stylex.props(styles.col)}>
      <AgentPanel open={agentOpen} onToggle={onToggleAgent} />
      <GlyphColorPanel />
      <StampsPanel />
    </div>
  );
}
