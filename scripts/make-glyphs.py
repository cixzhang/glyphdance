#!/usr/bin/env python3
"""Generate src/studio/glyphs.ts from the real Cozette cmap.

The font's cmap is the source of truth for what the canvas can draw. This
script verifies a curated (character, search-name) symbol list against the
cmap, drops anything the font cannot draw, and emits:

  - SUPPORTED_GLYPHS / isSupportedGlyph / toSupportedText (unchanged behavior)
  - PALETTE (curated agent-facing pixel-art set)
  - ASCII_GLYPHS (all printable ASCII U+0020-U+007E)
  - SYMBOL_GLYPHS (verified named symbols for the brush picker + search)
  - glyphName / searchGlyphs helpers

Run: python3 scripts/make-glyphs.py
"""
import json
import sys
from fontTools.ttLib import TTFont

FONT = "src/assets/fonts/cozette.ttf"
OUT = "src/studio/glyphs.ts"

# (character, lowercase search name) — verified against the cmap below.
SYMBOLS = [
    # Blocks & shades
    ("█", "full block"), ("▓", "dark shade"), ("▒", "medium shade"),
    ("░", "light shade"), ("■", "black square"), ("□", "white square"),
    ("▪", "small black square"), ("▫", "small white square"),
    # Circles & dots
    ("●", "black circle"), ("○", "white circle"), ("◉", "fisheye target"),
    ("◎", "bullseye"), ("·", "middle dot"),
    # Diamonds
    ("◆", "black diamond"), ("◇", "white diamond"),
    # Triangles
    ("▲", "triangle up"), ("△", "white triangle up"),
    ("▼", "triangle down"), ("▽", "white triangle down"),
    ("◀", "triangle left"), ("◁", "white triangle left"),
    ("▶", "triangle right"), ("▷", "white triangle right"),
    # Marks
    ("✚", "heavy open cross"), ("✦", "black four pointed star"),
    ("✧", "white four pointed star"),
    # Card suits
    ("♥", "black heart suit"), ("♡", "white heart suit"),
    ("♦", "black diamond suit"), ("♢", "white diamond suit"),
    ("♣", "black club suit"), ("♧", "white club suit"),
    ("♠", "black spade suit"), ("♤", "white spade suit"),
    # Arrows
    ("→", "rightwards arrow"), ("←", "leftwards arrow"),
    ("↑", "upwards arrow"), ("↓", "downwards arrow"),
    ("↔", "left right arrow"), ("↕", "up down arrow"),
    # Music
    ("♪", "eighth note"), ("♫", "beamed eighth notes"),
    ("♩", "quarter note"), ("♬", "beamed sixteenth notes"),
    # Weather
    ("❄", "snowflake"),
    # Math
    ("×", "multiplication sign"), ("÷", "division sign"),
    ("±", "plus-minus sign"), ("−", "minus sign"),
    ("≠", "not equal to"), ("≤", "less-than or equal to"),
    ("≥", "greater-than or equal to"), ("∞", "infinity"),
    ("√", "square root"), ("∑", "n-ary summation"),
    ("π", "greek small letter pi"),
    # Arcs & rounded corners
    ("╭", "arc top left"), ("╮", "arc top right"),
    ("╰", "arc bottom left"), ("╯", "arc bottom right"),
    ("◔", "arc quadrant top left"), ("◑", "arc quadrant top right"),
    ("◒", "arc quadrant bottom left"), ("◓", "arc quadrant bottom right"),
    # Box drawing
    ("─", "box drawings light horizontal"),
    ("│", "box drawings light vertical"),
    ("┌", "box drawings light down and right"),
    ("┐", "box drawings light down and left"),
    ("└", "box drawings light up and right"),
    ("┘", "box drawings light up and left"),
    ("├", "box drawings light vertical and right"),
    ("┤", "box drawings light vertical and left"),
    ("┬", "box drawings light down and horizontal"),
    ("┴", "box drawings light up and horizontal"),
    ("┼", "box drawings light vertical and horizontal"),
    ("═", "box drawings double horizontal"),
    ("║", "box drawings double vertical"),
    # Currency
    ("¢", "cent sign"), ("£", "pound sign"), ("¥", "yen sign"),
    ("€", "euro sign"),
    # Punctuation extras
    ("•", "bullet"), ("◦", "white bullet"), ("‣", "triangular bullet"),
    ("…", "horizontal ellipsis"), ("–", "en dash"), ("—", "em dash"),
    ("‘", "left single quotation mark"),
    ("’", "right single quotation mark"),
    ("“", "left double quotation mark"),
    ("”", "right double quotation mark"),
    ("§", "section sign"), ("¶", "pilcrow sign"),
    ("©", "copyright sign"), ("®", "registered sign"),
    ("™", "trade mark sign"), ("°", "degree sign"),
    ("†", "dagger"), ("‡", "double dagger"),
]

# Curated agent-facing pixel-art palette (chars must be in the cmap).
PALETTE = (
    "█▓▒░·●◆✦◉"
    "+×/\\|()[]oO#@<>"
    "❄♥♦♣♠▲▼◀▶✚♪♫"
)


