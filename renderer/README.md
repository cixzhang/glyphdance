# glyphdance renderer

A standalone, dependency-free renderer for the `glyphdance-frames` JSON format
(exported from glyphdance via **JSON · all frames**). Use it to display
glyphdance animations on any web page — no framework, no build step required
beyond TypeScript compilation (or copy the compiled JS).

## Files

- `glyphdance-renderer.ts` — the renderer (imports as `./glyphdance-renderer.js` after compiling)
- `demo.html` — live demo: drop a `*-frames.json` file onto the page to preview it

## Usage

```ts
import { renderFrames, playFrames } from './glyphdance-renderer.js';

// Draw a single frame:
renderFrames(canvas, data, { frame: 0 });

// Play the animation (loops forever, respects holdMs):
const player = playFrames(canvas, data);
player.stop();        // stop the loop
player.goto(2);       // jump to frame 2
console.log(player.current);
```

## Options

| Option       | Default                              | Description                              |
|--------------|--------------------------------------|------------------------------------------|
| `cellPx`     | `16`                                 | CSS px per cell before scaling           |
| `scale`      | `2`                                  | Integer scale multiplier for crispness   |
| `fontFamily` | `"Cozette", "IBM VGA", monospace`    | CSS font for glyphs                      |
| `pageBg`     | `"#1b1b1b"`                          | Background when `transparent` is false   |
| `transparent`| `false`                              | Skip the page background                 |
| `frame`      | `0`                                  | Frame index (renderFrames only)          |

The cell aspect ratio (0.95 × 1.35 em) is tuned to match the glyphdance canvas
display, so exports look the same in the renderer as they do in the app.

## Format

See the `GlyphdanceFrames` interface in `glyphdance-renderer.ts` for the full
schema. Key fields:

- `frames`: `string[][]` — `[frame][row]`, each row is a fixed-width string
- `holdMs`: `number[]` — per-frame display time in milliseconds
- `fgMap` / `bgMap`: `string[][][]` — per-cell colors, `''` means none
- `fontId`: the canvas font used (e.g. `"cozette"`)
