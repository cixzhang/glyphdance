# glyphdance

An agentically powered ASCII art animation studio. A Figma-like workspace where
you compose multi-frame ASCII animations on a character grid — and an AI co-pilot
that can do anything you can do: add frames, paint cells, place stamps, build
animated stamps, and compose full frames.

Stack: React 19 + Vite + TypeScript, Astryx canary UI, StyleX. Deploys on Vercel.

## Phase plan

- **Phase 0 — studio shell (this commit).** Static-but-real layout from the approved
  proposal: top bar, tool rail, character-grid canvas, inspector (agent / glyph &
  color / stamps), frame timeline. Stub document so the deploy pipeline goes green
  on day one.
- **Phase 1 — the studio, no agent.** Editable grid canvas, tools, timeline with
  hold times, stamp library, localStorage persistence, GIF/PNG/TXT export.
- **Phase 2 — the agent.** Tool-calling co-pilot over the same action space as the
  UI: chat panel, ⌘K quick bar, in-canvas echoes. BYO OpenRouter key.
- **Phase 3 — polish.** Onion skinning, animated-stamp cycles, charsets/palettes,
  share links.

## Develop

```sh
npm install
npm run dev
```

## Deploy

Pushes to `main` deploy automatically once the repo is imported at
[vercel.com/new](https://vercel.com/new). Build config lives in `vercel.json`
(`npm run build` → `dist`).

## License

MIT — see [LICENSE](LICENSE).