def main() -> int:
    font = TTFont(FONT)
    cmap = font.getBestCmap()

    # Printable repertoire only: exclude C0 controls, DEL, and anything
    # below U+0020. (Matches the previous generator's semantics — the text
    # tool and paintCells rely on control chars being unsupported.)
    supported = sorted(
        cp for cp in cmap.keys() if cp >= 0x20 and cp != 0x7F
    )
    missing_palette = [c for c in PALETTE if ord(c) not in cmap]
    if missing_palette:
        print(f"PALETTE chars missing from font: {missing_palette}", file=sys.stderr)
        return 1

    verified: list[tuple[str, str]] = []
    missing_symbols: list[str] = []
    for ch, name in SYMBOLS:
        if ord(ch) in cmap:
            verified.append((ch, name))
        else:
            missing_symbols.append(f"{ch} ({name})")
    if missing_symbols:
        print("Symbols NOT in font (dropped from picker):")
        for m in missing_symbols:
            print(f"  {m}")

    ascii_glyphs = "".join(chr(cp) for cp in range(0x20, 0x7F))

    def ts_str(s: str) -> str:
        return json.dumps(s, ensure_ascii=False)

    lines = []
    A = lines.append
    A("// GENERATED BY scripts/make-glyphs.py — do not edit by hand.")
    A("// Source of truth: the cmap of src/assets/fonts/cozette.ttf.")
    A("")
    A("/** Every character the canvas font can actually draw. */")
    A(f"export const SUPPORTED_GLYPHS: ReadonlySet<string> = new Set([")
    for cp in supported:
        A(f"  {ts_str(chr(cp))},")
    A("]);")
    A("")
    A("/** True when the canvas font can draw this character. */")
    A("export function isSupportedGlyph(ch: string): boolean {")
    A("  return SUPPORTED_GLYPHS.has(ch);")
    A("}")
    A("")
    A("/**")
    A(" * Curated agent-facing pixel-art palette. Every char here is in the")
    A(" * font; the full repertoire is SUPPORTED_GLYPHS (all printable ASCII")
    A(" * plus the symbols below).")
    A(" */")
    A(f"export const PALETTE = {ts_str(PALETTE)};")
    A("")
    A("/**")
    A(" * Drop characters the canvas font cannot draw from a text string, and")
    A(" * map a UTF-16 caret position through the filtering so the input field")
    A(" * and the grid never disagree about what was typed.")
    A(" */")
    A("export function toSupportedText(")
    A("  text: string,")
    A("  caret: number,")
    A("): { text: string; caret: number } {")
    A("  let out = '';")
    A("  let newCaret = 0;")
    A("  let i = 0;")
    A("  for (const ch of text) {")
    A("    if (isSupportedGlyph(ch)) {")
    A("      out += ch;")
    A("      if (i + ch.length <= caret) newCaret += ch.length;")
    A("    }")
    A("    i += ch.length;")
    A("  }")
    A("  return { text: out, caret: newCaret };")
    A("}")
    A("")
    A("/** All printable ASCII (U+0020-U+007E) — the font draws every one. */")
    A(f"export const ASCII_GLYPHS = {ts_str(ascii_glyphs)};")
    A("")
    A("/** Named symbols the font can draw, for the brush picker + search. */")
    A("export interface SymbolGlyph { ch: string; name: string }")
    A("export const SYMBOL_GLYPHS: readonly SymbolGlyph[] = [")
    for ch, name in verified:
        A(f"  {{ ch: {ts_str(ch)}, name: {ts_str(name)} }},")
    A("];")
    A("")
    A("/** Human name for a brush glyph (for tooltips / aria labels). */")
    A("export function glyphName(ch: string): string {")
    A("  const sym = SYMBOL_GLYPHS.find((s) => s.ch === ch);")
    A("  if (sym) return sym.name;")
    A("  if (ch === ' ') return 'space';")
    A("  return ch;")
    A("}")
    A("")
    A("/**")
    A(" * Search the brush glyph repertoire. An empty query returns everything")
    A(" * (symbols first, then ASCII). Otherwise matches the character itself")
    A(" * or a case-insensitive substring of its name — e.g. \"heart\", \"arrow\",")
    A(" * \">\".")
    A(" */")
    A("export function searchGlyphs(query: string): SymbolGlyph[] {")
    A("  const q = query.trim().toLowerCase();")
    A("  const ascii: SymbolGlyph[] = [...ASCII_GLYPHS].map((ch) => ({")
    A("    ch,")
    A("    name: ch === ' ' ? 'space' : ch,")
    A("  }));")
    A("  if (!q) return [...SYMBOL_GLYPHS, ...ascii];")
    A("  const raw = query.trim();")
    A("  const match = (g: SymbolGlyph) =>")
    A("    g.ch === raw || g.name.toLowerCase().includes(q);")
    A("  const hits = [...SYMBOL_GLYPHS, ...ascii].filter(match);")
    A("  // Exact character matches first (typing \">\" should find \">\").")
    A("  hits.sort((a, b) => (b.ch === raw ? 1 : 0) - (a.ch === raw ? 1 : 0));")
    A("  return hits;")
    A("}")
    A("")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Wrote {OUT}: {len(supported)} supported, "
          f"{len(verified)} symbols, {len(ascii_glyphs)} ASCII.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
